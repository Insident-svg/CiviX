import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { audit } from '../services/audit.js';
import { AppError, ok } from '../utils/http.js';
import { AuthRequest } from '../types/index.js';
import { env } from '../config/env.js';
import {
  createSecureToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/email.service.js';

const registerSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}


const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

async function verifyGoogleCredential(credential: string) {
  if (!credential) throw new Error('Google credential is missing');

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error('Google token payload is missing');

  const issuerValid =
    payload.iss === 'https://accounts.google.com' ||
    payload.iss === 'accounts.google.com';

  if (!issuerValid) throw new Error('Invalid Google token issuer');
  if (!payload.sub) throw new Error('Google account ID is missing');
  if (!payload.email) throw new Error('Google account email is missing');
  if (payload.email_verified !== true) {
    throw new Error('Google account email is not verified');
  }

  return payload;
}


const googleLoginSchema = z.object({
  credential: z.string().min(1),
});

function makeBaseUsername(name: string, email: string) {
  const fromName = name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 20);
  const fromEmail = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 20);
  return (fromName || fromEmail || 'civixuser').slice(0, 30);
}

async function uniqueUsername(name: string, email: string) {
  const base = makeBaseUsername(name, email).slice(0, 24);
  let username = base;
  let suffix = 0;
  while (await User.exists({ username })) {
    suffix += 1;
    username = `${base}_${suffix}`.slice(0, 30);
  }
  return username;
}

function verificationUrl(token: string) {
  // Keep the token in the URL path instead of the query string.
  // Some email security/link-tracking layers rewrite query parameters,
  // which can invalidate one-time verification links.
  return `${env.BACKEND_URL}/api/auth/verify-email/${encodeURIComponent(token)}`;
}

function passwordResetUrl(token: string, email: string) {
  return `${env.FRONTEND_URL}/?screen=reset&token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

export async function register(req: Request, res: Response) {
  const data = registerSchema.parse(req.body);
  const username = data.username.toLowerCase();
  const email = data.email.toLowerCase();

  const existingUser = await User.exists({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new AppError(409, 'USER_EXISTS', 'Username or email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const { token, hash } = createSecureToken();

  let user;
  try {
    user = await User.create({
      name: data.name,
      username,
      email,
      passwordHash,
      emailVerified: false,
      emailVerificationTokenHash: hash,
      emailVerificationExpiresAt: new Date(
        Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000,
      ),
    });
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError(409, 'USER_EXISTS', 'Username or email already exists');
    throw error;
  }

  try {
    await sendVerificationEmail(user.email, user.name, verificationUrl(token));
  } catch (error) {
    await User.findByIdAndDelete(user.id);
    console.error('Verification email failed:', error);
    throw new AppError(503, 'EMAIL_SEND_FAILED', 'Unable to send verification email. Please try again.');
  }

  return ok(
    res,
    {
      userId: user.id,
      email: user.email,
      emailVerified: false,
      message: 'Account created. Check your email to verify your account.',
    },
    201,
  );
}

export async function verifyEmail(req: Request, res: Response) {
  // New links use a path parameter. Keep query-string support for older
  // emails that were already delivered before this change.
  const token = String(req.params.token ?? req.query.token ?? '').trim();

  if (!token) {
    return res.redirect(`${env.FRONTEND_URL}/?emailVerified=error`);
  }

  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    return res.redirect(`${env.FRONTEND_URL}/?emailVerified=expired`);
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return res.redirect(`${env.FRONTEND_URL}/?emailVerified=success`);
}

export async function resendVerificationEmail(req: Request, res: Response) {
  const email = String(req.body.email ?? '').toLowerCase().trim();

  if (!z.string().email().safeParse(email).success) {
    throw new AppError(400, 'INVALID_EMAIL', 'Valid email address is required');
  }

  const user = await User.findOne({ email });

  // Do not reveal whether the email exists.
  if (!user || user.emailVerified) {
    return ok(res, {
      sent: true,
      message: 'If an account requires verification, a new verification email has been sent.',
    });
  }

  const { token, hash } = createSecureToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpiresAt = new Date(
    Date.now() + env.EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000,
  );
  await user.save();

  try {
    await sendVerificationEmail(user.email, user.name, verificationUrl(token));
  } catch (error) {
    console.error('Verification resend failed:', error);
    throw new AppError(503, 'EMAIL_SEND_FAILED', 'Unable to send verification email. Please try again.');
  }

  return ok(res, {
    sent: true,
    message: 'If an account requires verification, a new verification email has been sent.',
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const email = String(req.body.email ?? '').toLowerCase().trim();

  if (!z.string().email().safeParse(email).success) {
    throw new AppError(400, 'INVALID_EMAIL', 'Valid email address is required');
  }

  const user = await User.findOne({ email });

  if (user) {
    const { token, hash } = createSecureToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpiresAt = new Date(
      Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000,
    );
    await user.save();

    try {
      await sendPasswordResetEmail(
        user.email,
        user.name,
        passwordResetUrl(token, user.email),
      );
    } catch (error) {
      console.error('Password reset email failed:', error);
      throw new AppError(503, 'EMAIL_SEND_FAILED', 'Unable to send password reset email. Please try again.');
    }
  }

  return ok(res, {
    sent: true,
    message: 'If an account exists, a password reset link has been sent to the email address.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, email, newPassword } = req.body;

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 100) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Password must be between 8 and 100 characters');
  }

  if (typeof token !== 'string' || !token.trim() || typeof email !== 'string') {
    throw new AppError(400, 'RESET_TOKEN_REQUIRED', 'A valid password reset link is required');
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset link is invalid or expired');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  return ok(res, { reset: true });
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body;

  if (typeof identifier !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'INVALID_INPUT', 'Email and password are required');
  }

  const normalized = identifier.trim();
  const email = normalized.toLowerCase();
  const governmentId = normalized.toUpperCase();
  const user = await User.findOne({
    $or: [{ email }, { governmentId }],
  });

  if (!user || user.blocked || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  // Government accounts authenticate through their governmentId and do not
  // depend on citizen email verification. Citizen accounts still require it.
  if (user.role === 'citizen' && !user.emailVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before logging in');
  }

  // Audit only officer logins. Citizen logins are intentionally excluded
  // because the admin audit log is an operational/security log for staff.
  if (user.role === 'officer') {
    await audit(user.id, user.role, 'LOGIN');
  }

  return ok(res, {
    token: signToken(user.id, user.role),
    user: safeUser(user),
  });
}


export async function googleLogin(req: Request, res: Response) {
  const { credential } = googleLoginSchema.parse(req.body);

  let payload: Record<string, any>;
  try {
    payload = await verifyGoogleCredential(credential);
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google authentication failed');
  }

  const googleId = payload?.sub;
  const email = payload?.email?.toLowerCase().trim();
  const emailVerified = payload?.email_verified === true;

  if (!googleId || !email || !emailVerified) {
    throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google account email could not be verified');
  }

  const name = (payload?.name || email.split('@')[0]).trim().slice(0, 100);
  const profileImage = payload?.picture || undefined;

  let user = await User.findOne({ googleId });

  if (user) {
    if (user.role !== 'citizen') {
      throw new AppError(403, 'GOVERNMENT_LOGIN_REQUIRED', 'Government accounts must use Government ID login');
    }
    if (user.blocked) {
      throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked');
    }
  } else {
    user = await User.findOne({ email });

    if (user) {
      if (user.blocked) {
        throw new AppError(403, 'ACCOUNT_BLOCKED', 'This account has been blocked');
      }

      // The verified Google email matches an existing CiviX account.
      // Link Google to that account instead of creating a duplicate.
      if (user.googleId && user.googleId !== googleId) {
        throw new AppError(409, 'GOOGLE_ACCOUNT_CONFLICT', 'This email is already linked to another Google account');
      }

      user.googleId = googleId;
      user.emailVerified = true;
      if (profileImage) user.profileImage = profileImage;
      await user.save();
    } else {
      const username = await uniqueUsername(name, email);
      user = await User.create({
        name,
        username,
        email,
        passwordHash: null,
        googleId,
        emailVerified: true,
        profileImage: profileImage || null,
      });
    }
  }

  return ok(res, {
    token: signToken(user.id, user.role),
    user: safeUser(user),
  });
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return ok(res, safeUser(user));
}

function safeUser(user: {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  emailVerified: boolean;
  governmentId?: string | null;
  profileImage?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    governmentId: user.governmentId ?? null,
    profileImage: user.profileImage ?? null,
  };
}
