import type { NextFunction, Request, Response } from 'express';
import { can, type AppModule, type PermissionLevel } from '@app/shared';
import { AppError } from '../utils/AppError';

/** Aplica la matriz PERMISSIONS de @app/shared. Va siempre después de requireAuth. */
export function requirePermission(module: AppModule, level: PermissionLevel) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new AppError('AUTH_UNAUTHENTICATED', 401, 'Inicia sesión para continuar.');
    if (!can(req.auth.role, module, level)) {
      throw new AppError('AUTH_FORBIDDEN', 403, 'No tienes permiso para realizar esta acción.');
    }
    next();
  };
}
