// Global test environment. This runs before Vitest imports any test modules,
// which is required because src/config/env.ts validates process.env at import time.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'super-secret-key-that-is-at-least-32-characters!!';
process.env.JWT_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.BACKEND_URL = 'http://localhost:5000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.AI_TIMEOUT_MS = '5000';
process.env.AI_RETRIES = '0';
process.env.AI_CONFIDENCE_THRESHOLD = '0.75';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
