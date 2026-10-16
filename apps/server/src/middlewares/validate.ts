import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

function parseOrThrow(schema: ZodType, value: unknown): unknown {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const message = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
    .join('; ');
  throw new AppError('VALIDATION_ERROR', 400, message);
}

/** Valida y sustituye body/params/query por su versión parseada antes de llegar al controlador. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.body) req.body = parseOrThrow(schemas.body, req.body);
    if (schemas.params) req.params = parseOrThrow(schemas.params, req.params) as Request['params'];
    if (schemas.query) {
      // En Express 5 req.query es un getter: se redefine en lugar de asignarse.
      const query = parseOrThrow(schemas.query, req.query);
      Object.defineProperty(req, 'query', { value: query, writable: true });
    }
    next();
  };
}
