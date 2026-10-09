# CiviX session, navigation loading, and routing bundle

This bundle retains the AI 9-department routing and admin department grievance-count fixes from the source archive.

## Added
- Persist the authenticated user and current screen across browser refreshes.
- Restore the cached session immediately, then validate it with `/api/auth/me`.
- Log out automatically only for a real HTTP 401 from `/api/auth/me`; temporary network/5xx errors no longer destroy the local session.
- Persist dashboard/feed/profile/etc. navigation in `localStorage` so refresh returns to the same workspace.
- Add a thin top-of-browser CiviX loading bar during page navigation and API-backed loading.
- Add a small secure session-restoration state while authentication is being validated.
- No frontend layout/components were redesigned.

## Department routing/counts retained
- Exactly 9 AI routing departments, including Healthcare.
- AI routes directly to the department officer.
- Admin department counts use `departmentId` with a legacy `departments` code fallback.
