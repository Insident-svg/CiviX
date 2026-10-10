import { randomBytes } from 'node:crypto';
import { Grievance } from '../models/Grievance.js';
import { GamificationEvent } from '../models/GamificationEvent.js';
import { CivicCertificate } from '../models/CivicCertificate.js';
import { User } from '../models/User.js';
import { notify } from './notifications.js';

type BadgeDefinition = { id: string; name: string; description: string; icon: string; threshold: number; category?: string; kind?: string };

export const BADGES: BadgeDefinition[] = [
  { id: 'newbie', name: 'Newbie', description: 'Your CiviX journey starts here. Resolve your first verified report to earn the next badge.', icon: 'badge-check', threshold: 0, kind: 'starter' },
  { id: 'first-fix', name: 'First Fix', description: 'Your first report has been resolved.', icon: 'check-circle-2', threshold: 1 },
  { id: 'pothole-hunter', name: 'Road Advocate', description: 'Help resolve 3 road-related issues.', icon: 'construction', threshold: 3, category: 'road' },
  { id: 'five-fixes', name: 'Community Contributor', description: 'Help resolve 5 civic issues.', icon: 'handshake', threshold: 5 },
  { id: 'ten-fixes', name: 'Ward Champion', description: 'Help resolve 10 civic issues.', icon: 'award', threshold: 10 },
  { id: 'twenty-five-fixes', name: 'City Guardian', description: 'Help resolve 25 civic issues.', icon: 'shield-check', threshold: 25 },
  { id: 'steady-citizen', name: 'Consistent Contributor', description: 'Earn resolution rewards on 3 consecutive days.', icon: 'flame', threshold: 3, kind: 'streak' },
  { id: 'light-bringer', name: 'Light Bringer', description: 'Help resolve 3 street-light issues.', icon: 'lightbulb', threshold: 3, category: 'street light' },
  { id: 'clean-streets', name: 'Clean Streets', description: 'Help resolve 3 sanitation or garbage issues.', icon: 'spray-can', threshold: 3, category: 'sanitation' },
  { id: 'water-watcher', name: 'Water Watcher', description: 'Help resolve 3 water-supply issues.', icon: 'droplets', threshold: 3, category: 'water' },
  { id: 'eagle-eye', name: 'Eagle Eye', description: 'Submit 10 civic reports that are verified by the community.', icon: 'eye', threshold: 10, kind: 'reports' },
  { id: 'closer', name: 'Closer', description: 'Confirm 5 officer resolutions with photo evidence.', icon: 'check-square', threshold: 5, kind: 'resolution-evidence' },
] as const;

export const LEVELS = [
  { name: 'Newcomer', minResolved: 0 },
  { name: 'Active Citizen', minResolved: 3 },
  { name: 'Ward Champion', minResolved: 10 },
  { name: 'City Guardian', minResolved: 25 },
] as const;

/** Called only after the existing grievance workflow marks a report RESOLVED. */
export async function awardResolvedGrievance(grievanceId: string) {
  const grievance = await Grievance.findById(grievanceId).select('userId status category grievanceId');
  if (!grievance || grievance.status !== 'RESOLVED') return { awarded: false, reason: 'not_resolved' };
  const user = await User.findById(grievance.userId).select('role name');
  if (!user || user.role !== 'citizen') return { awarded: false, reason: 'not_citizen' };

  // Unique grievanceId is the idempotency key: reopening/re-resolving cannot farm points.
  try {
    await GamificationEvent.create({ userId: grievance.userId, grievanceId: grievance._id, points: 50, reason: 'verified_resolution' });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) return { awarded: false, reason: 'already_rewarded' };
    throw error;
  }

  await notify(String(grievance.userId), 'Civic impact unlocked! 🎉', `Thank you for helping your community. ${grievance.grievanceId} was resolved and you earned 50 Civic Points.`, String(grievance._id), 'system');
  return { awarded: true, points: 50 };
}

function longestConsecutiveDayRun(dates: Date[]) {
  const days = [...new Set(dates.map(d => d.toISOString().slice(0, 10)))].sort();
  let best = 0; let current = 0; let previous = '';
  for (const day of days) {
    const prior = previous ? new Date(`${previous}T00:00:00.000Z`) : null;
    const now = new Date(`${day}T00:00:00.000Z`);
    current = prior && (now.getTime() - prior.getTime() === 86400000) ? current + 1 : 1;
    best = Math.max(best, current); previous = day;
  }
  return { current: current && days.length && days[days.length - 1] === new Date().toISOString().slice(0, 10) ? current : 0, longest: best };
}

export async function getGamificationProfile(userId: string) {
  const [user, events, resolvedReports, roadReports, lightReports, sanitationReports, waterReports, submittedReports] = await Promise.all([
    User.findById(userId).select('name username role').lean(),
    GamificationEvent.find({ userId }).sort({ awardedAt: 1 }).select('points grievanceId awardedAt').lean(),
    Grievance.countDocuments({ userId, status: 'RESOLVED' }),
    Grievance.countDocuments({ userId, status: 'RESOLVED', category: { $regex: 'road', $options: 'i' } }),
    Grievance.countDocuments({ userId, status: 'RESOLVED', category: { $regex: 'light', $options: 'i' } }),
    Grievance.countDocuments({ userId, status: 'RESOLVED', category: { $regex: 'sanitation|garbage|waste', $options: 'i' } }),
    Grievance.countDocuments({ userId, status: 'RESOLVED', category: { $regex: 'water', $options: 'i' } }),
    Grievance.countDocuments({ userId }),
  ]);
  if (!user) throw new Error('User not found');
  const points = events.reduce((sum, e) => sum + e.points, 0);
  const streak = longestConsecutiveDayRun(events.map(e => new Date(e.awardedAt)));
  const levelIndex = LEVELS.reduce((idx, level, i) => resolvedReports >= level.minResolved ? i : idx, 0);
  const badges = BADGES.map(badge => {
    const categoryCounts: Record<string, number> = { road: roadReports, 'street light': lightReports, sanitation: sanitationReports, water: waterReports };
    const earned = badge.kind === 'starter' ? true : badge.kind === 'streak' ? streak.longest >= 3 : badge.kind === 'reports' ? submittedReports >= badge.threshold : badge.kind === 'resolution-evidence' ? events.length >= badge.threshold : badge.category ? (categoryCounts[badge.category] ?? 0) >= badge.threshold : resolvedReports >= badge.threshold;
    return { ...badge, earned, earnedAt: earned ? (badge.kind === 'starter' ? (events[0]?.awardedAt ?? null) : (events[events.length - 1]?.awardedAt ?? null)) : null };
  });
  return {
    user: { id: String(userId), name: user.name, username: user.username },
    points, resolvedReports, verifiedResolutionCount: events.length,
    level: LEVELS[levelIndex], nextLevel: LEVELS[levelIndex + 1] ?? null,
    streak, badges, recentActivity: events.slice(-5).reverse().map(event => ({ points: event.points, awardedAt: event.awardedAt, grievanceId: event.grievanceId, reason: 'Report validated' })),
    currentBadge: [...badges].filter(badge => badge.earned).sort((a, b) => {
      const aProgress = a.kind === 'starter' ? 0 : a.kind === 'streak' ? (streak.longest >= 3 ? 3 : 0) : a.id === 'pothole-hunter' ? roadReports : resolvedReports;
      const bProgress = b.kind === 'starter' ? 0 : b.kind === 'streak' ? (streak.longest >= 3 ? 3 : 0) : b.id === 'pothole-hunter' ? roadReports : resolvedReports;
      return bProgress - aProgress;
    })[0] ?? null,
    impact: { issuesResolved: resolvedReports, estimatedPeopleHelped: Math.min(resolvedReports * 200, 10000), methodology: 'Planning estimate: 200 people per resolved issue, capped at 10,000. This is an estimate, not a measured unique-person count.' },
  };
}

export async function getLeaderboard(limit = 10) {
  const rows = await GamificationEvent.aggregate([
    { $group: { _id: '$userId', points: { $sum: '$points' }, resolvedReports: { $sum: 1 } } },
    { $sort: { points: -1, resolvedReports: -1, _id: 1 } }, { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.blocked': { $ne: true }, 'user.role': 'citizen' } },
    { $project: { _id: 0, userId: { $toString: '$_id' }, name: '$user.name', username: '$user.username', points: 1, resolvedReports: 1 } },
  ]);
  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}

export async function listCertificates(userId: string) {
  const [count, profile, existing] = await Promise.all([
    Grievance.countDocuments({ userId, status: 'RESOLVED' }),
    getGamificationProfile(userId),
    CivicCertificate.find({ userId }).sort({ issuedAt: -1 }).lean(),
  ]);
  const milestones = [5, 10, 25, 50, 100];
  for (const milestone of milestones.filter(m => count >= m && !existing.some(c => c.resolvedReports === m))) {
    try {
      await CivicCertificate.create({ userId, code: `CIVIX-${milestone}-${randomBytes(5).toString('hex').toUpperCase()}`, title: 'Civic Impact Certificate', description: `Recognising meaningful civic contributions through ${milestone} resolved reports.`, resolvedReports: milestone, pointsAtIssue: profile.points });
    } catch (error) { if ((error as { code?: number })?.code !== 11000) throw error; }
  }
  return CivicCertificate.find({ userId }).sort({ issuedAt: -1 }).lean();
}

export async function getChallenges() {
  const now = new Date();
  const month = now.getMonth();
  const seasonal = month >= 5 && month <= 8
    ? { id: 'monsoon-pothole-drive', name: 'Monsoon Pothole Drive', description: 'Help get road hazards verified and resolved during monsoon season.', badge: 'Monsoon Defender', categories: ['road'], active: true }
    : month === 9 || month === 10
      ? { id: 'clean-diwali', name: 'Clean Diwali', description: 'Help keep public spaces clean and safe during the festive season.', badge: 'Clean Diwali Champion', categories: ['sanitation'], active: true }
      : { id: 'better-neighborhood', name: 'Better Neighborhood', description: 'Help your neighborhood close verified civic issues.', badge: 'Neighborhood Helper', categories: [], active: true };
  const [total, resolved] = await Promise.all([
    Grievance.countDocuments({ status: { $nin: ['REJECTED'] }, ...(seasonal.categories.length ? { category: { $in: seasonal.categories } } : {}) }),
    Grievance.countDocuments({ status: 'RESOLVED', ...(seasonal.categories.length ? { category: { $in: seasonal.categories } } : {}) }),
  ]);
  return [{ ...seasonal, totalIssues: total, resolvedIssues: resolved, progressPercent: total ? Math.round(resolved / total * 100) : 0, scope: 'citywide', note: 'Progress counts issues currently in the selected category; this is not a ward-specific promise or an official service-level target.' }];
}
