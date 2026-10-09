/**
 * Tests for src/middleware/auth.ts
 * Covers: auth(), requireRoles()
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

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

describe('auth middleware', async () => {
  const { signToken } = await import('../../src/utils/jwt.js');
  const { auth, requireRoles } = await import('../../src/middleware/auth.js');
  const { AppError } = await import('../../src/utils/http.js');

  function makeReq(authHeader?: string) {
    return {
      headers: { authorization: authHeader },
    } as any;
  }

  it('sets req.user when token is valid', () => {
    const token = signToken('abc123', 'citizen');
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();
    auth(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'abc123', role: 'citizen' });
  });

  it('calls next(AppError 401) when no authorization header', () => {
    const req = makeReq();
    const next = vi.fn();
    auth(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
  });

  it('calls next(AppError 401) when header does not start with Bearer', () => {
    const req = makeReq('Token abc');
    const next = vi.fn();
    auth(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
  });

  it('calls next(AppError 401 INVALID_TOKEN) when token is bad', () => {
    const req = makeReq('Bearer this.is.garbage');
    const next = vi.fn();
    auth(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('INVALID_TOKEN');
  });
});

describe('requireRoles middleware', async () => {
  const { requireRoles } = await import('../../src/middleware/auth.js');
  const { AppError } = await import('../../src/utils/http.js');

  it('calls next() when user role matches', () => {
    const req = { user: { id: 'x', role: 'officer' } } as any;
    const next = vi.fn();
    requireRoles('officer', 'admin')(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(AppError 403) when role does not match', () => {
    const req = { user: { id: 'x', role: 'citizen' } } as any;
    const next = vi.fn();
    requireRoles('officer', 'admin')(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
  });

  it('calls next(AppError 401) when there is no user', () => {
    const req = {} as any;
    const next = vi.fn();
    requireRoles('admin')(req, {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
  });
});

