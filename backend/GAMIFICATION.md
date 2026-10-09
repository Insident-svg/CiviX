# CiviX Light Gamification — rules and API

## Product rules

- **Impact over volume:** submitting, voting on, commenting on, or repeatedly editing a report earns no points. A citizen receives 50 Civic Points only after the existing workflow sets their grievance to `RESOLVED`.
- **One reward per grievance:** the immutable `GamificationEvent.grievanceId` unique index is the idempotency key. Reopening and resolving the same grievance again cannot award another reward.
- **No self-awarding:** only the existing officer resolution-photo workflow or the existing resolution-verification workflow can trigger rewards. The gamification endpoints never accept client-supplied points, badge unlocks, or impact values.
- **Keep reporting accessible:** no penalty for submitting a report that is still pending, is reopened, or is rejected. Do not encourage citizens to wait to report urgent hazards.
- **Levels:** Newcomer (0 resolved), Active Citizen (3), Ward Champion (10), City Guardian (25).
- **Badges:** First Fix (1 resolved), Pothole Hunter (3 resolved road-category issues), Community Helper (5), Ward Champion (10), City Guardian (25), Steady Citizen (reward activity on 3 consecutive calendar days).
- **Impact estimate:** current estimate is 200 people per resolved issue, capped at 10,000. It is labelled an estimate and must not be represented as a verified unique-person count. Replace this coefficient with ward population/incident exposure data when a trusted source is available.
- **Certificates:** automatically issued when a citizen opens the certificates endpoint after reaching 5, 10, 25, 50, or 100 resolved reports. Certificates have unique IDs and server-issued timestamps. This API issues certificate records, not a downloadable PDF or an official government credential.
- **Challenges:** seasonal citywide challenge progress is derived from current grievance statuses in the target category. Ward/RWA/college competitions and 100%-resolved goals require reliable group membership, ward denominators and a defined challenge period before they should be presented as competitive rankings.

## Authenticated APIs

All routes are under `/api` and require the existing bearer-token authentication.

- `GET /api/gamification/me` — points, level, badges, streak, impact summary. Citizen accounts only.
- `GET /api/gamification/leaderboard?limit=10` — aggregate resolved-report points, max 50 rows.
- `GET /api/gamification/challenges` — active seasonal challenge and aggregate progress. Citizen accounts only.
- `GET /api/gamification/certificates` — issue eligible milestone certificate records, then return the user's certificates. Citizen accounts only.
- `GET /api/public/certificates/:code` — public validity lookup exposing only the certificate verification fields.

## Data model

- `GamificationEvent` is an append-only reward ledger. The unique grievance index prevents duplicate awards.
- `CivicCertificate` stores milestone certificate metadata; a unique `(userId, resolvedReports)` index prevents duplicate milestones.
- Existing `User`, `Grievance`, `Notification`, and resolution evidence remain the source of truth. No points are stored in user-editable profile fields.

## Deployment / validation

No new environment variables or packages are required. MongoDB creates the indexes through Mongoose model initialization. Deploy the backend and frontend together; the profile page uses the new APIs but existing profile and grievance flows remain available. Run `npm ci`, `npm run build`, and `npm test` from `backend/`; run the frontend's package-manager build command from `frontend/`. Test a report through resolution, retry the resolution action, and verify only one 50-point ledger event exists. Also test reopened/re-resolved reports and non-citizen access.


## SLA configuration

Administrators can manage severity-based SLA policies in the **SLA Configuration** screen. Rules may be global defaults or department-specific overrides. Department rules take precedence; if a department rule is disabled or absent, the service falls back to the active global rule. The management API is `GET/POST /api/admin/sla-configs`, `PATCH /api/admin/sla-configs/:id`, and `DELETE /api/admin/sla-configs/:id` (soft-disables a rule). Only admins can manage these rules. Changes affect newly assigned deadlines; existing grievance deadlines are not automatically recalculated.

## Environment files

Copy each service's `.env.example` to `.env` (frontend: `.env.local` is also suitable) and replace all placeholder secrets/keys. Never commit real `.env` files.
