/**
 * Tests for src/services/sla.ts and src/services/audit.ts and src/services/notifications.ts
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

vi.mock('../../src/models/SLAConfig.js', () => ({
  SLAConfig: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../src/models/AuditLog.js', () => ({
  AuditLog: {
    create: vi.fn(),
  },
}));

vi.mock('../../src/models/Notification.js', () => ({
  Notification: {
    create: vi.fn(),
  },
}));

// ── applySla() ─────────────────────────────────────────────────────────────
describe('sla.applySla()', async () => {
  const { SLAConfig } = await import('../../src/models/SLAConfig.js');
  const { applySla } = await import('../../src/services/sla.js');

  afterEach(() => vi.clearAllMocks());

  it('does nothing when grievance has no severity', async () => {
    const grievance: any = {};
    await applySla(grievance);
    expect(grievance.slaDeadline).toBeUndefined();
    expect(vi.mocked(SLAConfig.findOne)).not.toHaveBeenCalled();
  });

  it('does nothing when no SLA config found', async () => {
    vi.mocked(SLAConfig.findOne).mockResolvedValue(null);
    const grievance: any = { severity: 'high', departmentId: 'dept-1' };
    await applySla(grievance);
    expect(grievance.slaDeadline).toBeUndefined();
  });

  it('sets slaDeadline based on department-specific config', async () => {
    vi.mocked(SLAConfig.findOne).mockResolvedValueOnce({ hours: 24 } as any);
    const grievance: any = { severity: 'high', departmentId: 'dept-1' };
    const before = Date.now();
    await applySla(grievance);
    const after = Date.now();
    expect(grievance.slaDeadline).toBeInstanceOf(Date);
    const dl = grievance.slaDeadline.getTime();
    expect(dl).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 100);
    expect(dl).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 100);
  });

  it('falls back to global SLA config when department config not found', async () => {
    vi.mocked(SLAConfig.findOne)
      .mockResolvedValueOnce(null)          // no dept-specific
      .mockResolvedValueOnce({ hours: 48 }); // global fallback
    const grievance: any = { severity: 'medium', departmentId: 'dept-2' };
    await applySla(grievance);
    expect(grievance.slaDeadline).toBeInstanceOf(Date);
  });

  it('uses global config when no departmentId', async () => {
    vi.mocked(SLAConfig.findOne).mockResolvedValueOnce({ hours: 72 } as any);
    const grievance: any = { severity: 'low' };
    await applySla(grievance);
    expect(grievance.slaDeadline).toBeInstanceOf(Date);
    // should only be called once (no dept lookup)
    expect(vi.mocked(SLAConfig.findOne)).toHaveBeenCalledTimes(1);
  });
});

// ── audit() ────────────────────────────────────────────────────────────────
describe('audit.audit()', async () => {
  const { AuditLog } = await import('../../src/models/AuditLog.js');
  const { audit } = await import('../../src/services/audit.js');

  afterEach(() => vi.clearAllMocks());

  it('creates an audit log with all fields', async () => {
    vi.mocked(AuditLog.create).mockResolvedValueOnce({ _id: 'log-1' } as any);
    await audit('u1', 'officer', 'STATUS_CHANGED', 'g-1', 'SUBMITTED', 'AI_PROCESSED');
    expect(vi.mocked(AuditLog.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'u1',
        actorRole: 'officer',
        action: 'STATUS_CHANGED',
        grievanceId: 'g-1',
        previousStatus: 'SUBMITTED',
        newStatus: 'AI_PROCESSED',
      })
    );
  });

  it('omits optional fields when not provided', async () => {
    vi.mocked(AuditLog.create).mockResolvedValueOnce({ _id: 'log-2' } as any);
    await audit('u1', 'admin', 'LOGIN');
    const call = vi.mocked(AuditLog.create).mock.calls[0][0] as any;
    expect(call.grievanceId).toBeUndefined();
    expect(call.previousStatus).toBeUndefined();
    expect(call.newStatus).toBeUndefined();
  });
});

// ── notify() ───────────────────────────────────────────────────────────────
describe('notifications.notify()', async () => {
  const { Notification } = await import('../../src/models/Notification.js');
  const { notify } = await import('../../src/services/notifications.js');

  afterEach(() => vi.clearAllMocks());

  it('creates a notification with all fields', async () => {
    vi.mocked(Notification.create).mockResolvedValueOnce({} as any);
    await notify('u1', 'Title', 'Message body', 'g-1', 'status');
    expect(vi.mocked(Notification.create)).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'status',
      title: 'Title',
      message: 'Message body',
      grievanceId: 'g-1',
    });
  });

  it('omits grievanceId when not provided', async () => {
    vi.mocked(Notification.create).mockResolvedValueOnce({} as any);
    await notify('u1', 'Title', 'Body');
    const call = vi.mocked(Notification.create).mock.calls[0][0] as any;
    expect(call.grievanceId).toBeUndefined();
  });

  it('defaults type to grievance', async () => {
    vi.mocked(Notification.create).mockResolvedValueOnce({} as any);
    await notify('u1', 'T', 'M');
    const call = vi.mocked(Notification.create).mock.calls[0][0] as any;
    expect(call.type).toBe('grievance');
  });
});

