import axios from 'axios';

import { env } from '../../config/env.js';
import {
  Category,
  Severity,
} from '../../types/index.js';

export interface AIResult {
  grievanceId: string;

  language: string;

  title: string;

  summary: string;

  transcript?: string;

  category: Category;

  subCategory?: string;

  severity: Severity;

  departments: string[];

  isEmergency: boolean;

  impactScore: number;

  confidence: {
    category: number;
    severity: number;
    impact: number;
  };

  humanReview: boolean;

  reviewReasons: string[];

  duplicate: {
    isDuplicate: boolean;
    masterIncidentId?: string | null;
    similarity: number;
  };
}

export interface AIInput {
  grievanceId: string;

  text: string;

  language?: string | null;

  media: {
    type: string;
    url: string;
    mimeType?: string;
    size?: number;
  }[];

  location: {
    latitude: number;
    longitude: number;
  };
}

const CATEGORIES: Category[] = [
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
];

const SEVERITIES: Severity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

export async function analyzeGrievance(
  input: AIInput,
): Promise<AIResult> {
  let lastError: unknown;

  const baseUrl =
    env.AI_SERVICE_URL.replace(/\/+$/, '');

  const url =
    `${baseUrl}/api/v1/analyze`;

  for (
    let attempt = 0;
    attempt <= env.AI_RETRIES;
    attempt++
  ) {
    let response;

    try {
      response =
        await axios.post<AIResult>(
          url,
          input,
          {
            timeout:
              env.AI_TIMEOUT_MS,

            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );
    } catch (error) {
      lastError = error;

      if (axios.isAxiosError(error)) {
        console.error('AI service request failed:', {
          url,
          attempt: attempt + 1,
          status: error.response?.status,
          message: error.message,
          response: error.response?.data,
        });
      } else {
        console.error('AI response validation failed:', {
          attempt: attempt + 1,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (
        attempt < env.AI_RETRIES
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              500 * (attempt + 1),
            ),
        );
        continue;
      }

      break;
    }

    // A response was received, so validate it immediately. Validation
    // failures are deterministic and must not be retried as if they were
    // transient network/service failures.
    try {
      validateAIResponse(
        response.data,
        input.grievanceId,
      );
    } catch (error) {
      console.error('AI response validation failed:', {
        message: error instanceof Error ? error.message : String(error),
        response: response.data,
      });
      throw error;
    }

    return response.data;
  }

  throw lastError;
}

function validateAIResponse(
  data: unknown,
  grievanceId: string,
): asserts data is AIResult {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    throw new Error(
      'Invalid AI response',
    );
  }

  const result =
    data as Record<
      string,
      unknown
    >;

  if (
    result.grievanceId !==
    grievanceId
  ) {
    throw new Error(
      'AI grievanceId mismatch',
    );
  }

  if (
    typeof result.language !==
    'string'
  ) {
    throw new Error(
      'Invalid AI language',
    );
  }

  if (
    typeof result.title !== 'string' ||
    result.title.trim().length < 1 ||
    result.title.length > 500
  ) {
    throw new Error('Invalid AI title');
  }

  if (
    typeof result.summary !== 'string' ||
    result.summary.trim().length < 1 ||
    result.summary.length > 1000
  ) {
    throw new Error('Invalid AI summary');
  }

  if (
    result.transcript !== undefined &&
    result.transcript !== null &&
    typeof result.transcript !== 'string'
  ) {
    throw new Error('Invalid AI transcript');
  }

  if (
    typeof result.category !==
      'string' ||
    !CATEGORIES.includes(
      result.category as Category,
    )
  ) {
    throw new Error(
      'Invalid AI category',
    );
  }

  if (
    typeof result.severity !==
      'string' ||
    !SEVERITIES.includes(
      result.severity as Severity,
    )
  ) {
    throw new Error(
      'Invalid AI severity',
    );
  }

  const allowedDepartments = new Set([
    'pwd',
    'water_board',
    'sanitation',
    'electricity_board',
    'sewerage',
    'traffic_police',
    'police',
    'health',
    'other',
  ]);

  if (
    !Array.isArray(result.departments) ||
    result.departments.length !== 1 ||
    typeof result.departments[0] !== 'string' ||
    !allowedDepartments.has(result.departments[0])
  ) {
    throw new Error(
      'AI must return exactly one allowed department',
    );
  }

  if (
    typeof result.isEmergency !==
    'boolean'
  ) {
    throw new Error(
      'Invalid AI emergency flag',
    );
  }

  if (
    typeof result.impactScore !==
      'number' ||
    !Number.isFinite(
      result.impactScore,
    ) ||
    result.impactScore < 0 ||
    result.impactScore > 100
  ) {
    throw new Error(
      'Invalid AI impact score',
    );
  }

  validateConfidence(
    result.confidence,
  );

  if (
    typeof result.humanReview !==
    'boolean'
  ) {
    throw new Error(
      'Invalid AI humanReview flag',
    );
  }

  if (
    !Array.isArray(
      result.reviewReasons,
    ) ||
    !result.reviewReasons.every(
      (reason) =>
        typeof reason ===
        'string',
    )
  ) {
    throw new Error(
      'Invalid AI review reasons',
    );
  }

  validateDuplicate(
    result.duplicate,
  );
}

function validateConfidence(
  value: unknown,
): asserts value is AIResult['confidence'] {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    throw new Error(
      'Invalid AI confidence',
    );
  }

  const confidence =
    value as Record<
      string,
      unknown
    >;

  const values = [
    confidence.category,
    confidence.severity,
    confidence.impact,
  ];

  if (
    values.some(
      (value) =>
        typeof value !==
          'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1,
    )
  ) {
    throw new Error(
      'AI confidence values must be between 0 and 1',
    );
  }
}

function validateDuplicate(
  value: unknown,
): asserts value is AIResult['duplicate'] {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    throw new Error(
      'Invalid AI duplicate result',
    );
  }

  const duplicate =
    value as Record<
      string,
      unknown
    >;

  if (
    typeof duplicate.isDuplicate !==
    'boolean'
  ) {
    throw new Error(
      'Invalid duplicate flag',
    );
  }

  if (
    typeof duplicate.similarity !==
      'number' ||
    !Number.isFinite(
      duplicate.similarity,
    ) ||
    duplicate.similarity < 0 ||
    duplicate.similarity > 1
  ) {
    throw new Error(
      'Invalid duplicate similarity',
    );
  }

  if (
    duplicate.masterIncidentId !==
      undefined &&
    duplicate.masterIncidentId !==
      null &&
    typeof duplicate.masterIncidentId !==
      'string'
  ) {
    throw new Error(
      'Invalid masterIncidentId',
    );
  }
}