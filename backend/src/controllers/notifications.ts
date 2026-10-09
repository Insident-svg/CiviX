import { Response } from 'express';

import { Notification } from '../models/Notification.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

const NOTIFICATION_TYPES = [
  'grievance',
  'status',
  'assignment',
  'resolution',
  'verification',
  'dispute',
  'system',
] as const;

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

  const query: Record<string, unknown> = {
    userId: req.user.id,
    // Keep the recipient tied to the authenticated workspace. Legacy rows
    // without recipientRole remain visible because userId already isolates them.
    $or: [
      { recipientRole: req.user.role },
      { recipientRole: { $exists: false } },
    ],
  };

  if (
    req.query.read !== undefined
  ) {
    const read =
      String(req.query.read);

    if (
      read !== 'true' &&
      read !== 'false'
    ) {
      throw new AppError(
        400,
        'INVALID_READ_FILTER',
        'read must be true or false',
      );
    }

    query.read = read === 'true';
  }

  if (req.query.type) {
    const type =
      String(req.query.type);

    if (
      !NOTIFICATION_TYPES.includes(
        type as (typeof NOTIFICATION_TYPES)[number],
      )
    ) {
      throw new AppError(
        400,
        'INVALID_NOTIFICATION_TYPE',
        'Invalid notification type',
      );
    }

    query.type = type;
  }

  const page = Math.max(
    1,
    Number(req.query.page ?? 1),
  );

  const limit = Math.min(
    50,
    Math.max(
      1,
      Number(
        req.query.limit ?? 20,
      ),
    ),
  );

  if (
    !Number.isFinite(page) ||
    !Number.isFinite(limit)
  ) {
    throw new AppError(
      400,
      'INVALID_PAGINATION',
      'Invalid pagination values',
    );
  }

  const notifications =
    await Notification.find(query)
      .sort({
        createdAt: -1,
      })
      .skip(
        (page - 1) * limit,
      )
      .limit(limit)
      .populate(
        'grievanceId',
        'grievanceId status category',
      )
      .lean();

  const total =
    await Notification.countDocuments(
      query,
    );

  return ok(res, {
    items: notifications,

    page,

    limit,

    total,

    pages: Math.ceil(
      total / limit,
    ),

    nextPage:
      notifications.length ===
      limit
        ? page + 1
        : null,
  });
}

export async function read(
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

  const notification =
    await Notification.findOneAndUpdate(
      {
        _id: req.params.id,

        userId: req.user.id,
      },
      {
        read: true,
      },
      {
        returnDocument: 'after',
      },
    ).populate(
      'grievanceId',
      'grievanceId status category',
    );

  if (!notification) {
    throw new AppError(
      404,
      'NOTIFICATION_NOT_FOUND',
      'Notification not found',
    );
  }

  return ok(
    res,
    notification,
  );
}

export async function readAll(req: AuthRequest, res: Response) {
  if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  const result = await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
  return ok(res, { updated: result.modifiedCount });
}
