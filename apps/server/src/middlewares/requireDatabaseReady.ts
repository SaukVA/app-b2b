import type { RequestHandler } from 'express';
import { DATABASE_ERROR_CODES, DATABASE_MESSAGES } from '@app/shared';
import { AppError } from '../utils/AppError';

/**
 * Backend embebido: hasta conectar y crear la cuenta inicial, las rutas responden 503. Así un login en ese
 * intervalo es un error de conexión y no un intento fallido con «admin» aún sin crear (FR-018, US1-4).
 */
export function requireDatabaseReady(isReady: () => boolean): RequestHandler {
  return (_req, _res, next) => {
    if (isReady()) return next();
    next(new AppError(DATABASE_ERROR_CODES.unavailable, 503, DATABASE_MESSAGES.unavailable));
  };
}
