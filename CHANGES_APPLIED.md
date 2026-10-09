# CiviX – Final Integration Changes

This build incorporates the requested PRD-aligned fixes and the Government ID authentication model.

## 1. Government roles and login
- Added `governmentId` to the `User` MongoDB schema as a sparse unique indexed field.
- Citizen registration remains citizen-only.
- Added Citizen / Government login selector.
- Government login accepts Government ID + password.
- Backend determines `admin` vs `officer` from the stored account role; the client cannot choose the privilege.
- Government accounts do not require citizen email verification.
- Google login is restricted to citizen accounts; government accounts must use Government ID login.
- Added initial-admin seeding through environment variables.
- Added admin APIs/UI to create government accounts.
- Officer accounts automatically receive an `Officer` document with department/ward assignments.
- Government directory displays Government IDs.

## 2. Admin / Officer workspace
- Admin can switch between Admin Workspace and Officer View.
- Admin View contains system management/analytics/audit tools.
- Officer View contains assigned-case operations, SLA, GIS and resolution workflow.
- Backend role checks remain authoritative.

## 3. Government grievance lifecycle
Implemented the PRD lifecycle:

`SUBMITTED → AI_PROCESSED → ASSIGNED → ACKNOWLEDGED → IN_PROGRESS → RESOLUTION_SUBMITTED → VERIFICATION → RESOLVED`

- Officer can acknowledge and start work.
- Officer can submit resolution evidence.
- Officer cannot self-verify or directly close a resolution.
- Citizen can approve the submitted resolution or reopen it.
- Admin can perform authorized government operations.

## 4. Assignment
- Added admin officer directory.
- Added admin grievance assignment endpoint.
- Added officer selector to incident view.
- Assignment changes status to `ASSIGNED` when appropriate.
- Assignment creates audit logs and officer notifications.
- Automatic routing also notifies an automatically selected officer.

## 5. Grievance evidence
- Added dedicated photo, video, voice-recording and voice-upload controls.
- Browser microphone recording uses `MediaRecorder`.
- Video evidence is playable in incident/detail views.
- Audio evidence is playable in incident/detail views.

## 6. Location
- Current GPS remains available.
- Incident location can now be selected by clicking on the map.
- Selected location is stored independently from the user's live location.
- Manual incident-location workflow is therefore supported.

## 7. Post button / composer UI
- Final report CTA changed to `Post Grievance`.
- Added button sizing/flex fixes so post/comment actions do not collapse.
- Added responsive evidence composer styling.

## 8. Login duplicate-resource issue
- Login can resolve either email or Government ID.
- Government accounts are not accidentally treated as citizen accounts.
- Citizen registration catches MongoDB duplicate-key races with a stable `USER_EXISTS` error.
- Google authentication reuses matching citizen accounts instead of creating duplicate accounts.

## 9. Profile synchronization
- Profile is loaded from `/api/users/me`.
- Profile edits update backend and local authenticated user state.
- Profile statistics remain database-derived.

## 10. Graphs and flowcharts
- Admin dashboard includes live resolution-performance graph.
- Analytics includes category and severity visualizations.
- Added government workflow flowchart.
- Incident view displays the current grievance lifecycle visually.

## 11. MongoDB schema changes
### User
Added:
- `governmentId: String`
- unique + sparse index
- uppercase normalization

Existing role remains:
- `citizen`
- `officer`
- `admin`

### Officer
Existing model is used for government operational metadata:
- `userId`
- `departmentIds[]`
- `wardIds[]`
- `employeeId`
- `active`

### Grievance
Uses the PRD lifecycle and routing fields:
- `wardId`
- `departmentId`
- `officerId`
- `status`
- `slaDeadline`
- media types: image/video/voice

No separate GovernmentAccount collection is required because government identity is a role-scoped field on `User`, while officer-specific operational data remains normalized in `Officer`.

## 12. New API endpoints

### Government accounts
- `GET /api/admin/government-accounts`
- `POST /api/admin/government-accounts`

### Assignment
- `PATCH /api/admin/grievances/:id/assign`

### Citizen resolution verification
- `PATCH /api/grievances/:id/verify`

### Existing APIs retained
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/officer/dashboard`
- `PATCH /api/grievances/:id/status`
- `POST /api/grievances/:id/resolution`

## 13. Initial admin setup
Configure these variables in `backend/.env`:

```env
INITIAL_ADMIN_GOVERNMENT_ID=CIVIX-ADMIN-001
INITIAL_ADMIN_NAME=CiviX Administrator
INITIAL_ADMIN_EMAIL=admin@civix.local
INITIAL_ADMIN_PASSWORD=ChangeMe123!
```

Then run:

```bash
cd backend
npm run seed
```

The seed creates/updates the initial administrator as a government account.

**Change the example password before production use.**

## 14. Validation
- Backend TypeScript: PASS
- Frontend TypeScript: PASS
- AI tests: 14/14 PASS
- Production Vite/Vitest execution in this Linux extraction environment is blocked by the archive's missing platform-specific Rolldown native optional dependency. Run `npm ci` on the target OS before production build/test.


## SLA configuration and environment templates

- Added admin-only SLA policy APIs and a new **SLA Configuration** admin screen.
- Supports global severity defaults and department-specific overrides, with active/disabled states and hours editing.
- Added audit log entries for SLA rule creation, updates, and disabling.
- Seed now creates global fallback defaults plus department-level defaults (low 72h, medium 24h, high 12h, critical 4h).
- SLA deadline assignment preserves an already assigned deadline; policy changes do not retroactively rewrite existing grievance deadlines.
- Added `backend/.env.example`, `frontend/.env.example`, and `ai-engine/.env.example`; frontend ignore rules allow the example file to be committed.
- Validation note: dependency installation timed out in this environment, so TypeScript/frontend production builds and end-to-end tests remain unverified.


## Officer workflow reliability fix (2026-10-09)
- Acknowledgement and resolution submission now return success when the core database state is saved even if audit/notification side effects fail.
- Acknowledgement is safe to retry after a lost response.
- Resolution description submission is idempotent after a saved submission, avoiding duplicate evidence records.
