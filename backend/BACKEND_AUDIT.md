# CiviX Backend Authentication Update

## Current authentication flow

- Mobile-number OTP / MSG91 authentication has been removed.
- Registration requires `name`, `username`, `email`, and `password`.
- Nodemailer sends transactional email through Brevo SMTP.
- EJS templates generate verification and password-reset emails.
- Email verification tokens are random, single-use, hashed before database storage, and expire.
- Password-reset tokens use the same one-time hashed-token pattern.
- Login requires `emailVerified === true`.
- Grievance creation also requires verified email.
- SMTP credentials are never exposed to the frontend.

## Email endpoints

- `POST /api/auth/register`
- `GET /api/auth/verify-email/:token` (new links)
- `GET /api/auth/verify-email?token=...` (legacy-link compatibility)
- `POST /api/auth/resend-verification`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Required Brevo environment

See `backend/.env.example`.

Required production values:
- `BREVO_SMTP_HOST=smtp-relay.brevo.com`
- `BREVO_SMTP_PORT=587`
- `BREVO_SMTP_USER=<Brevo SMTP login>`
- `BREVO_SMTP_KEY=<Brevo SMTP key>`
- `MAIL_FROM_NAME=CiviX`
- `MAIL_FROM_EMAIL=<verified sender address>`

The source handoff intentionally excludes `.env` and local dependency directories.
