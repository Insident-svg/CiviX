/**
 * Tests for src/services/ai/aiClient.ts  
 * Validates AI response parsing and error handling.
 * 
 * ESM + Vitest mocking note: axios is mocked via vi.mock() hoisting.
 * Each test sets up the mock via vi.mocked(axios.post).mockResolvedValueOnce.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest';
import axios from 'axios';

// ── Mock axios ───────────────────────────────────────────────────────────────
vi.mock('axios');

// ── Provide environment vars before the service is dynamically imported. ───
// `describe()` callbacks run during test collection, so a beforeAll hook would
// be too late for src/config/env.ts to see these values.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'super-secret-key-that-is-at-least-32-chars!!';
process.env.JWT_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BACKEND_URL = 'http://localhost:5000';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.AI_TIMEOUT_MS = '5000';
process.env.AI_RETRIES = '0';
process.env.AI_CONFIDENCE_THRESHOLD = '0.75';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

beforeEach(() => {
  vi.clearAllMocks();
});

const VALID_RESPONSE = {
  grievanceId: 'GRV-001',
  language: 'en',
  category: 'road',
  severity: 'high',
  departments: ['pwd'],
  isEmergency: false,
  impactScore: 72,
  confidence: { category: 0.9, severity: 0.85, impact: 0.8 },
  humanReview: false,
  reviewReasons: [],
  duplicate: { isDuplicate: false, similarity: 0.0 },
};

const INPUT = {
  grievanceId: 'GRV-001',
  text: 'Big pothole on MG road',
  language: 'en' as const,
  media: [],
  location: { latitude: 18.52, longitude: 73.85 },
};

describe('analyzeGrievance()', async () => {
  const { analyzeGrievance } = await import('../../src/services/ai/aiClient.js');
  const mockedPost = vi.mocked(axios.post);

  it('returns validated AI result on success', async () => {
    mockedPost.mockResolvedValueOnce({ data: VALID_RESPONSE });
    const result = await analyzeGrievance(INPUT);
    expect(result.category).toBe('road');
    expect(result.severity).toBe('high');
    expect(result.impactScore).toBe(72);
  });

  it('throws when grievanceId in response does not match input', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, grievanceId: 'WRONG' } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('AI grievanceId mismatch');
  });

  it('throws when category is invalid', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, category: 'unicorn' } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI category');
  });

  it('throws when severity is invalid', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, severity: 'catastrophic' } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI severity');
  });

  it('throws when impactScore is out of range', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, impactScore: 150 } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI impact score');
  });

  it('throws when confidence values are not between 0 and 1', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { ...VALID_RESPONSE, confidence: { category: 1.5, severity: 0.8, impact: 0.9 } },
    });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('AI confidence values must be between 0 and 1');
  });

  it('throws when departments is not an array', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, departments: 'pwd' } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI departments');
  });

  it('throws when isEmergency is not a boolean', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, isEmergency: 'yes' } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI emergency flag');
  });

  it('throws when humanReview is not a boolean', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, humanReview: 1 } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI humanReview flag');
  });

  it('throws when reviewReasons is not an array of strings', async () => {
    mockedPost.mockResolvedValueOnce({ data: { ...VALID_RESPONSE, reviewReasons: [42] } });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid AI review reasons');
  });

  it('throws when duplicate.isDuplicate is not a boolean', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { ...VALID_RESPONSE, duplicate: { isDuplicate: 'no', similarity: 0 } },
    });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid duplicate flag');
  });

  it('throws when duplicate.similarity is out of range', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { ...VALID_RESPONSE, duplicate: { isDuplicate: false, similarity: 2 } },
    });
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Invalid duplicate similarity');
  });

  it('throws when axios rejects (network error)', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Network Error'));
    await expect(analyzeGrievance(INPUT)).rejects.toThrow('Network Error');
  });
});

