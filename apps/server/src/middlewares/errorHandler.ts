import type { NextFunction, Request, Response } from 'express';
import type { ApiError } from '@app/shared';
import { AppError } from '../utils/AppError';

function isJsonParseError(err: unknown): boolean {
  return (err as { type?: string } | null)?.type === 'entity.parse.failed';
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (isJsonParseError(err)) return new AppError('VALIDATION_ERROR', 400, 'El cuerpo no es JSON válido');
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return new AppError('INTERNAL_ERROR', 500, 'Error interno del servidor');
}

/** Rutas no definidas → 404 con el envelope de error. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', 404, `Ruta no encontrada: ${req.method} ${req.path}`));
}

/** Último middleware. El cuerpo nunca incluye el stack: solo se registra en el log del servidor. */
// Express identifica el manejador de errores por sus 4 parámetros, aunque _next no se use.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const appError = toAppError(err);
  const body: ApiError = {
    success: false,
    error: { code: appError.code, message: appError.message },
  };
  res.status(appError.status).json(body);
}
