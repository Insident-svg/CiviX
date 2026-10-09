/**
 * Tests for src/controllers/officer.ts – dashboard()
 * Tests for src/controllers/map.ts – incidents()
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

vi.mock('../../src/models/Officer.js', () => ({
  Officer: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../src/models/Grievance.js', () => ({
  Grievance: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
}

// ── officer.dashboard() ───────────────────────────────────────────────────────
describe('officer.dashboard()', async () => {
  const { Officer } = await import('../../src/models/Officer.js');
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { dashboard } = await import('../../src/controllers/officer.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(dashboard({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 403 NOT_OFFICER when no active officer profile', async () => {
    vi.mocked(Officer.findOne).mockResolvedValueOnce(null);
    const req = { user: { id: 'u1', role: 'officer' } } as any;
    await expect(dashboard(req, makeRes() as any)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OFFICER',
    });
  });

  it('returns dashboard stats', async () => {
    vi.mocked(Officer.findOne).mockResolvedValueOnce({ _id: 'o-1' } as any);
    vi.mocked(Grievance.countDocuments)
      .mockResolvedValueOnce(3 as any)   // pending
      .mockResolvedValueOnce(1 as any)   // critical
      .mockResolvedValueOnce(2 as any)   // inProgress
      .mockResolvedValueOnce(5 as any);  // resolved

    const req = { user: { id: 'u1', role: 'officer' } } as any;
    const res = makeRes();
    await dashboard(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.pending).toBe(3);
    expect(body.data.critical).toBe(1);
    expect(body.data.inProgress).toBe(2);
    expect(body.data.resolved).toBe(5);
  });
});

// ── map.incidents() ───────────────────────────────────────────────────────────
describe('map.incidents()', async () => {
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { incidents } = await import('../../src/controllers/map.js');

  afterEach(() => vi.clearAllMocks());

  function makeChain(items: unknown[]) {
    return {
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(items),
    };
  }

  it('returns incident list', async () => {
    const list = [{ _id: 'g1', category: 'road' }];
    vi.mocked(Grievance.find).mockReturnValueOnce(makeChain(list) as any);
    const req = { query: {} } as any;
    const res = makeRes();
    await incidents(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
  });

  it('throws 400 INVALID_LOCATION for bad coordinates', async () => {
    const req = { query: { lat: '91', lng: '73.85' } } as any; // lat > 90
    await expect(incidents(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_LOCATION',
    });
  });

  it('throws 400 for negative radius', async () => {
    const req = { query: { lat: '18.5', lng: '73.85', radius: '-100' } } as any;
    await expect(incidents(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_LOCATION',
    });
  });

  it('applies ward and category filters', async () => {
    vi.mocked(Grievance.find).mockReturnValueOnce(makeChain([]) as any);
    const req = { query: { ward: 'ward-1', category: 'water', status: 'SUBMITTED' } } as any;
    const res = makeRes();
    await incidents(req, res as any);
    const filter = vi.mocked(Grievance.find).mock.calls[0][0] as any;
    expect(filter.wardId).toBe('ward-1');
    expect(filter.category).toBe('water');
    expect(filter.status).toBe('SUBMITTED');
  });
});
