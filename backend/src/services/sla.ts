import { SLAConfig } from '../models/SLAConfig.js';
import { Severity } from '../types/index.js';

type SLAGrievance = {
  severity?: string | null;
  departmentId?: unknown;
  slaDeadline?: Date | null;
};

/** Assign the active department-specific SLA, falling back to a global rule. */
export async function applySla(grievance: SLAGrievance) {
  if (!grievance.severity || grievance.slaDeadline) return;
  const severity = grievance.severity as Severity;
  const departmentId = grievance.departmentId as { _id?: unknown } | string | undefined | null;
  const normalizedDepartmentId = departmentId && typeof departmentId === 'object' && '_id' in departmentId
    ? departmentId._id
    : departmentId;

  const departmentConfig = normalizedDepartmentId
    ? await SLAConfig.findOne({ severity, departmentId: normalizedDepartmentId, active: true })
    : null;
  const globalConfig = departmentConfig ? null : await SLAConfig.findOne({
    severity,
    active: true,
    $or: [{ departmentId: { $exists: false } }, { departmentId: null }],
  });
  const config = departmentConfig ?? globalConfig;
  if (!config) return;
  grievance.slaDeadline = new Date(Date.now() + config.hours * 60 * 60 * 1000);
}
