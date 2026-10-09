import nodemailer from 'nodemailer';
import crypto from 'node:crypto';
import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateDir = path.resolve(__dirname, '../templates/emails');

const transporter = nodemailer.createTransport({
  host: env.BREVO_SMTP_HOST,
  port: env.BREVO_SMTP_PORT,
  secure: env.BREVO_SMTP_PORT === 465,
  auth: {
    user: env.BREVO_SMTP_USER,
    pass: env.BREVO_SMTP_KEY,
  },
});

export function createSecureToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

async function renderTemplate(fileName: string, data: Record<string, unknown>) {
  return ejs.renderFile(path.join(templateDir, fileName), data);
}

async function sendMail(to: string, subject: string, template: string, data: Record<string, unknown>) {
  const html = await renderTemplate(template, data);

  await transporter.sendMail({
    from: {
      name: env.MAIL_FROM_NAME,
      address: env.MAIL_FROM_EMAIL,
    },
    to,
    subject,
    html,
  });
}

export async function verifySmtpConnection() {
  await transporter.verify();
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string,
) {
  await sendMail(
    to,
    'Verify your CiviX email address',
    'verify-email.ejs',
    { name, verificationUrl, expiresMinutes: env.EMAIL_VERIFICATION_EXPIRES_MINUTES },
  );
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
) {
  await sendMail(
    to,
    'Reset your CiviX password',
    'reset-password.ejs',
    { name, resetUrl, expiresMinutes: env.PASSWORD_RESET_EXPIRES_MINUTES },
  );
}
