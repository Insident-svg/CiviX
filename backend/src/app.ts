import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env.js';
import { router } from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler } from './utils/http.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Civix backend is running',
    },
  });
});

app.use('/api', apiLimiter, router);

app.use(errorHandler);

export default app;
