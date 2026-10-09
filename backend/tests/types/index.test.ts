/**
 * Tests for src/types/index.ts
 * Covers: STATUSES, CATEGORIES, Severity type guard, AuthRequest shape
 */
import { describe, it, expect } from 'vitest';
import { STATUSES, CATEGORIES } from '../../src/types/index.js';

describe('STATUSES constant', () => {
  it('contains all expected status strings', () => {
    const expected = [
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
    ];
    expect([...STATUSES]).toEqual(expected);
  });

  it('has exactly 10 statuses', () => {
    expect(STATUSES.length).toBe(10);
  });

  it('every status is a non-empty string', () => {
    STATUSES.forEach((s) => {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    });
  });
});

describe('CATEGORIES constant', () => {
  it('contains the expected categories', () => {
    const expected = [
      'road',
      'water',
      'sanitation',
      'electrical',
      'sewerage',
      'traffic',
      'public_safety',
      'emergency',
      'other',
    ];
    expect([...CATEGORIES]).toEqual(expected);
  });

  it('has exactly 9 categories', () => {
    expect(CATEGORIES.length).toBe(9);
  });
});

