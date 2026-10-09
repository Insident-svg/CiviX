/**
 * Tests for src/utils/jwt.ts
 * Covers: signToken(), verifyToken()
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Set the env vars BEFORE importing jwt (env.ts reads them at module load)
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'super-secret-key-that-is-at-least-32-chars!!';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.BACKEND_URL = 'http://localhost:5000';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
    });

describe('JWT utilities', async () => {
  const { signToken, verifyToken } = await import('../../src/utils/jwt.js');

  it('signs and verifies a token round-trip', () => {
    const token = signToken('user123', 'citizen');
    const payload = verifyToken(token);
    expect(payload.id).toBe('user123');
    expect(payload.role).toBe('citizen');
  });

  it('works for all roles', () => {
    for (const role of ['citizen', 'officer', 'admin'] as const) {
      const token = signToken('uid', role);
      expect(verifyToken(token).role).toBe(role);
    }
  });

  it('throws when the token is tampered', () => {
    const token = signToken('u1', 'citizen');
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('throws when the token is completely invalid', () => {
    expect(() => verifyToken('not.a.real.token')).toThrow();
  });
});

