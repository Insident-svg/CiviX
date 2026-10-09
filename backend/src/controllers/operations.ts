import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { Grievance } from '../models/Grievance.js';
import { User } from '../models/User.js';
import { Officer } from '../models/Officer.js';
import { PublicPost } from '../models/PublicPost.js';
import { Department } from '../models/Department.js';
import { Notification } from '../models/Notification.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';
import { audit } from '../services/audit.js';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { Ward } from '../models/Ward.js';
import { notify } from '../services/notifications.js';
import type { Status } from '../types/index.js';

function requireAdmin(req: AuthRequest) {
  if (!req.user || req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Administrator access required');
}

export async function overview(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const active: { $nin: Status[] } = { $nin: ['RESOLVED', 'REJECTED'] };
  const [totalUsers, activeGrievances, officers, aiQueue, resolved, received30] = await Promise.all([
    User.countDocuments({ blocked: false }),
    Grievance.countDocuments({ status: active }),
    Officer.countDocuments({ active: true }),
    Grievance.countDocuments({ aiHumanReview: true, status: { $nin: ['RESOLVED', 'REJECTED'] } }),
    Grievance.countDocuments({ status: 'RESOLVED' }),
    Grievance.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
  ]);

  const [bySeverity, byCategory, departments, recentAudit, moderation] = await Promise.all([
    Grievance.aggregate([{ $match: { status: active } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
    Grievance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Department.find({ active: true }).select('name code').lean(),
    AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } }),
    PublicPost.countDocuments({ moderated: true }),
  ]);

  const departmentPerformance = await Promise.all(departments.map(async d => {
    // Count by the canonical departmentId, with a legacy-code fallback so
    // every routed grievance is represented in the admin dashboard.
    const departmentFilter = {
      $or: [
        { departmentId: d._id },
        { departments: d.code },
      ],
    };

    const [cases, done] = await Promise.all([
      Grievance.countDocuments(departmentFilter),
      Grievance.countDocuments({
        ...departmentFilter,
        status: 'RESOLVED',
      }),
    ]);

    return {
      id: String(d._id),
      name: d.name,
      code: d.code,
      cases,
      resolved: done,
      resolutionRate: cases
        ? Math.round((done / cases) * 1000) / 10
        : 0,
    };
  }));

  const daily = await Grievance.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 12 * 86400000) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, received: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } } } },
    { $sort: { _id: 1 } },
  ]);

  const totalClosed = resolved + await Grievance.countDocuments({ status: 'REJECTED' });
  const totalAll = await Grievance.countDocuments();
  const slaTotal = await Grievance.countDocuments({ slaDeadline: { $exists: true }, status: { $nin: ['RESOLVED','REJECTED'] } });
  const slaBreached = await Grievance.countDocuments({ slaDeadline: { $lt: new Date() }, status: { $nin: ['RESOLVED','REJECTED'] } });

  return ok(res, {
    users: { total: totalUsers },
    grievances: { active: activeGrievances, total: totalAll, received30, resolved, resolutionRate: totalAll ? Math.round(resolved / totalAll * 1000) / 10 : 0 },
    officers: { active: officers },
    ai: { reviewQueue: aiQueue },
    moderation: { moderated: moderation },
    audit: { last24h: recentAudit },
    sla: { compliance: slaTotal ? Math.max(0, Math.round((1 - slaBreached / slaTotal) * 1000) / 10) : 100, breached: slaBreached, tracked: slaTotal },
    bySeverity,
    byCategory,
    departmentPerformance,
    daily,
    systemHealth: { database: true, aiConfigured: Boolean(env.AI_SERVICE_URL), api: true },
    closed: totalClosed,
  });
}

export async function systemOverview(req: AuthRequest, res: Response) {
  requireAdmin(req);

  const [
    departments,
    activeOfficers,
    assignedCases,
    unassignedCases,
    unreadNotifications,
    audit24h,
    aiReviewQueue,
    overdueSla,
  ] = await Promise.all([
    Department.countDocuments({ active: true }),
    Officer.countDocuments({ active: true }),
    Grievance.countDocuments({ officerId: { $exists: true, $ne: null }, status: { $nin: ['RESOLVED', 'REJECTED'] } }),
    Grievance.countDocuments({ officerId: { $in: [null] }, status: { $nin: ['RESOLVED', 'REJECTED'] } }),
    Notification.countDocuments({ read: false }),
    AuditLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    Grievance.countDocuments({ aiHumanReview: true, status: { $nin: ['RESOLVED', 'REJECTED'] } }),
    Grievance.countDocuments({ slaDeadline: { $lt: new Date() }, status: { $nin: ['RESOLVED', 'REJECTED'] } }),
  ]);

  const officerCoverage = await Officer.aggregate([
    { $match: { active: true } },
    { $unwind: '$departmentIds' },
    { $group: { _id: '$departmentIds', officers: { $sum: 1 } } },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
    { $unwind: '$department' },
    { $project: { _id: 0, name: '$department.name', code: '$department.code', officers: 1 } },
    { $sort: { name: 1 } },
  ]);

  return ok(res, {
    services: { api: true, database: true, aiConfigured: Boolean(env.AI_SERVICE_URL) },
    routing: { departments, activeOfficers, assignedCases, unassignedCases, aiReviewQueue, overdueSla },
    notifications: { unread: unreadNotifications },
    audit: { last24h: audit24h },
    officerCoverage,
    generatedAt: new Date().toISOString(),
  });
}

export async function auditLogs(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const q = String(req.query.search ?? '').trim();
  // Keep the complete audit trail, but never expose citizen LOGIN events.
  // LOGIN is retained only for officer access alerts; all other audit actions
  // (grievance submission, AI routing/failure, overrides, status changes,
  // resolutions, verification/reopening, account creation, moderation, seed, etc.)
  // remain visible to the administrator.
  const loginVisibilityFilter = {
    $or: [
      { action: { $ne: 'LOGIN' } },
      { action: 'LOGIN', actorRole: 'officer' },
    ],
  };

  const query: Record<string, unknown> = q
    ? {
        $and: [
          { action: { $regex: q, $options: 'i' } },
          loginVisibilityFilter,
        ],
      }
    : loginVisibilityFilter;
  const items = await AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    .populate('actorId', 'name username role').populate('grievanceId', 'grievanceId text status').lean();
  const total = await AuditLog.countDocuments(query);
  return ok(res, { items, total, page, limit, nextPage: page * limit < total ? page + 1 : null });
}

export async function moderation(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const items = await PublicPost.find({ visibility: 'public' }).sort({ moderated: 1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit)
    .populate('authorId', 'name username').populate({ path: 'grievanceId', select: 'grievanceId text media status aiHumanReview aiReviewReasons' }).lean();
  return ok(res, { items, page, limit, nextPage: items.length === limit ? page + 1 : null });
}

export async function aiReview(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const items = await Grievance.find({ aiHumanReview: true, status: { $nin: ['RESOLVED', 'REJECTED'] } })
    .sort({ impactScore: -1, createdAt: -1 }).limit(100)
    .populate('userId', 'name username profileImage').populate('departmentId', 'name code').populate('wardId', 'name code').lean();
  return ok(res, { items, total: items.length });
}

export async function decideAI(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const { decision } = req.body;
  if (!['approve', 'reject', 'override', 'merge'].includes(decision)) throw new AppError(400, 'INVALID_DECISION', 'Invalid AI review decision');
  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) throw new AppError(404, 'GRIEVANCE_NOT_FOUND', 'Grievance not found');
  const previous = grievance.status;
  if (decision === 'reject') grievance.status = 'REJECTED';
  else if (decision === 'approve' || decision === 'override') grievance.aiHumanReview = false;
  else grievance.aiHumanReview = false;
  grievance.aiReviewReasons = [...(grievance.aiReviewReasons ?? []), `HUMAN_REVIEW_${decision.toUpperCase()}`];
  await grievance.save();
  await audit(req.user!.id, 'admin', `AI_REVIEW_${decision.toUpperCase()}`, String(grievance._id), previous, grievance.status, { decision });
  return ok(res, grievance);
}

export async function usersDirectory(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const q = String(req.query.search ?? '').trim();
  const filter: Record<string, unknown> = q ? { $or: [{ name: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }] } : {};
  const items = await User.find(filter).select('name username email role governmentId emailVerified blocked profileImage createdAt').sort({ createdAt: -1 }).limit(200).lean();
  const officers = await Officer.find().select('userId employeeId active departmentIds wardIds').populate('userId','name username email').populate('departmentIds','name code').populate('wardIds','name code').lean();
  return ok(res, { users: items, officers });
}

export async function departmentsDirectory(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const items = await Department.find().sort({ name: 1 }).lean();
  const stats = await Promise.all(items.map(async d => {
    // New grievances are routed using departmentId. Keep a fallback to the
    // stored department code so older/legacy grievances are still reflected
    // in the admin portal department counts.
    const departmentFilter = {
      $or: [
        { departmentId: d._id },
        { departments: d.code },
      ],
    };

    const [activeGrievances, totalGrievances] = await Promise.all([
      Grievance.countDocuments({
        ...departmentFilter,
        status: { $nin: ['RESOLVED', 'REJECTED'] },
      }),
      Grievance.countDocuments(departmentFilter),
    ]);

    return {
      ...d,
      activeGrievances,
      totalGrievances,
    };
  }));
  return ok(res, stats);
}

export async function moderatePost(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const { moderated } = req.body;
  if (typeof moderated !== 'boolean') throw new AppError(400, 'INVALID_MODERATION_STATE', 'moderated must be boolean');
  const post = await PublicPost.findByIdAndUpdate(req.params.id, { moderated }, { new: true }).populate('authorId','name username').lean();
  if (!post) throw new AppError(404, 'POST_NOT_FOUND', 'Public post not found');
  await audit(req.user!.id, 'admin', moderated ? 'CONTENT_HIDDEN' : 'CONTENT_RESTORED', String(post.grievanceId), undefined, undefined, { postId: String(post._id) });
  return ok(res, post);
}



function makeGovernmentId(role: 'officer' | 'admin') {
  const prefix = role === 'admin' ? 'CIVIX-ADMIN' : 'CIVIX-OFFICER';
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function governmentAccounts(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const accounts = await User.find({ role: { $in: ['officer', 'admin'] } })
    .select('name username email role governmentId emailVerified blocked createdAt')
    .sort({ createdAt: -1 })
    .lean();
  const officers = await Officer.find({ active: true })
    .populate('userId', 'name username email role governmentId')
    .populate('departmentIds', 'name code')
    .populate('wardIds', 'name code')
    .lean();
  return ok(res, { accounts, officers });
}

export async function createGovernmentAccount(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const role = req.body.role === 'admin' ? 'admin' : 'officer';
  const name = String(req.body.name ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const governmentId = String(req.body.governmentId ?? makeGovernmentId(role)).trim().toUpperCase();
  const username = String(req.body.username ?? governmentId.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30));
  const departmentIds = Array.isArray(req.body.departmentIds) ? req.body.departmentIds : [];
  const wardIds = Array.isArray(req.body.wardIds) ? req.body.wardIds : [];

  if (name.length < 2 || !email || password.length < 8 || governmentId.length < 5) {
    throw new AppError(400, 'INVALID_GOVERNMENT_ACCOUNT', 'Name, email, government ID and password are required');
  }
  if (role === 'officer' && departmentIds.length === 0) {
    throw new AppError(400, 'OFFICER_DEPARTMENT_REQUIRED', 'Officer accounts must be linked to at least one department');
  }
  if (await User.exists({ $or: [{ email }, { username: username.toLowerCase() }, { governmentId }] })) {
    throw new AppError(409, 'GOVERNMENT_ACCOUNT_EXISTS', 'Government ID, username or email already exists');
  }

  const user = await User.create({
    name,
    username: username.toLowerCase(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    governmentId,
    emailVerified: true,
    blocked: false,
  });

  let officer = null;
  if (role === 'officer') {
    officer = await Officer.create({
      userId: user._id,
      departmentIds,
      wardIds,
      employeeId: String(req.body.employeeId ?? governmentId),
      active: true,
    });
  }

  await audit(req.user!.id, 'admin', 'GOVERNMENT_ACCOUNT_CREATED', undefined, undefined, undefined, {
    targetUserId: String(user._id), role, governmentId,
  });

  return ok(res, { user: safeGovernmentUser(user), officer }, 201);
}

export async function assignGrievance(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const grievance = await Grievance.findById(req.params.id);
  if (!grievance) throw new AppError(404, 'GRIEVANCE_NOT_FOUND', 'Grievance not found');

  const officer = await Officer.findOne({ _id: req.body.officerId, active: true })
    .populate('userId', 'name username governmentId')
    .populate('departmentIds', 'name code');
  if (!officer) throw new AppError(404, 'OFFICER_NOT_FOUND', 'Active officer not found');

  const selectedDepartmentId = req.body.departmentId
    ? String(req.body.departmentId)
    : officer.departmentIds?.[0]?._id?.toString();
  const officerDepartments = ((officer.departmentIds as any[]) ?? []).map((d: any) => String(d._id));
  if (!selectedDepartmentId || !officerDepartments.includes(selectedDepartmentId)) {
    throw new AppError(400, 'INVALID_OFFICER_DEPARTMENT', 'The selected officer is not assigned to that department');
  }

  const previousStatus = grievance.status;
  const previousOfficerId = grievance.officerId ? String(grievance.officerId) : null;
  const previousDepartmentId = grievance.departmentId ? String(grievance.departmentId) : null;

  grievance.officerId = officer._id;
  grievance.departmentId = selectedDepartmentId as any;
  if (grievance.status === 'AI_PROCESSED' || grievance.status === 'REOPENED' || grievance.status === 'SUBMITTED') grievance.status = 'ASSIGNED';
  await grievance.save();

  await audit(req.user!.id, 'admin', 'GRIEVANCE_ROUTING_OVERRIDDEN', String(grievance._id), previousStatus, grievance.status, {
    previousOfficerId,
    previousDepartmentId,
    officerId: String(officer._id),
    departmentId: selectedDepartmentId,
  });

  if (previousOfficerId && previousOfficerId !== String(officer._id)) {
    const previousOfficer = await Officer.findById(previousOfficerId).select('userId');
    if (previousOfficer) {
      await notify(String(previousOfficer.userId), 'Grievance reassigned', `${grievance.grievanceId} has been reassigned to another officer.`, String(grievance._id), 'assignment');
    }
  }

  await notify(String((officer.userId as any)._id || officer.userId), 'Grievance assigned', `You have been assigned ${grievance.grievanceId}.`, String(grievance._id), 'assignment');
  await notify(String(grievance.userId), 'Grievance routing updated', `An administrator routed ${grievance.grievanceId} to a different officer/department.`, String(grievance._id), 'assignment');

  return ok(res, await Grievance.findById(grievance._id).populate('officerId').populate('departmentId').populate('wardId'));
}

function safeGovernmentUser(user: any) {
  return { id: String(user._id), name: user.name, username: user.username, email: user.email, role: user.role, governmentId: user.governmentId, emailVerified: user.emailVerified };
}

export async function publicStats(_req: Request, res: Response) {
  const [total, resolved, avgResponse] = await Promise.all([
    Grievance.countDocuments(),
    Grievance.countDocuments({ status: 'RESOLVED' }),
    Grievance.aggregate([
      { $match: { acknowledgedAt: { $exists: true }, createdAt: { $exists: true } } },
      { $project: { hours: { $divide: [{ $subtract: ['$acknowledgedAt', '$createdAt'] }, 3600000] } } },
      { $group: { _id: null, value: { $avg: '$hours' } } },
    ]),
  ]);
  const satisfaction = await Grievance.aggregate([
    { $match: { citizenSatisfaction: { $type: 'number' } } },
    { $group: { _id: null, value: { $avg: '$citizenSatisfaction' } } },
  ]);
  return ok(res, {
    total,
    resolved,
    resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
    satisfaction: satisfaction[0]?.value ? Math.round(satisfaction[0].value) : null,
    averageResponseHours: avgResponse[0]?.value ? Number(avgResponse[0].value.toFixed(1)) : null,
  });
}
