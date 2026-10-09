import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { SLAConfig } from '../models/SLAConfig.js';
import { Department } from '../models/Department.js';
import { AuthRequest } from '../types/index.js';
import { AppError, ok } from '../utils/http.js';
import { audit } from '../services/audit.js';

const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);
const createSchema = z.object({
  severity: severitySchema,
  departmentId: z.string().trim().optional().nullable(),
  hours: z.coerce.number().int().min(1).max(8760),
  active: z.boolean().optional().default(true),
});
const updateSchema = z.object({
  severity: severitySchema.optional(),
  departmentId: z.string().trim().optional().nullable(),
  hours: z.coerce.number().int().min(1).max(8760).optional(),
  active: z.boolean().optional(),
});
function requireAdmin(req: AuthRequest) {
  if (!req.user || req.user.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Administrator access required');
}
function configQuery(departmentId?: string | null) {
  return departmentId ? { departmentId } : { $or: [{ departmentId: { $exists: false } }, { departmentId: null }] };
}

export async function listSlaConfigs(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const [configs, departments] = await Promise.all([
    SLAConfig.find().populate('departmentId', 'name code').sort({ severity: 1, createdAt: 1 }).lean(),
    Department.find({ active: true }).select('name code').sort({ name: 1 }).lean(),
  ]);
  return ok(res, { items: configs, departments });
}

export async function createSlaConfig(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const parsed = createSchema.parse(req.body);
  if (parsed.departmentId && !mongoose.isValidObjectId(parsed.departmentId)) throw new AppError(400, 'INVALID_DEPARTMENT', 'Invalid department ID');
  if (parsed.departmentId && !(await Department.exists({ _id: parsed.departmentId, active: true }))) throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Active department not found');
  const scope = parsed.departmentId || null;
  const existing = await SLAConfig.findOne({ severity: parsed.severity, ...configQuery(scope) });
  if (existing) throw new AppError(409, 'SLA_CONFIG_EXISTS', 'An SLA configuration already exists for this severity and scope. Edit the existing rule instead.');
  const config = await SLAConfig.create({ severity: parsed.severity, ...(parsed.departmentId ? { departmentId: parsed.departmentId } : {}), hours: parsed.hours, active: parsed.active });
  await audit(String(req.user!.id), 'admin', 'SLA_CONFIG_CREATED', undefined, undefined, undefined, { severity: config.severity, hours: config.hours, departmentId: parsed.departmentId || null });
  return ok(res, await SLAConfig.findById(config._id).populate('departmentId', 'name code').lean(), 201);
}

export async function updateSlaConfig(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const parsed = updateSchema.parse(req.body);
  const current = await SLAConfig.findById(req.params.id);
  if (!current) throw new AppError(404, 'SLA_CONFIG_NOT_FOUND', 'SLA configuration not found');
  const nextSeverity = parsed.severity ?? current.severity;
  const nextDepartmentId = parsed.departmentId === undefined ? (current.departmentId ? String(current.departmentId) : null) : (parsed.departmentId || null);
  if (nextDepartmentId && !mongoose.isValidObjectId(nextDepartmentId)) throw new AppError(400, 'INVALID_DEPARTMENT', 'Invalid department ID');
  if (nextDepartmentId && !(await Department.exists({ _id: nextDepartmentId, active: true }))) throw new AppError(404, 'DEPARTMENT_NOT_FOUND', 'Active department not found');
  const duplicate = await SLAConfig.findOne({ _id: { $ne: current._id }, severity: nextSeverity, ...configQuery(nextDepartmentId) });
  if (duplicate) throw new AppError(409, 'SLA_CONFIG_EXISTS', 'Another SLA configuration already exists for this severity and scope.');
  current.severity = nextSeverity;
  if (parsed.departmentId !== undefined) current.departmentId = nextDepartmentId ? new mongoose.Types.ObjectId(nextDepartmentId) : undefined;
  if (parsed.hours !== undefined) current.hours = parsed.hours;
  if (parsed.active !== undefined) current.active = parsed.active;
  await current.save();
  await audit(String(req.user!.id), 'admin', 'SLA_CONFIG_UPDATED', undefined, undefined, undefined, { configId: String(current._id), severity: current.severity, hours: current.hours, active: current.active });
  return ok(res, await SLAConfig.findById(current._id).populate('departmentId', 'name code').lean());
}

export async function deleteSlaConfig(req: AuthRequest, res: Response) {
  requireAdmin(req);
  const config = await SLAConfig.findById(req.params.id);
  if (!config) throw new AppError(404, 'SLA_CONFIG_NOT_FOUND', 'SLA configuration not found');
  // Soft-disable instead of deleting history or making old SLA decisions hard to audit.
  config.active = false;
  await config.save();
  await audit(String(req.user!.id), 'admin', 'SLA_CONFIG_DISABLED', undefined, undefined, undefined, { configId: String(config._id), severity: config.severity });
  return ok(res, { id: String(config._id), active: false });
}
