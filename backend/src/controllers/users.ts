import { Response } from 'express';

import { User } from '../models/User.js';
import { Grievance } from '../models/Grievance.js';
import { Officer } from '../models/Officer.js';
import { Department } from '../models/Department.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

export async function profile(
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

  const userId = req.params.id ?? req.user.id;

  const user = await User.findById(userId)
    .select('name username email role governmentId profileImage');

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (user.role === 'citizen') {
    const [total, resolved, pending, inProgress] = await Promise.all([
      Grievance.countDocuments({ userId: user._id }),
      Grievance.countDocuments({ userId: user._id, status: 'RESOLVED' }),
      Grievance.countDocuments({ userId: user._id, status: { $in: ['SUBMITTED', 'AI_PROCESSED', 'ASSIGNED', 'ACKNOWLEDGED', 'REOPENED', 'RESOLUTION_SUBMITTED', 'VERIFICATION'] } }),
      Grievance.countDocuments({ userId: user._id, status: 'IN_PROGRESS' }),
    ]);
    return ok(res, { ...user.toObject(), stats: { total, resolved, pending, inProgress } });
  }

  if (user.role === 'officer') {
    const officer = await Officer.findOne({ userId: user._id })
      .populate('departmentIds', 'name code')
      .lean();
    const [assigned, resolved, pending, inProgress] = await Promise.all([
      officer ? Grievance.countDocuments({ officerId: officer._id }) : 0,
      officer ? Grievance.countDocuments({ officerId: officer._id, status: 'RESOLVED' }) : 0,
      officer ? Grievance.countDocuments({ officerId: officer._id, status: { $in: ['ASSIGNED', 'ACKNOWLEDGED', 'REOPENED', 'RESOLUTION_SUBMITTED', 'VERIFICATION'] } }) : 0,
      officer ? Grievance.countDocuments({ officerId: officer._id, status: 'IN_PROGRESS' }) : 0,
    ]);
    return ok(res, {
      ...user.toObject(),
      officer: officer ? {
        employeeId: officer.employeeId,
        active: officer.active,
        departments: officer.departmentIds,
      } : null,
      stats: { assigned, resolved, pending, inProgress },
    });
  }

  const [totalGrievances, activeGrievances, officers, aiReviewQueue] = await Promise.all([
    Grievance.countDocuments(),
    Grievance.countDocuments({ status: { $nin: ['RESOLVED', 'REJECTED'] } }),
    User.countDocuments({ role: 'officer', blocked: false }),
    Grievance.countDocuments({ aiHumanReview: true, status: { $in: ['SUBMITTED', 'AI_PROCESSED'] } }),
  ]);
  const departments = await Department.countDocuments({ active: true });
  return ok(res, {
    ...user.toObject(),
    stats: { totalGrievances, activeGrievances, officers, aiReviewQueue, departments },
  });
}

export async function search(
  req: AuthRequest,
  res: Response,
) {
  const query = String(
    req.query.username ??
      req.query.search ??
      '',
  ).trim();

  const filter = query
    ? {
        $or: [
          {
            username: {
              $regex: query,
              $options: 'i',
            },
          },
          {
            name: {
              $regex: query,
              $options: 'i',
            },
          },
        ],
      }
    : {};

  const users = await User.find(filter)
    .select(
      'name username profileImage role',
    )
    .limit(20)
    .lean();

  return ok(res, users);
}

export async function update(
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

  const allowedFields = [
    'name',
    'email',
    'profileImage',
  ] as const;

  const patch: Partial<{
    name: string;
    email: string;
    profileImage: string;
  }> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      patch[field] = req.body[field];
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError(
      400,
      'NO_UPDATE_FIELDS',
      'No valid fields provided for update',
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    patch,
    {
      new: true,
      runValidators: true,
    },
  )
    .select(
      'name username email role emailVerified profileImage',
    )
    .lean();

  if (!user) {
    throw new AppError(
      404,
      'USER_NOT_FOUND',
      'User not found',
    );
  }

  return ok(res, user);
}