# CiviX UI / Feed / Profile Fixes

## Applied fixes

1. **Voice input**
   - Voice is recorded only from the Description step using **Speak instead**.
   - Evidence step exposes only Photo and Video upload controls.
   - Voice media remains attached to the grievance and is sent to the AI engine for transcription/classification/routing.

2. **Vote integrity**
   - Existing compound unique vote index remains enforced: one vote per user per public post.
   - Vote up/down switching and removal are handled atomically by the backend.

3. **Public-feed priority**
   - Normal public feed sorts by `engagementScore` descending, then impact, then newest.
   - `engagementScore = upvotes + downvotes + comments`.
   - Nearby feed remains geographic rather than engagement sorted.

4. **Nearby radius**
   - Nearby feeds and the Home nearby section use a 5 km radius.
   - Home now explicitly requests `type=nearby` so the backend applies the geospatial filter.

5. **Department filter**
   - Trending tab was removed.
   - Category tab was replaced with Department.
   - Department dropdown includes all seeded CiviX departments and filters the public feed server-side.

6. **Profile statistics**
   - Citizen profiles count the citizen's own grievances.
   - Officer profiles show assigned/pending/in-progress/resolved work.
   - Admin profiles show total/active grievances, officers, and AI-review queue counts.

7. **Government login**
   - Login page already contains a Government mode.
   - Government users sign in with Government ID + password.
   - Admin-created government accounts return their Government ID after creation.
   - Seeded local development officer accounts are created by `npm run seed`.

8. **Role-specific profiles**
   - Officer and Admin now have separate Profile navigation entries and role-specific profile layouts.

9. **Google profile image**
   - Google `picture` is saved as `profileImage` during Google authentication.
   - Existing Google-linked accounts update the stored picture on subsequent Google sign-ins.
   - Frontend avatars now render `profileImage` when available.

10. **Typography**
    - Entire frontend now uses **Noto Sans**.

11. **Public grievance copy**
    - Typed reports keep the original input as the public heading.
    - AI generates the short public description.
    - Voice-only reports receive an AI-generated heading and short description from the voice transcript.
    - The AI prompt now explicitly forbids repeating the heading/report as the summary and performs a second rewrite if necessary.
    - Older records whose stored summary is identical to their title/raw text use a non-duplicating display fallback until they are reprocessed.

12. **Search clearing**
    - Search state is no longer restored from old localStorage on startup.
    - Clearing the search removes the persisted search value and immediately refreshes the feed.
    - A clear `×` control is shown while a query is present.

13. **Theme persistence**
    - Dark/light theme is stored in `localStorage` and restored after refresh/reopen.

## Local government login

After `npm run seed` in `backend`, seeded officer Government IDs include:

- `CIVIX-OFFICER-PWD`
- `CIVIX-OFFICER-WATER`
- `CIVIX-OFFICER-SANITATION`
- `CIVIX-OFFICER-ELECTRICAL`
- `CIVIX-OFFICER-SEWERAGE`
- `CIVIX-OFFICER-TRAFFIC`
- `CIVIX-OFFICER-POLICE`
- `CIVIX-OFFICER-HEALTH`
- `CIVIX-OFFICER-OTHER`

The development seed defines a shared officer password. Change it before any public deployment.

The initial admin Government ID/password are controlled by `INITIAL_ADMIN_GOVERNMENT_ID` and `INITIAL_ADMIN_PASSWORD` in the backend environment.
