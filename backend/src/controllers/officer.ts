import { Response } from 'express';

import { Officer } from '../models/Officer.js';
import { Grievance } from '../models/Grievance.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

export async function dashboard(
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

  const officer = req.user.role === 'admin' ? null : await Officer.findOne({ userId: req.user.id, active: true });

  if (req.user.role !== 'admin' && !officer) {
    throw new AppError(
      403,
      'NOT_OFFICER',
      'Active officer profile required',
    );
  }

  const baseQuery = req.user.role === 'admin' ? { officerId: { $exists: true, $ne: null } } : { officerId: officer!._id };

  const [
    pending,
    critical,
    inProgress,
    resolved,
  ] = await Promise.all([
    Grievance.countDocuments({
      ...baseQuery,
      status: {
        $in: [
          'ASSIGNED',
          'ACKNOWLEDGED',
        ],
      },
    }),

    Grievance.countDocuments({
      ...baseQuery,
      severity: 'critical',
      status: {
        $nin: ['RESOLVED', 'REJECTED'],
      },
    }),

    Grievance.countDocuments({
      ...baseQuery,
      status: 'IN_PROGRESS',
    }),

    Grievance.countDocuments({
      ...baseQuery,
      status: 'RESOLVED',
    }),
  ]);

  return ok(res, {
    officerId: officer?._id ?? null,
    pending,
    critical,
    inProgress,
    resolved,
  });
}