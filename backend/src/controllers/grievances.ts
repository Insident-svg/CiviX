import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';

import { Grievance } from '../models/Grievance.js';
import { PublicPost } from '../models/PublicPost.js';
import { User } from '../models/User.js';
import { Officer } from '../models/Officer.js';
import { ResolutionEvidence } from '../models/ResolutionEvidence.js';

import { AppError, ok } from '../utils/http.js';
import { env } from '../config/env.js';
import { AuthRequest, Status, STATUSES } from '../types/index.js';

import { analyzeGrievance } from '../services/ai/aiClient.js';
import { routeGrievance } from '../services/routing.js';
import { applySla } from '../services/sla.js';
import { notify, notifyAdmins } from '../services/notifications.js';
import { audit } from '../services/audit.js';
import { awardResolvedGrievance } from '../services/gamification.js';

const createSchema = z.object({
  text: z
    .string()
    .max(10000)
    .trim()
    .optional()
    .default(''),

  location: z.object({
    latitude: z
      .number()
      .gte(-90)
      .lte(90),

    longitude: z
      .number()
      .gte(-180)
      .lte(180),
  }),

  media: z
    .array(
      z.object({
        type: z.enum([
          'image',
          'video',
          'voice',
        ]),

        url: z.string().url(),

        mimeType: z.string().optional(),

        size: z
          .number()
          .nonnegative()
          .optional(),
      }),
    )
    .max(10)
    .optional(),

  language: z
    .string()
    .min(2)
    .max(20)
    .optional(),
}).superRefine((value, ctx) => {
  const hasText = value.text.trim().length >= 3;
  const hasVoice = (value.media ?? []).some((item) => item.type === 'voice');
  if (!hasText && !hasVoice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['text'],
      message: 'Enter a description or record a voice report',
    });
  }
});

const resolutionSchema = z.object({
  resolutionDescription: z
    .string()
    .min(3)
    .max(5000)
    .trim(),
});

const resolutionPhotoSchema = z.object({
  afterUrl: z
    .string()
    .url(),
  latitude: z
    .number()
    .gte(-90)
    .lte(90)
    .optional(),
  longitude: z
    .number()
    .gte(-180)
    .lte(180)
    .optional(),
});

const transitions: Record<
  Status,
  Status[]
> = {
  SUBMITTED: [
    'AI_PROCESSED',
    'REJECTED',
  ],

  AI_PROCESSED: [
    'ASSIGNED',
    'REJECTED',
  ],

  ASSIGNED: [
    'ACKNOWLEDGED',
    'REOPENED',
  ],

  ACKNOWLEDGED: [
    'IN_PROGRESS',
  ],

  IN_PROGRESS: [
    'RESOLUTION_SUBMITTED',
  ],

  RESOLUTION_SUBMITTED: [
    'VERIFICATION',
  ],

  VERIFICATION: [
    'RESOLVED',
    'REOPENED',
  ],

  RESOLVED: [
    'REOPENED',
  ],

  REOPENED: [
    'IN_PROGRESS',
    'ASSIGNED',
  ],

  REJECTED: [],
};

function generateGrievanceId() {
  const suffix = randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `GRV-${Date.now()}-${suffix}`;
}

export async function create(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const user = await User.findById(
    req.user.id,
  );

  if (!user) {
    throw new AppError(
      404,
      'USER_NOT_FOUND',
      'User not found',
    );
  }

  if (!user.emailVerified) {
    throw new AppError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Verify your email before submitting a grievance',
    );
  }

  const data = createSchema.parse(
    req.body,
  );

  const grievanceId =
    generateGrievanceId();

  const grievance =
    await Grievance.create({
      grievanceId,

      userId: user._id,

      text: data.text || 'Voice report submitted',

      title: data.text || undefined,

      language: data.language,

      media: data.media ?? [],

      location: {
        type: 'Point',
        coordinates: [
          data.location.longitude,
          data.location.latitude,
        ],
      },

      status: 'SUBMITTED',
    });

  try {
    const ai =
      await analyzeGrievance({
        grievanceId,

        text: data.text,

        language:
          data.language ?? null,

        media:
          data.media ?? [],

        location: data.location,
      });

    Object.assign(grievance, {
      // Voice-only reports are persisted with the AI transcript as the raw
      // report text. Typed reports keep the citizen's original wording.
      text: ai.transcript?.trim() || data.text || 'Voice report submitted',
      title: ai.title,
      summary: ai.summary,
      language: ai.language,

      category: ai.category,

      subCategory:
        ai.subCategory,

      severity:
        ai.severity,

      impactScore:
        ai.impactScore,

      aiConfidence:
        ai.confidence,

      aiHumanReview:
        ai.humanReview ||
        [
          ai.confidence.category,
          ai.confidence.severity,
          ai.confidence.impact,
        ].some(
          (value) => value < env.AI_CONFIDENCE_THRESHOLD,
        ),

      aiReviewReasons:
        ai.reviewReasons,

      isEmergency:
        ai.isEmergency,

      departments:
        [ai.departments[0]],

      masterIncidentId:
        ai.duplicate?.masterIncidentId ||
        undefined,

      status: 'AI_PROCESSED',
    });

    await routeGrievance(
      grievance,
      [ai.departments[0]],
    );

    await applySla(
      grievance,
    );

    await grievance.save();

    await audit(
      String(user._id),
      'citizen',
      'GRIEVANCE_SUBMITTED',
      String(grievance._id),
      'SUBMITTED',
      grievance.status,
      {
        category: grievance.category,
        severity: grievance.severity,
      },
    );

    await audit(
      undefined,
      'system',
      grievance.officerId ? 'AI_ROUTED_GRIEVANCE' : 'AI_ROUTING_FAILED',
      String(grievance._id),
      'AI_PROCESSED',
      grievance.status,
      {
        departmentId: grievance.departmentId ? String(grievance.departmentId) : null,
        officerId: grievance.officerId ? String(grievance.officerId) : null,
        departments: grievance.departments ?? [],
      },
    );

    await notify(
      String(user._id),
      grievance.officerId ? 'Grievance submitted and routed' : 'Grievance submitted',
      grievance.officerId
        ? `Your grievance ${grievance.grievanceId} was analyzed and routed to the responsible department officer.`
        : `Your grievance ${grievance.grievanceId} was received, but automatic officer assignment was unavailable.`,
      String(grievance._id),
      'grievance',
    );

    if (grievance.aiHumanReview) {
      await notifyAdmins(
        'AI routing needs review',
        `${grievance.grievanceId} was routed to an officer, but the AI result has low confidence and is available for correction.`,
        String(grievance._id),
        'system',
      );
    }

    if (grievance.officerId) {
      const assignedOfficer = await Officer.findById(grievance.officerId).select('userId');
      if (assignedOfficer) {
        await notify(String(assignedOfficer.userId), 'Grievance assigned', `You have been assigned ${grievance.grievanceId}.`, String(grievance._id), 'assignment');
      }
    }

    await PublicPost.findOneAndUpdate(
      {
        grievanceId:
          String(grievance._id),
      },
      {
        grievanceId:
          String(grievance._id),

        authorId:
          user._id,
      },
      {
        upsert: true,

        new: true,

        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    console.error(
      'AI pipeline failed:',
      error,
    );

    grievance.aiHumanReview = true;

    grievance.aiReviewReasons = [
      'AI_SERVICE_FAILURE',
    ];

    // Never leave a citizen grievance waiting for an administrator merely
    // because the AI service is temporarily unavailable. Use the same
    // constrained routing service with the safe 'other' department target.
    grievance.departments = ['other'];
    grievance.category = grievance.category || 'other';
    await routeGrievance(grievance, ['other']);
    await applySla(grievance);
    await grievance.save();
    await audit(
      undefined,
      'system',
      'AI_PROCESSING_FAILED',
      String(grievance._id),
      'SUBMITTED',
      grievance.status,
      { error: error instanceof Error ? error.message : 'Unknown AI pipeline error' },
    );
    await notify(
      String(user._id),
      'Grievance received',
      `Your grievance ${grievance.grievanceId} was received and automatically assigned to the fallback department while AI is unavailable.`,
      String(grievance._id),
      'system',
    );
    await notifyAdmins(
      'AI service unavailable',
      `${grievance.grievanceId} was automatically assigned to the fallback department while the AI service is unavailable.`,
      String(grievance._id),
      'system',
    );
  }

  return ok(
    res,
    grievance,
    201,
  );
}

export async function list(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const query: Record<
    string,
    unknown
  > = {};

  if (req.query.mine === 'true') {
    query.userId = req.user.id;
  }

  if (req.query.status) {
    const status =
      String(req.query.status);

    if (
      !STATUSES.includes(
        status as Status,
      )
    ) {
      throw new AppError(
        400,
        'INVALID_STATUS',
        'Invalid grievance status',
      );
    }

    query.status = status;
  }

  if (req.query.category) {
    query.category =
      String(req.query.category);
  }

  if (req.query.department) {
    query.departmentId =
      String(req.query.department);
  }

  if (req.query.ward) {
    query.wardId =
      String(req.query.ward);
  }

  if (
    req.query.assignedTo === 'me'
  ) {
    if (req.user.role === 'admin') {
      query.officerId = { $exists: true, $ne: null };
    } else {
      const officer = await Officer.findOne({ userId: req.user.id });
      if (!officer) throw new AppError(403, 'NOT_OFFICER', 'Officer profile required');
      query.officerId = officer._id;
    }
  }

  if (req.query.search) {
    query.$text = {
      $search:
        String(req.query.search),
    };
  }

  if (
    req.query.lat !== undefined &&
    req.query.lng !== undefined
  ) {
    const latitude =
      Number(req.query.lat);

    const longitude =
      Number(req.query.lng);

    const radius =
      Number(
        req.query.radius ?? 5000,
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(radius) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      radius <= 0
    ) {
      throw new AppError(
        400,
        'INVALID_LOCATION',
        'Invalid location or radius',
      );
    }

    query.location = {
      $near: {
        $geometry: {
          type: 'Point',

          coordinates: [
            longitude,
            latitude,
          ],
        },

        $maxDistance: radius,
      },
    };
  }

  const page = Math.max(
    1,
    Number(req.query.page ?? 1),
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(
        req.query.limit ?? 20,
      ),
    ),
  );

  const sort: Record<string, 1 | -1> =
    req.query.sort === 'impact'
      ? { impactScore: -1 }
      : { createdAt: -1 };

  const items =
    await Grievance.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(
        'userId',
        'name username profileImage',
      )
      .populate(
        'departmentId',
        'name code',
      )
      .populate('wardId', 'name code')
      .populate({ path: 'officerId', populate: { path: 'userId', select: 'name username profileImage' } });

  const total =
    await Grievance.countDocuments(
      query,
    );

  return ok(res, {
    items,

    page,

    limit,

    total,

    pages: Math.ceil(
      total / limit,
    ),
  });
}

export async function getOne(
  req: AuthRequest,
  res: Response,
) {
  const grievance =
    await Grievance.findById(
      req.params.id,
    )
      .populate(
        'userId',
        'name username profileImage',
      )
      .populate('departmentId')
      .populate('wardId')
      .populate({ path: 'officerId', populate: { path: 'userId', select: 'name username profileImage' } });

  if (!grievance) {
    throw new AppError(
      404,
      'GRIEVANCE_NOT_FOUND',
      'Grievance not found',
    );
  }

  return ok(
    res,
    grievance,
  );
}

export async function status(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const requestedStatus =
    req.body.status;

  if (
    typeof requestedStatus !==
      'string' ||
    !STATUSES.includes(
      requestedStatus as Status,
    )
  ) {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Invalid status',
    );
  }

  const grievance =
    await Grievance.findById(
      req.params.id,
    );

  if (!grievance) {
    throw new AppError(
      404,
      'GRIEVANCE_NOT_FOUND',
      'Grievance not found',
    );
  }

  if (
    req.user.role === 'citizen'
  ) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Citizen cannot change status',
    );
  }

  const officer =
    await Officer.findOne({
      userId: req.user.id,
    });

  if (
    req.user.role === 'officer' &&
    (
      !officer ||
      String(
        grievance.officerId,
      ) !== String(officer._id)
    )
  ) {
    throw new AppError(
      403,
      'NOT_ASSIGNED',
      'Grievance is not assigned to you',
    );
  }

  const nextStatus = requestedStatus as Status;

  if (req.user.role === 'officer' && ['VERIFICATION', 'RESOLVED'].includes(nextStatus)) {
    throw new AppError(403, 'VERIFICATION_REQUIRED', 'Officer cannot verify or close a resolution');
  }

  // Acknowledge is an officer action, but accepting the case immediately
  // starts the work. We persist acknowledgedAt so the public feed can show
  // the acknowledgement tag while the workflow status becomes IN_PROGRESS.
  if (
    req.user.role === 'officer' &&
    nextStatus === 'ACKNOWLEDGED'
  ) {
    // A retry after a network timeout should not make an already-started
    // grievance look like a failed acknowledgement.
    if (grievance.status === 'IN_PROGRESS' && grievance.acknowledgedAt) {
      return ok(res, grievance);
    }
    if (grievance.status !== 'ASSIGNED') {
      throw new AppError(
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot acknowledge from ${grievance.status}`,
      );
    }

    const previousStatus = grievance.status;
    grievance.acknowledgedAt = new Date();
    grievance.status = 'IN_PROGRESS';
    await grievance.save();

    // Keep the state change successful even if a non-critical audit or
    // notification write fails after the grievance has already been saved.
    const sideEffects = await Promise.allSettled([
      audit(
        req.user.id,
        req.user.role,
        'GRIEVANCE_ACKNOWLEDGED',
        String(grievance._id),
        previousStatus,
        'IN_PROGRESS',
      ),
      notify(
        String(grievance.userId),
        'Grievance acknowledged',
        'The assigned officer has acknowledged your grievance and started work.',
        String(grievance._id),
        'status',
      ),
    ]);
    sideEffects.forEach((result) => {
      if (result.status === 'rejected') console.error('Acknowledgement side effect failed:', result.reason);
    });

    return ok(res, grievance);
  }

  const allowedTransitions =
    transitions[
      grievance.status as Status
    ] ?? [];

  if (
    !allowedTransitions.includes(
      nextStatus,
    )
  ) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot move from ${grievance.status} to ${nextStatus}`,
    );
  }

  const previousStatus =
    grievance.status;

  grievance.status =
    nextStatus;

  await grievance.save();

  await audit(
    req.user.id,
    req.user.role,
    'STATUS_CHANGED',
    String(grievance._id),
    previousStatus,
    nextStatus,
  );

  const messages: Record<
    string,
    string
  > = {
    IN_PROGRESS:
      'Your grievance is now being worked on.',
    RESOLVED:
      'Your grievance has been marked resolved.',
  };

  const message =
    messages[nextStatus];

  if (message) {
    await notify(
      String(
        grievance.userId,
      ),
      `Grievance ${nextStatus}`,
      message,
      String(
        String(grievance._id),
      ),
    );
  }

  if (nextStatus === 'RESOLVED') await awardResolvedGrievance(String(grievance._id));

  return ok(
    res,
    grievance,
  );
}

export async function resolution(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const officer =
    await Officer.findOne({
      userId: req.user.id,
    });

  if (!officer) {
    throw new AppError(
      403,
      'NOT_OFFICER',
      'Officer only',
    );
  }

  const grievance =
    await Grievance.findById(
      req.params.id,
    );

  if (!grievance) {
    throw new AppError(
      404,
      'GRIEVANCE_NOT_FOUND',
      'Grievance not found',
    );
  }

  if (
    String(
      grievance.officerId,
    ) !== String(officer._id)
  ) {
    throw new AppError(
      403,
      'NOT_ASSIGNED',
      'Grievance is not assigned to you',
    );
  }

  const data = resolutionSchema.parse(req.body);

  // If the client retries after the status/evidence was saved but the
  // response was lost, return the existing submission instead of creating
  // duplicate evidence or reporting a misleading failure.
  if (grievance.status === 'RESOLUTION_SUBMITTED') {
    const existingEvidence = await ResolutionEvidence.findOne({
      grievanceId: grievance._id,
      officerId: officer._id,
    }).sort({ createdAt: -1 });
    if (existingEvidence) return ok(res, { grievance, evidence: existingEvidence });
  }

  if (grievance.status !== 'IN_PROGRESS') {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Grievance must be in progress before submitting resolution',
    );
  }

  // The first officer submission is only the written work record.
  // Photo evidence is deliberately a separate final step.
  const evidence = await ResolutionEvidence.create({
    grievanceId: grievance._id,
    officerId: officer._id,
    resolutionDescription: data.resolutionDescription,
  });

  const previousStatus =
    grievance.status;

  grievance.status =
    'RESOLUTION_SUBMITTED';

  await grievance.save();

  const sideEffects = await Promise.allSettled([
    audit(
      req.user.id,
      req.user.role,
      'RESOLUTION_SUBMITTED',
      String(grievance._id),
      previousStatus,
      grievance.status,
      { evidenceId: String(evidence._id) },
    ),
    notify(
      String(grievance.userId),
      'Resolution submitted',
      'The department officer submitted a resolution description. Photo evidence is pending.',
      String(grievance._id),
      'resolution',
    ),
  ]);
  sideEffects.forEach((result) => {
    if (result.status === 'rejected') console.error('Resolution submission side effect failed:', result.reason);
  });

  return ok(
    res,
    {
      grievance,
      evidence,
    },
    201,
  );
}

export async function finalizeResolution(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const officer =
    await Officer.findOne({
      userId: req.user.id,
      active: true,
    });

  if (!officer) {
    throw new AppError(
      403,
      'NOT_OFFICER',
      'Officer only',
    );
  }

  const grievance =
    await Grievance.findById(
      req.params.id,
    );

  if (!grievance) {
    throw new AppError(
      404,
      'GRIEVANCE_NOT_FOUND',
      'Grievance not found',
    );
  }

  if (
    String(grievance.officerId) !==
    String(officer._id)
  ) {
    throw new AppError(
      403,
      'NOT_ASSIGNED',
      'Grievance is not assigned to you',
    );
  }

  if (
    grievance.status !==
    'RESOLUTION_SUBMITTED'
  ) {
    throw new AppError(
      400,
      'INVALID_STATUS',
      'Submit the resolution description before uploading final photo evidence',
    );
  }

  const data =
    resolutionPhotoSchema.parse(
      req.body,
    );

  const evidence =
    await ResolutionEvidence.findOne({
      grievanceId: grievance._id,
      officerId: officer._id,
    }).sort({ createdAt: -1 });

  if (!evidence) {
    throw new AppError(
      400,
      'RESOLUTION_NOT_FOUND',
      'Resolution description must be submitted first',
    );
  }

  evidence.afterUrl = data.afterUrl;

  if (
    data.latitude !== undefined &&
    data.longitude !== undefined
  ) {
    evidence.gps = {
      type: 'Point',
      coordinates: [
        data.longitude,
        data.latitude,
      ],
    };
  }

  evidence.verified = true;
  await evidence.save();

  const previousStatus =
    grievance.status;

  grievance.status =
    'RESOLVED';

  await grievance.save();

  await audit(
    req.user.id,
    req.user.role,
    'RESOLUTION_PHOTO_SUBMITTED',
    String(grievance._id),
    previousStatus,
    grievance.status,
    {
      evidenceId:
        String(evidence._id),
    },
  );

  await notify(
    String(grievance.userId),
    'Grievance resolved',
    'The department officer submitted final photo evidence. Your grievance is now resolved.',
    String(grievance._id),
  );

  await awardResolvedGrievance(String(grievance._id));

  return ok(
    res,
    {
      grievance,
      evidence,
    },
  );
}


export async function verifyResolution(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  const decision = req.body.decision;
  if (decision !== 'approve' && decision !== 'reopen') throw new AppError(400, 'INVALID_VERIFICATION', 'Decision must be approve or reopen');

  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) throw new AppError(404, 'GRIEVANCE_NOT_FOUND', 'Grievance not found');
  if (req.user.role === 'citizen' && String(grievance.userId) !== String(req.user.id)) throw new AppError(403, 'FORBIDDEN', 'Only the reporting citizen can verify this resolution');
  if (grievance.status !== 'VERIFICATION') throw new AppError(400, 'INVALID_STATUS', 'This grievance is not awaiting verification');

  const previous = grievance.status;
  grievance.status = decision === 'approve' ? 'RESOLVED' : 'REOPENED';
  await grievance.save();

  await audit(req.user.id, req.user.role, decision === 'approve' ? 'RESOLUTION_VERIFIED' : 'RESOLUTION_REOPENED', String(grievance._id), previous, grievance.status);
  if (grievance.officerId) {
    const officer = await Officer.findById(grievance.officerId).select('userId');
    if (officer) await notify(String(officer.userId), decision === 'approve' ? 'Resolution verified' : 'Resolution reopened', decision === 'approve' ? 'The citizen verified your resolution.' : 'The citizen reported that the issue still exists.', String(grievance._id), 'verification');
  }
  await notify(String(grievance.userId), decision === 'approve' ? 'Resolution verified' : 'Grievance reopened', decision === 'approve' ? 'Your grievance is now resolved.' : 'The grievance has been reopened for further action.', String(grievance._id), 'verification');
  if (decision === 'approve') await awardResolvedGrievance(String(grievance._id));
  return ok(res, grievance);
}

export async function dispute(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Authentication required',
    );
  }

  const grievance =
    await Grievance.findOne({
      _id: req.params.id,

      userId: req.user.id,
    });

  if (!grievance) {
    throw new AppError(
      404,
      'GRIEVANCE_NOT_FOUND',
      'Grievance not found',
    );
  }

  if (
    grievance.status !==
    'RESOLVED'
  ) {
    throw new AppError(
      400,
      'NOT_RESOLVED',
      'Only resolved grievances can be disputed',
    );
  }

  const reason =
    typeof req.body.reason ===
    'string'
      ? req.body.reason.trim()
      : '';

  if (!reason) {
    throw new AppError(
      400,
      'INVALID_REASON',
      'Dispute reason is required',
    );
  }

  grievance.status =
    'REOPENED';

  await grievance.save();

  await audit(
    req.user.id,
    'citizen',
    'DISPUTED_RESOLUTION',
    String(grievance._id),
    'RESOLVED',
    'REOPENED',
    {
      reason,
    },
  );

  if (grievance.officerId) {
    const assignedOfficer = await Officer.findById(
      grievance.officerId,
    ).select('userId');

    if (assignedOfficer) {
      await notify(
        String(assignedOfficer.userId),
        'Resolution disputed',
        'A citizen disputed the resolution.',
        String(grievance._id),
        'dispute',
      );
    }
  }

  return ok(
    res,
    grievance,
  );
}
export async function analyzePreview(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  const data = createSchema.parse(req.body);
  const previewId = `PREVIEW-${Date.now()}`;
  try {
    const ai = await analyzeGrievance({
      grievanceId: previewId,
      text: data.text,
      language: data.language ?? null,
      media: data.media ?? [],
      location: data.location,
    });
    return ok(res, ai);
  } catch (error) {
    console.error('AI preview pipeline failed:', {
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : undefined,
    });
    throw new AppError(502, 'AI_SERVICE_UNAVAILABLE', 'AI analysis service is temporarily unavailable. Please try again.');
  }
}
