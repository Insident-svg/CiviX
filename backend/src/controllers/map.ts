import { Request, Response } from 'express';

import { Grievance } from '../models/Grievance.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';

export async function incidents(
  req: AuthRequest,
  res: Response,
) {
  const query: Record<string, unknown> = {};

  if (req.query.ward) {
    query.wardId = String(req.query.ward);
  }

  if (req.query.category) {
    query.category = String(req.query.category);
  }

  if (req.query.status) {
    query.status = String(req.query.status);
  }

  if (req.query.lat !== undefined && req.query.lng !== undefined) {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const radius = Number(req.query.radius ?? 5000);

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
        'Invalid latitude, longitude, or radius',
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

  const incidents = await Grievance.find(query)
    .select(
      'grievanceId location category severity impactScore status departmentId wardId createdAt',
    )
    .populate(
      'departmentId',
      'name code',
    )
    .populate(
      'wardId',
      'name code',
    )
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  return ok(res, incidents);
}

export async function publicIncidents(req: Request, res: Response) {
  const query: Record<string, unknown> = {};
  if (req.query.lat !== undefined && req.query.lng !== undefined) {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const radius = Number(req.query.radius ?? 15000);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radius) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || radius <= 0) {
      throw new AppError(400, 'INVALID_LOCATION', 'Invalid latitude, longitude, or radius');
    }
    query.location = { $near: { $geometry: { type: 'Point', coordinates: [longitude, latitude] }, $maxDistance: radius } };
  }
  const incidents = await Grievance.find(query)
    .select('grievanceId location category severity impactScore status departmentId wardId createdAt text')
    .populate('departmentId', 'name code')
    .populate('wardId', 'name code')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return ok(res, incidents);
}
