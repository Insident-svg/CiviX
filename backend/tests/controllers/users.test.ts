/**
 * Tests for src/controllers/users.ts
 * Covers: profile(), search(), update()
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

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

vi.mock('../../src/models/User.js', () => ({
  User: {
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../src/models/Grievance.js', () => ({
  Grievance: {
    countDocuments: vi.fn(),
  },
}));

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
}

describe('users.profile()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { profile } = await import('../../src/controllers/users.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user on request', async () => {
    await expect(profile({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 404 when user not in DB', async () => {
    const chain = { select: vi.fn().mockResolvedValue(null) };
    vi.mocked(User.findById).mockReturnValueOnce(chain as any);
    const req = { user: { id: 'u1', role: 'citizen' }, params: { id: 'u1' } } as any;
    await expect(profile(req, makeRes() as any)).rejects.toMatchObject({ status: 404 });
  });

  it('returns user profile with stats', async () => {
    const userDoc = {
      _id: 'u1',
      name: 'Alice',
      username: 'alice',
      profileImage: null,
      toObject: () => ({ _id: 'u1', name: 'Alice', username: 'alice' }),
    };
    const chain = { select: vi.fn().mockResolvedValue(userDoc) };
    vi.mocked(User.findById).mockReturnValueOnce(chain as any);
    vi.mocked(Grievance.countDocuments)
      .mockResolvedValueOnce(10 as any)  // total
      .mockResolvedValueOnce(4 as any)   // resolved
      .mockResolvedValueOnce(3 as any)   // pending
      .mockResolvedValueOnce(2 as any);  // inProgress

    const req = { user: { id: 'u1', role: 'citizen' }, params: { id: 'u1' } } as any;
    const res = makeRes();
    await profile(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.stats.total).toBe(10);
    expect(body.data.stats.resolved).toBe(4);
  });
});

describe('users.search()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { search } = await import('../../src/controllers/users.js');

  afterEach(() => vi.clearAllMocks());

  it('returns users matching query', async () => {
    const users = [{ _id: 'u1', username: 'alice' }];
    const chain = { select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(users) };
    vi.mocked(User.find).mockReturnValueOnce(chain as any);
    const req = { query: { username: 'alice' } } as any;
    const res = makeRes();
    await search(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
  });

  it('returns all users when no query is provided', async () => {
    const chain = { select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) };
    vi.mocked(User.find).mockReturnValueOnce(chain as any);
    const req = { query: {} } as any;
    const res = makeRes();
    await search(req, res as any);
    // find should be called with empty filter
    expect(vi.mocked(User.find).mock.calls[0][0]).toEqual({});
  });
});

describe('users.update()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { update } = await import('../../src/controllers/users.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(update({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 400 NO_UPDATE_FIELDS when body has no valid fields', async () => {
    const req = {
      user: { id: 'u1', role: 'citizen' },
      body: { invalidField: 'value' },
    } as any;
    await expect(update(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'NO_UPDATE_FIELDS',
    });
  });

  it('updates and returns user when valid fields provided', async () => {
    const updatedUser = { _id: 'u1', name: 'New Name', username: 'alice' };
    const chain = { select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(updatedUser) };
    vi.mocked(User.findByIdAndUpdate).mockReturnValueOnce(chain as any);
    const req = {
      user: { id: 'u1', role: 'citizen' },
      body: { name: 'New Name' },
    } as any;
    const res = makeRes();
    await update(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.name).toBe('New Name');
  });

  it('throws 404 when user not found after update', async () => {
    const chain = { select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) };
    vi.mocked(User.findByIdAndUpdate).mockReturnValueOnce(chain as any);
    const req = {
      user: { id: 'u1', role: 'citizen' },
      body: { name: 'New Name' },
    } as any;
    await expect(update(req, makeRes() as any)).rejects.toMatchObject({ status: 404 });
  });
});

