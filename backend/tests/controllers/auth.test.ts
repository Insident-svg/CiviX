import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import crypto from 'node:crypto';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
  process.env.JWT_SECRET = 'super-secret-key-that-is-at-least-32-chars!!';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.BACKEND_URL = 'http://localhost:5000';
  process.env.AI_SERVICE_URL = 'http://localhost:8000';
});

const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn();

vi.mock('../../src/models/User.js', () => ({
  User: {
    exists: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock('../../src/services/email.service.js', () => ({
  createSecureToken: vi.fn(() => ({ token: 'verification-token', hash: 'verification-hash' })),
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: mockBcryptCompare, hash: mockBcryptHash },
  compare: mockBcryptCompare,
  hash: mockBcryptHash,
}));

function makeRes() {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnValue({ json });
  const redirect = vi.fn();
  return { status, json, redirect };
}

function makeUser(overrides = {}) {
  return {
    id: 'user-id-1',
    _id: 'user-id-1',
    name: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashed',
    role: 'citizen',
    emailVerified: false,
    profileImage: null,
    blocked: false,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('auth controller – register()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { register, verifyEmail } = await import('../../src/controllers/auth.js');

  afterEach(() => {
    vi.clearAllMocks();
    mockBcryptHash.mockReset();
  });

  it('throws 409 when username or email already exists', async () => {
    vi.mocked(User.exists).mockResolvedValue({ _id: 'existing' } as any);
    const req = { body: { name: 'Alice Smith', username: 'alice_s', email: 'alice@example.com', password: 'password123' } } as any;
    await expect(register(req, makeRes() as any)).rejects.toMatchObject({ status: 409, code: 'USER_EXISTS' });
  });

  it('creates user and sends verification email', async () => {
    const { sendVerificationEmail } = await import('../../src/services/email.service.js');
    vi.mocked(User.exists).mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue('$hashed$pw');
    vi.mocked(User.create).mockResolvedValue(makeUser() as any);

    const req = { body: { name: 'Alice Smith', username: 'alice_s', email: 'alice@example.com', password: 'password123' } } as any;
    const res = makeRes();

    await register(req, res as any);

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.emailVerified).toBe(false);
    expect(sendVerificationEmail).toHaveBeenCalled();
    const verificationUrl = vi.mocked(sendVerificationEmail).mock.calls[0][2];
    expect(verificationUrl).toBe(
      'http://localhost:5000/api/auth/verify-email/verification-token',
    );
  });
});

describe('auth controller – verifyEmail()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { verifyEmail } = await import('../../src/controllers/auth.js');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts the token from the verification URL and marks the user verified', async () => {
    const token = 'verification-token';
    const expectedHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = makeUser({
      emailVerified: false,
      emailVerificationTokenHash: expectedHash,
      emailVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    vi.mocked(User.findOne).mockResolvedValue(user as any);

    const res = makeRes();
    await verifyEmail(
      { params: { token }, query: {} } as any,
      res as any,
    );

    expect(User.findOne).toHaveBeenCalledWith({
      emailVerificationTokenHash: expectedHash,
      emailVerificationExpiresAt: { $gt: expect.any(Date) },
    });
    expect(user.emailVerified).toBe(true);
    expect(user.emailVerificationTokenHash).toBeNull();
    expect(user.emailVerificationExpiresAt).toBeNull();
    expect(user.save).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/?emailVerified=success');
  });

  it('still accepts legacy query-string verification links', async () => {
    const user = makeUser({
      emailVerified: false,
      emailVerificationTokenHash: crypto.createHash('sha256').update('verification-token').digest('hex'),
      emailVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    vi.mocked(User.findOne).mockResolvedValue(user as any);

    const res = makeRes();
    await verifyEmail(
      { params: {}, query: { token: 'verification-token' } } as any,
      res as any,
    );

    expect(user.emailVerified).toBe(true);
    expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/?emailVerified=success');
  });
});

describe('auth controller – login()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { login } = await import('../../src/controllers/auth.js');

  afterEach(() => {
    vi.clearAllMocks();
    mockBcryptCompare.mockReset();
  });

  it('rejects unverified email', async () => {
    vi.mocked(User.findOne).mockResolvedValue(makeUser({ emailVerified: false }) as any);
    mockBcryptCompare.mockResolvedValue(true);
    await expect(login({ body: { identifier: 'test@example.com', password: 'correct' } } as any, makeRes() as any))
      .rejects.toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
  });

  it('returns a token after email verification', async () => {
    vi.mocked(User.findOne).mockResolvedValue(makeUser({ emailVerified: true }) as any);
    mockBcryptCompare.mockResolvedValue(true);
    const res = makeRes();
    await login({ body: { identifier: 'test@example.com', password: 'correct' } } as any, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(typeof body.data.token).toBe('string');
  });
});

describe('auth controller – forgotPassword()', async () => {
  const { User } = await import('../../src/models/User.js');
  const { forgotPassword } = await import('../../src/controllers/auth.js');

  it('does not reveal account existence', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    const res = makeRes();
    await forgotPassword({ body: { email: 'nobody@example.com' } } as any, res as any);
    const body = res.status.mock.results[0].value.json.mock.calls[0][0];
    expect(body.data.sent).toBe(true);
  });
});
