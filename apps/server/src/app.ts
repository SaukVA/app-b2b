import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { getEnv } from './config/env';
import { buildSwaggerSpec } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { requireDatabaseReady } from './middlewares/requireDatabaseReady';
import { authRouter } from './modules/auth/auth.routes';
import { customerRouter } from './modules/customers/customer.routes';
import { healthRouter } from './modules/health/health.routes';
import { preferencesRouter } from './modules/preferences/preferences.routes';
import { productRouter } from './modules/products/product.routes';
import { roleRouter } from './modules/roles/role.routes';
import { userRouter } from './modules/users/user.routes';

export interface BuildAppOptions {
  /** Monta la UI de Swagger en /api-docs (por defecto sí; el backend embebido no la monta, research R3). */
  docs?: boolean;
  /** Solo el backend embebido: mientras devuelva false, /api (salvo /health) responde 503. */
  isDatabaseReady?: () => boolean;
}

/** Construye la app Express sin levantar el servidor (lo usan server.ts, embedded.ts y los tests). */
export function buildApp(options: BuildAppOptions = {}): Express {
  const env = getEnv();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));

  app.use('/api/health', healthRouter);
  if (options.isDatabaseReady) app.use('/api', requireDatabaseReady(options.isDatabaseReady));
  app.use('/api/auth', authRouter);
  app.use('/api/roles', roleRouter);
  app.use('/api/users', userRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/products', productRouter);
  app.use('/api/customers', customerRouter);
  if (options.docs !== false) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(buildSwaggerSpec()));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
