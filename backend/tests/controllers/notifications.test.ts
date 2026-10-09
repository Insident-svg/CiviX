/**
 * Tests for src/controllers/notifications.ts
 * Covers: list(), read()
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

vi.mock('../../src/models/Notification.js', () => ({
  Notification: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
}

describe('notifications.list()', async () => {
  const { Notification } = await import('../../src/models/Notification.js');
  const { list } = await import('../../src/controllers/notifications.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(list({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 400 INVALID_READ_FILTER when read is not true/false', async () => {
    const req = { user: { id: 'u1', role: 'citizen' }, query: { read: 'maybe' } } as any;
    await expect(list(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_READ_FILTER',
    });
  });

  it('throws 400 INVALID_NOTIFICATION_TYPE for unknown type', async () => {
    const req = { user: { id: 'u1', role: 'citizen' }, query: { type: 'alien' } } as any;
    await expect(list(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_NOTIFICATION_TYPE',
    });
  });

  it('returns paginated notifications', async () => {
    const items = [{ _id: 'n1', title: 'Update', read: false }];
    const chain: any = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(items),
    };
    // Make the last populate return lean-able result
    chain.populate.mockImplementation(() => {
      return { ...chain, lean: vi.fn().mockResolvedValue(items) };
    });
    vi.mocked(Notification.find).mockReturnValueOnce(chain as any);
    vi.mocked(Notification.countDocuments).mockResolvedValueOnce(1 as any);
    const req = { user: { id: 'u1', role: 'citizen' }, query: {} } as any;
    const res = makeRes();
    await list(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.total).toBe(1);
    expect(body.data.page).toBe(1);
  });

  it('accepts valid type filter', async () => {
    const chain: any = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };
    chain.populate.mockImplementation(() => ({ ...chain, lean: vi.fn().mockResolvedValue([]) }));
    vi.mocked(Notification.find).mockReturnValueOnce(chain as any);
    vi.mocked(Notification.countDocuments).mockResolvedValueOnce(0 as any);
    const req = { user: { id: 'u1', role: 'citizen' }, query: { type: 'status', read: 'false' } } as any;
    const res = makeRes();
    await list(req, res as any);
    // verify the filter included type and read
    const filterArg = vi.mocked(Notification.find).mock.calls[0][0] as any;
    expect(filterArg.type).toBe('status');
    expect(filterArg.read).toBe(false);
  });
});

describe('notifications.read()', async () => {
  const { Notification } = await import('../../src/models/Notification.js');
  const { read } = await import('../../src/controllers/notifications.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(read({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 404 when notification not found', async () => {
    const chain = { populate: vi.fn().mockResolvedValue(null) };
    vi.mocked(Notification.findOneAndUpdate).mockReturnValueOnce(chain as any);
    const req = { user: { id: 'u1', role: 'citizen' }, params: { id: 'missing' } } as any;
    await expect(read(req, makeRes() as any)).rejects.toMatchObject({
      status: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  });

  it('marks notification as read and returns it', async () => {
    const notification = { _id: 'n1', read: true, title: 'Update' };
    const chain = { populate: vi.fn().mockResolvedValue(notification) };
    vi.mocked(Notification.findOneAndUpdate).mockReturnValueOnce(chain as any);
    const req = { user: { id: 'u1', role: 'citizen' }, params: { id: 'n1' } } as any;
    const res = makeRes();
    await read(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data._id).toBe('n1');
    expect(body.data.read).toBe(true);
  });
});

