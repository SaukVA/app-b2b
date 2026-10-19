import type { Response } from 'express';
import type { ApiSuccess } from '@app/shared';

/** Envelope de éxito { success: true, data } con el status indicado (200 por defecto). */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(status).json(body);
}
