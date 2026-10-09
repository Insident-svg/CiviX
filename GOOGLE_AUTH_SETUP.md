# CiviX Google Sign-In setup

## What was added

- `POST /api/auth/google` backend endpoint.
- Server-side verification of the Google ID token signature and claims using the official `google-auth-library` `OAuth2Client.verifyIdToken()` flow.
- Existing CiviX accounts are found by verified Google email and linked instead of duplicated.
- Existing Google-linked accounts are found by `googleId`.
- New Google users receive a unique username from their Google name/email.
- Google users are marked `emailVerified: true`.
- Existing email/password login and Brevo verification remain unchanged.
- React login/register screens show Google's Continue with Google button below the normal form.

## Google Cloud Console

Create a Google OAuth client of type **Web application**.

Add these Authorized JavaScript origins:

Local:
- `http://localhost:5173`

Demo/production:
- `https://YOUR-VERCEL-DOMAIN.vercel.app`

If you use a custom domain, add that origin too.

This implementation uses Google Identity Services to return an ID token directly to the frontend. The backend verifies that ID token with Google's official Node.js authentication library. You do not put a Google client secret in the frontend, and this credential flow does not require a traditional OAuth redirect URI.

## Environment variables

Frontend (`frontend/.env` locally; Vercel Environment Variables in deployment):

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID
```

Backend (`backend/.env` locally; Render Environment Variables in deployment):

```env
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID
```

Use the same Web Client ID in both places.

## Vercel + Render

For demo deployment:

- Vercel frontend environment: `VITE_API_URL=https://YOUR-BACKEND.onrender.com`
- Vercel frontend environment: `VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID`
- Render backend environment: `FRONTEND_URL=https://YOUR-FRONTEND.vercel.app`
- Render backend environment: `GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID`

Never put a Google client secret in the frontend.

## Account behavior

1. User registers with email/password -> normal CiviX verification email is sent.
2. User clicks Continue with Google -> Google verifies the account.
3. If `googleId` exists -> open that existing CiviX account.
4. Otherwise, if the verified Google email already exists -> link Google to that existing CiviX account and open it.
5. Otherwise -> create a new CiviX account.
6. In all successful Google cases, CiviX issues its normal JWT and uses the same dashboard/session flow.

## Testing checklist

- New Google account creates exactly one CiviX user.
- Repeat Google login opens the same user.
- Existing email/password user using the same verified Google email is linked, not duplicated.
- Email/password login still works.
- Brevo verification still works for normal registration.
- Blocked accounts cannot use Google login.
- Wrong Google client ID/token is rejected.
- Vercel frontend can call the Render backend without CORS errors.


## Important frontend configuration

The Citizen login Google button is rendered by Google Identity Services. The frontend must have the same Web OAuth client ID as the backend. Create `frontend/.env` from `.env.example` and set:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

After changing a Vite environment variable, **restart the frontend dev server**.

The Google button is intentionally available only for Citizen login. Government accounts use Government ID + password.

### Citizen/Government toggle

The Google Identity Services initialization depends on the selected login mode. CiviX reinitializes the Google button when switching between Government and Citizen so the button appears immediately after selecting Citizen.
