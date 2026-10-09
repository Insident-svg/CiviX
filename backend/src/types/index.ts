import { Request } from 'express';

export type Role = 'citizen' | 'officer' | 'admin';

export type AuthUser = {
  id: string;
  role: Role;
};

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const STATUSES = [
  'SUBMITTED',
  'AI_PROCESSED',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLUTION_SUBMITTED',
  'VERIFICATION',
  'RESOLVED',
  'REOPENED',
  'REJECTED',
] as const;

export type Status = (typeof STATUSES)[number];

export const CATEGORIES = [
  'road',
  'water',
  'sanitation',
  'electrical',
  'sewerage',
  'traffic',
  'public_safety',
  'healthcare',
  'emergency',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Severity = 'low' | 'medium' | 'high' | 'critical';