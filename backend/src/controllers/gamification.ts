import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';
import { getChallenges, getGamificationProfile, getLeaderboard, listCertificates } from '../services/gamification.js';

function requireUser(req: AuthRequest) {
  if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  if (req.user.role !== 'citizen') throw new AppError(403, 'CITIZEN_ONLY', 'Gamification is available to citizen accounts');
  return req.user;
}

export async function profile(req: AuthRequest, res: Response) {
  const user = requireUser(req);
  return ok(res, await getGamificationProfile(user.id));
}

export async function leaderboard(req: AuthRequest, res: Response) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  if (!Number.isFinite(limit)) throw new AppError(400, 'INVALID_LIMIT', 'limit must be a number between 1 and 50');
  return ok(res, await getLeaderboard(limit));
}

export async function challenges(req: AuthRequest, res: Response) {
  requireUser(req);
  return ok(res, await getChallenges());
}

export async function certificates(req: AuthRequest, res: Response) {
  const user = requireUser(req);
  return ok(res, await listCertificates(user.id));
}

/** Public certificate lookup exposes only the certificate's public verification fields. */
export async function verifyCertificate(req: AuthRequest, res: Response) {
  const { CivicCertificate } = await import('../models/CivicCertificate.js');
  const certificate = await CivicCertificate.findOne({ code: String(req.params.code ?? '').toUpperCase() })
    .select('code title description resolvedReports pointsAtIssue issuedAt')
    .lean();
  if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
  return ok(res, { valid: true, certificate });
}
