import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  FRONTEND_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),

  AI_SERVICE_URL: z.string().url(),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  AI_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  BREVO_SMTP_HOST: z.string().default('smtp-relay.brevo.com'),
  BREVO_SMTP_PORT: z.coerce.number().int().positive().default(587),
  BREVO_SMTP_USER: z.string().default('brevo-test-user'),
  BREVO_SMTP_KEY: z.string().default('brevo-test-key'),
  MAIL_FROM_NAME: z.string().default('CiviX'),
  MAIL_FROM_EMAIL: z.string().email().default('no-reply@example.com'),

  EMAIL_VERIFICATION_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),

  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().max(100).default(20),

  INITIAL_ADMIN_GOVERNMENT_ID: z.string().default('CIVIX-ADMIN-001'),
  INITIAL_ADMIN_NAME: z.string().default('CiviX Administrator'),
  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@civix.local'),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123!'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
