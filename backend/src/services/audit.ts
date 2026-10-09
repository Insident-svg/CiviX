import { AuditLog } from '../models/AuditLog.js';
import { Role } from '../types/index.js';

type AuditActorRole = Role | 'system';

export async function audit(
  actorId: string | undefined,
  actorRole: AuditActorRole,
  action: string,
  grievanceId?: string,
  previousStatus?: string,
  newStatus?: string,
  metadata: Record<string, unknown> = {},
) {
  return AuditLog.create({
    ...(actorId ? { actorId } : {}),
    actorRole,
    action,
    ...(grievanceId ? { grievanceId } : {}),
    ...(previousStatus ? { previousStatus } : {}),
    ...(newStatus ? { newStatus } : {}),
    metadata,
  });
}