/**
 * Tests for src/utils/http.ts
 * Covers: AppError, ok(), errorHandler()
 */
import { describe, it, expect, vi } from 'vitest';
import { ZodError, z } from 'zod';
import mongoose from 'mongoose';
import { AppError, asyncHandler, ok, errorHandler } from '../../src/utils/http.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json, _json: json };
}

function makeNext() {
  return vi.fn();
}

// ─── AppError ────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('stores status, code and message', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Resource missing');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource missing');
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
  });

  it('is an instance of Error', () => {
    expect(new AppError(500, 'ERR', 'oops') instanceof Error).toBe(true);
  });
});

// ─── ok() ────────────────────────────────────────────────────────────────────

describe('ok()', () => {
  it('responds with 200 and success:true by default', () => {
    const res = makeRes();
    ok(res as any, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body).toEqual({ success: true, data: { id: 1 } });
  });

  it('uses a custom status code', () => {
    const res = makeRes();
    ok(res as any, 'created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ─── asyncHandler() ──────────────────────────────────────────────────────────

describe('asyncHandler()', () => {
  it('calls next(error) when the wrapped fn rejects', async () => {
    const err = new Error('boom');
    const fn = async () => { throw err; };
    const handler = asyncHandler(fn as any);
    const next = makeNext();
    await handler({} as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('does not call next when the wrapped fn resolves', async () => {
    const fn = async (_req: any, res: any) => { res.end(); };
    const handler = asyncHandler(fn as any);
    const next = makeNext();
    const res = { end: vi.fn() };
    await handler({} as any, res as any, next);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── errorHandler() ──────────────────────────────────────────────────────────

describe('errorHandler()', () => {
  it('handles AppError', () => {
    const res = makeRes();
    const err = new AppError(403, 'FORBIDDEN', 'Not allowed');
    errorHandler(err, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('handles ZodError → 400 VALIDATION_ERROR', () => {
    const res = makeRes();
    let zodErr: ZodError;
    try {
      z.object({ name: z.string() }).parse({ name: 123 });
    } catch (e) {
      zodErr = e as ZodError;
    }
    errorHandler(zodErr!, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it('handles mongoose CastError → 400 INVALID_ID', () => {
    const res = makeRes();
    const castErr = new mongoose.Error.CastError('ObjectId', 'bad-id', '_id');
    errorHandler(castErr, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('INVALID_ID');
  });

  it('handles mongoose ValidationError → 400 DATABASE_VALIDATION_ERROR', () => {
    const res = makeRes();
    const valErr = new mongoose.Error.ValidationError();
    errorHandler(valErr, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('DATABASE_VALIDATION_ERROR');
  });

  it('handles MongoDB duplicate-key error (code 11000) → 409', () => {
    const res = makeRes();
    const dupErr = { code: 11000, message: 'duplicate' };
    errorHandler(dupErr, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('DUPLICATE_RESOURCE');
  });

  it('handles LIMIT_FILE_SIZE error → 413 FILE_TOO_LARGE', () => {
    const res = makeRes();
    const err = { code: 'LIMIT_FILE_SIZE', message: 'too big' };
    errorHandler(err, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(413);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('handles unsupported file type → 400 UNSUPPORTED_FILE_TYPE', () => {
    const res = makeRes();
    const err = { message: 'Unsupported file type: .exe' };
    errorHandler(err, {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('falls back to 500 INTERNAL_SERVER_ERROR for unknown errors', () => {
    const res = makeRes();
    errorHandler(new Error('mystery'), {} as any, res as any, makeNext());
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});

