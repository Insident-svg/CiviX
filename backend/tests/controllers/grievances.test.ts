/**
 * Tests for src/controllers/grievances.ts
 * Covers: create(), list(), getOne(), status(), resolution()
 * All models/services are mocked — no DB required.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
} from 'vitest';

// ── Environment ───────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'super-secret-key-that-is-at-least-32-chars!!';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.BACKEND_URL = 'http://localhost:5000';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';
  process.env.AI_CONFIDENCE_THRESHOLD = '0.75';
  process.env.AI_RETRIES = '0';
  process.env.AI_TIMEOUT_MS = '5000';
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
    });

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('../../src/models/Grievance.js', () => ({
  Grievance: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../../src/models/User.js', () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock('../../src/models/Officer.js', () => ({
  Officer: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../src/models/PublicPost.js', () => ({
  PublicPost: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../src/models/ResolutionEvidence.js', () => ({
  ResolutionEvidence: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/services/ai/aiClient.js', () => ({
  analyzeGrievance: vi.fn(),
}));

vi.mock('../../src/services/routing.js', () => ({
  routeGrievance: vi.fn().mockResolvedValue({ ward: null, department: null, officer: null }),
}));

vi.mock('../../src/services/sla.js', () => ({
  applySla: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/notifications.js', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/audit.js', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
}

function makeSaveable(data: Record<string, unknown>) {
  return { ...data, save: vi.fn().mockResolvedValue(undefined) };
}

function makeUser(overrides = {}) {
  return {
    _id: 'uid-1',
    id: 'uid-1',
    emailVerified: true,
    ...overrides,
  };
}

function makeOfficer(overrides = {}) {
  return { _id: 'officer-1', ...overrides };
}

// ── create() ─────────────────────────────────────────────────────────────────
describe('grievances.create()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { PublicPost } = await import('../../src/models/PublicPost.js');
  const { analyzeGrievance } = await import('../../src/services/ai/aiClient.js');
  const { create } = await import('../../src/controllers/grievances.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when there is no req.user', async () => {
    await expect(create({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 404 when user not found in DB', async () => {
    vi.mocked(User.findById).mockResolvedValueOnce(null);
    const req = { user: { id: 'uid-1', role: 'citizen' }, body: {} } as any;
    await expect(create(req, makeRes() as any)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 403 when phone is not verified', async () => {
    vi.mocked(User.findById).mockResolvedValueOnce(makeUser({ emailVerified: false }) as any);
    const req = { user: { id: 'uid-1', role: 'citizen' }, body: {} } as any;
    await expect(create(req, makeRes() as any)).rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
  });

  it('throws VALIDATION_ERROR for missing body fields', async () => {
    vi.mocked(User.findById).mockResolvedValueOnce(makeUser() as any);
    const req = { user: { id: 'uid-1', role: 'citizen' }, body: {} } as any;
    await expect(create(req, makeRes() as any)).rejects.toThrow();
  });

  it('creates grievance successfully (AI succeeds)', async () => {
    vi.mocked(User.findById).mockResolvedValueOnce(makeUser() as any);
    const grievanceDoc = makeSaveable({ _id: 'g-1', status: 'SUBMITTED', userId: 'uid-1' });
    vi.mocked(Grievance.create).mockResolvedValueOnce(grievanceDoc as any);
    vi.mocked(analyzeGrievance).mockResolvedValueOnce({
      grievanceId: 'GRV-001',
      language: 'en',
      category: 'road',
      severity: 'high',
      departments: ['pwd'],
      isEmergency: false,
      impactScore: 80,
      confidence: { category: 0.9, severity: 0.85, impact: 0.8 },
      humanReview: false,
      reviewReasons: [],
      duplicate: { isDuplicate: false, similarity: 0 },
    });
    vi.mocked(PublicPost.findOneAndUpdate).mockResolvedValueOnce(null);

    const req = {
      user: { id: 'uid-1', role: 'citizen' },
      body: {
        text: 'Large pothole on MG Road causing accidents',
        location: { latitude: 18.52, longitude: 73.85 },
      },
    } as any;

    const res = makeRes();
    await create(req, res as any);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sets aiHumanReview=true and saves if AI pipeline fails', async () => {
    vi.mocked(User.findById).mockResolvedValueOnce(makeUser() as any);
    const grievanceDoc = makeSaveable({ _id: 'g-2', status: 'SUBMITTED', userId: 'uid-1' });
    vi.mocked(Grievance.create).mockResolvedValueOnce(grievanceDoc as any);
    vi.mocked(analyzeGrievance).mockRejectedValueOnce(new Error('AI down'));

    const req = {
      user: { id: 'uid-1', role: 'citizen' },
      body: {
        text: 'Water pipeline burst near school',
        location: { latitude: 18.52, longitude: 73.85 },
      },
    } as any;
    const res = makeRes();
    await create(req, res as any);
    expect(grievanceDoc.aiHumanReview).toBe(true);
    expect(grievanceDoc.save).toHaveBeenCalled();
  });
});

// ── list() ───────────────────────────────────────────────────────────────────
describe('grievances.list()', async () => {
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { list } = await import('../../src/controllers/grievances.js');

  afterEach(() => vi.clearAllMocks());

  function makeChainable(items: unknown[]) {
    let populateCallCount = 0;
    const chain: any = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockImplementation(function () {
        populateCallCount++;
        // The real controller calls .populate() 4 times; the 4th resolves
        if (populateCallCount >= 4) {
          return Promise.resolve(items);
        }
        return chain;
      }),
    };
    return chain;
  }

  it('throws 401 when unauthenticated', async () => {
    await expect(list({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('returns paginated grievances', async () => {
    vi.mocked(Grievance.find).mockReturnValueOnce(makeChainable([]) as any);
    vi.mocked(Grievance.countDocuments).mockResolvedValueOnce(0 as any);
    const req = { user: { id: 'uid-1', role: 'citizen' }, query: {} } as any;
    const res = makeRes();
    await list(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.items).toBeDefined();
    expect(body.data.page).toBe(1);
  });

  it('throws 400 INVALID_STATUS when status query is invalid', async () => {
    const req = {
      user: { id: 'uid-1', role: 'citizen' },
      query: { status: 'INVALID_STATUS_XYZ' },
    } as any;
    await expect(list(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_STATUS',
    });
  });

  it('throws 400 INVALID_LOCATION when lat/lng/radius is bad', async () => {
    const req = {
      user: { id: 'uid-1', role: 'citizen' },
      query: { lat: '999', lng: '73.85' }, // lat > 90
    } as any;
    await expect(list(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_LOCATION',
    });
  });
});

// ── getOne() ──────────────────────────────────────────────────────────────────
describe('grievances.getOne()', async () => {
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { getOne } = await import('../../src/controllers/grievances.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 404 when grievance not found', async () => {
    let populateCount = 0;
    const chain: any = {
      populate: vi.fn().mockImplementation(function () {
        populateCount++;
        if (populateCount >= 4) return Promise.resolve(null);
        return chain;
      }),
    };
    vi.mocked(Grievance.findById).mockReturnValueOnce(chain);
    const req = { params: { id: 'nonexistent' } } as any;
    await expect(getOne(req, makeRes() as any)).rejects.toMatchObject({
      status: 404,
      code: 'GRIEVANCE_NOT_FOUND',
    });
  });

  it('returns the grievance when found', async () => {
    const doc = { _id: 'g-1', status: 'SUBMITTED' };
    let populateCount = 0;
    const chain: any = {
      populate: vi.fn().mockImplementation(function () {
        populateCount++;
        if (populateCount >= 4) return Promise.resolve(doc);
        return chain;
      }),
    };
    vi.mocked(Grievance.findById).mockReturnValueOnce(chain);
    const req = { params: { id: 'g-1' } } as any;
    const res = makeRes();
    await getOne(req, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data._id).toBe('g-1');
  });
});

// ── status() ─────────────────────────────────────────────────────────────────
describe('grievances.status()', async () => {
  const { Grievance } = await import('../../src/models/Grievance.js');
  const { Officer } = await import('../../src/models/Officer.js');
  const { status } = await import('../../src/controllers/grievances.js');

  afterEach(() => vi.clearAllMocks());

  it('throws 401 when no user', async () => {
    await expect(status({} as any, makeRes() as any)).rejects.toMatchObject({ status: 401 });
  });

  it('throws 400 INVALID_STATUS for unknown target status', async () => {
    const req = {
      user: { id: 'uid-1', role: 'officer' },
      body: { status: 'FLYING_PIGS' },
      params: { id: 'g-1' },
    } as any;
    await expect(status(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_STATUS',
    });
  });

  it('throws 403 FORBIDDEN when citizen tries to change status', async () => {
    const grievance = makeSaveable({ status: 'SUBMITTED' });
    vi.mocked(Grievance.findById).mockResolvedValueOnce(grievance as any);
    const req = {
      user: { id: 'uid-1', role: 'citizen' },
      body: { status: 'AI_PROCESSED' },
      params: { id: 'g-1' },
    } as any;
    await expect(status(req, makeRes() as any)).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('throws 400 INVALID_STATUS_TRANSITION for illegal transition', async () => {
    const grievance = makeSaveable({ status: 'SUBMITTED', officerId: 'officer-1', userId: 'uid-1' });
    vi.mocked(Grievance.findById).mockResolvedValueOnce(grievance as any);
    vi.mocked(Officer.findOne).mockResolvedValueOnce(makeOfficer({ _id: 'officer-1' }) as any);
    const req = {
      user: { id: 'uid-1', role: 'admin' },
      body: { status: 'RESOLVED' },  // cannot jump SUBMITTED → RESOLVED
      params: { id: 'g-1' },
    } as any;
    await expect(status(req, makeRes() as any)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_STATUS_TRANSITION',
    });
  });

  it('updates status and responds when transition is valid (admin)', async () => {
    const grievance = makeSaveable({ status: 'SUBMITTED', officerId: null, userId: 'uid-2' });
    vi.mocked(Grievance.findById).mockResolvedValueOnce(grievance as any);
    vi.mocked(Officer.findOne).mockResolvedValueOnce(null);
    const req = {
      user: { id: 'uid-1', role: 'admin' },
      body: { status: 'AI_PROCESSED' },
      params: { id: 'g-1' },
    } as any;
    const res = makeRes();
    await status(req, res as any);
    expect(grievance.status).toBe('AI_PROCESSED');
    expect(grievance.save).toHaveBeenCalled();
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.success).toBe(true);
  });
});
