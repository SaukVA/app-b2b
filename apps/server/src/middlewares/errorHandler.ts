import type { NextFunction, Request, Response } from 'express';
import { DATABASE_ERROR_CODES, DATABASE_MESSAGES, type ApiError } from '@app/shared';
import { AppError } from '../utils/AppError';

function isJsonParseError(err: unknown): boolean {
  return (err as { type?: string } | null)?.type === 'entity.parse.failed';
}

/** Errores de Mongoose y del driver cuando no hay conexión con la base de datos (research R4). */
const CONNECTION_ERROR_NAMES = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoTopologyClosedError',
]);
/** MongooseError genérico: sin conexión inicial (bufferCommands=false) o con el buffering agotado. */
const MONGOOSE_NO_CONNECTION = /before initial connection|buffering timed out/;

function isDatabaseConnectionError(err: unknown): boolean {
  const { name, message } = (err ?? {}) as { name?: unknown; message?: unknown };
  if (typeof name !== 'string') return false;
  if (CONNECTION_ERROR_NAMES.has(name)) return true;
  return name === 'MongooseError' && MONGOOSE_NO_CONNECTION.test(String(message));
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (isJsonParseError(err))
    return new AppError('VALIDATION_ERROR', 400, 'El cuerpo no es JSON válido');
  if (isDatabaseConnectionError(err)) {
    return new AppError(DATABASE_ERROR_CODES.unavailable, 503, DATABASE_MESSAGES.unavailable);
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return new AppError('INTERNAL_ERROR', 500, 'Error interno del servidor');
}

/** Rutas no definidas → 404 con el envelope de error. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', 404, `Ruta no encontrada: ${req.method} ${req.path}`));
}

/** Último middleware. El cuerpo nunca incluye el stack: solo se registra en el log del servidor. */
// Express identifica el manejador de errores por sus 4 parámetros, aunque _next no se use.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const appError = toAppError(err);
  const body: ApiError = {
    success: false,
    error: { code: appError.code, message: appError.message },
  };
  res.status(appError.status).json(body);
}
