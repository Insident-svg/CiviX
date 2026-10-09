import { Router } from 'express';

import { auth, requireRoles } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { upload } from '../middleware/upload.js';

import * as A from '../controllers/auth.js';
import * as U from '../controllers/users.js';
import * as G from '../controllers/grievances.js';
import * as F from '../controllers/feed.js';
import * as S from '../controllers/social.js';
import * as N from '../controllers/notifications.js';
import * as O from '../controllers/officer.js';
import * as M from '../controllers/map.js';
import * as Media from '../controllers/media.js';
import * as Ops from '../controllers/operations.js';
import * as Assistant from '../controllers/assistant.js';
import * as Gamification from '../controllers/gamification.js';
import * as SLAConfiguration from '../controllers/slaConfig.js';
import * as Emergency from '../controllers/emergency.js';

export const router = Router();

// Emergency response and relief coordination. Citizen intake is separate from staff tools.
router.get('/emergency/overview', auth, Emergency.overview);
router.post('/emergency/reports', auth, Emergency.createReport);
router.post('/emergency/reports/:id/link-incident', auth, requireRoles('officer', 'admin'), Emergency.linkReport);
router.post('/emergency/incidents', auth, requireRoles('officer', 'admin'), Emergency.createIncident);
router.post('/emergency/incidents/:id/activate', auth, requireRoles('officer', 'admin'), Emergency.activateIncident);
router.post('/emergency/resources', auth, requireRoles('officer', 'admin'), Emergency.createResource);
router.post('/emergency/simulate', auth, requireRoles('officer', 'admin'), Emergency.seedSimulation);
router.post('/emergency/allocations/optimize', auth, requireRoles('officer', 'admin'), Emergency.optimize);
router.post('/emergency/allocations/:id/approve', auth, requireRoles('officer', 'admin'), Emergency.approvePlan);
router.patch('/emergency/assignments/:id/status', auth, requireRoles('officer', 'admin'), Emergency.updateAssignment);
router.post('/emergency/relief', auth, requireRoles('officer', 'admin'), Emergency.recordRelief);



router.get('/public/map/incidents', M.publicIncidents);
router.get('/public/stats', Ops.publicStats);

router.post(
  '/auth/register',
  authLimiter,
  A.register,
);

// New verification links use a path parameter so email link tracking cannot
// rewrite the token query string. Keep the query route for older emails.
router.get(
  '/auth/verify-email/:token',
  A.verifyEmail,
);

router.get(
  '/auth/verify-email',
  A.verifyEmail,
);

router.post(
  '/auth/resend-verification',
  authLimiter,
  A.resendVerificationEmail,
);

router.post(
  '/auth/login',
  authLimiter,
  A.login,
);

router.post(
  '/auth/google',
  authLimiter,
  A.googleLogin,
);

router.post(
  '/auth/forgot-password',
  authLimiter,
  A.forgotPassword,
);

router.post(
  '/auth/reset-password',
  authLimiter,
  A.resetPassword,
);

router.get(
  '/auth/me',
  auth,
  A.me,
);

router.post(
  '/auth/logout',
  auth,
  (_req, res) =>
    res.json({
      success: true,
      data: {
        loggedOut: true,
      },
    }),
);

router.post(
  '/media',
  auth,
  upload.array('files', 10),
  Media.uploadMedia,
);

router.get(
  '/users/me',
  auth,
  U.profile,
);

router.get(
  '/users',
  auth,
  U.search,
);

router.get(
  '/users/profile/:id',
  auth,
  U.profile,
);

router.patch(
  '/users/me',
  auth,
  U.update,
);

router.post('/grievances/analyze-preview', auth, G.analyzePreview);

router.post(
  '/grievances',
  auth,
  G.create,
);

router.get(
  '/grievances',
  auth,
  G.list,
);

router.get(
  '/grievances/:id',
  auth,
  G.getOne,
);

router.patch(
  '/grievances/:id/verify',
  auth,
  requireRoles('citizen', 'admin'),
  G.verifyResolution,
);

router.patch(
  '/grievances/:id/status',
  auth,
  requireRoles('officer', 'admin'),
  G.status,
);

router.post(
  '/grievances/:id/resolution',
  auth,
  requireRoles('officer', 'admin'),
  G.resolution,
);

router.post(
  '/grievances/:id/resolution/photo',
  auth,
  requireRoles('officer'),
  G.finalizeResolution,
);

router.post(
  '/grievances/:id/dispute',
  auth,
  G.dispute,
);

router.get(
  '/feed',
  auth,
  F.feed,
);

router.get(
  '/posts',
  auth,
  F.posts,
);

router.get(
  '/votes',
  auth,
  S.getVotes,
);

router.post(
  '/votes',
  auth,
  S.vote,
);

router.delete(
  '/votes',
  auth,
  S.removeVote,
);

router.get(
  '/comments',
  auth,
  S.comments,
);

router.post(
  '/comments',
  auth,
  S.addComment,
);

router.delete(
  '/comments',
  auth,
  S.deleteComment,
);

router.get(
  '/notifications',
  auth,
  N.list,
);

router.patch('/notifications/read-all', auth, N.readAll);

router.patch(
  '/notifications/:id/read',
  auth,
  N.read,
);

router.get(
  '/officer/dashboard',
  auth,
  requireRoles('officer', 'admin'),
  O.dashboard,
);

router.get(
  '/map/incidents',
  auth,
  M.incidents,
);
router.get('/admin/overview', auth, requireRoles('admin'), Ops.overview);
router.get('/admin/system-overview', auth, requireRoles('admin'), Ops.systemOverview);
router.get('/admin/users', auth, requireRoles('admin'), Ops.usersDirectory);
router.get('/admin/government-accounts', auth, requireRoles('admin'), Ops.governmentAccounts);
router.post('/admin/government-accounts', auth, requireRoles('admin'), Ops.createGovernmentAccount);
router.patch('/admin/grievances/:id/assign', auth, requireRoles('admin'), Ops.assignGrievance);
router.get('/admin/departments', auth, requireRoles('admin'), Ops.departmentsDirectory);
router.get('/admin/analytics', auth, requireRoles('admin'), Ops.overview);
router.get('/admin/audit', auth, requireRoles('admin'), Ops.auditLogs);
router.get('/admin/moderation', auth, requireRoles('admin'), Ops.moderation);
router.get('/admin/ai-review', auth, requireRoles('admin'), Ops.aiReview);
router.patch('/admin/ai-review/:id', auth, requireRoles('admin'), Ops.decideAI);
router.patch('/admin/moderation/:id', auth, requireRoles('admin'), Ops.moderatePost);

router.post('/assistant', auth, Assistant.ask);

// Citizen gamification: rewards are computed from resolved grievance records, not submissions.
router.get('/gamification/me', auth, Gamification.profile);
router.get('/gamification/leaderboard', auth, Gamification.leaderboard);
router.get('/gamification/challenges', auth, Gamification.challenges);
router.get('/gamification/certificates', auth, Gamification.certificates);
router.get('/public/certificates/:code', Gamification.verifyCertificate);

// Admin-only SLA policy configuration. Existing deadlines are not retroactively changed.
router.get('/admin/sla-configs', auth, requireRoles('admin'), SLAConfiguration.listSlaConfigs);
router.post('/admin/sla-configs', auth, requireRoles('admin'), SLAConfiguration.createSlaConfig);
router.patch('/admin/sla-configs/:id', auth, requireRoles('admin'), SLAConfiguration.updateSlaConfig);
router.delete('/admin/sla-configs/:id', auth, requireRoles('admin'), SLAConfiguration.deleteSlaConfig);
