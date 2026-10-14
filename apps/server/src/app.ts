import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { getEnv } from './config/env';
import { buildSwaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { healthRouter } from './modules/health/health.routes';

/** Construye la app Express sin levantar el servidor (lo usan server.ts y los tests). */
export function buildApp(): Express {
  const env = getEnv();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));

  app.use('/api/health', healthRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(buildSwaggerSpec()));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
