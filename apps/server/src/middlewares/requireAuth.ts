import type { NextFunction, Request, Response } from 'express';
import { resolveAuthContext, type AuthContext } from '../modules/auth/auth.service';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Lo rellena requireAuth en las rutas protegidas. */
      auth?: AuthContext;
    }
  }
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Verifica el access token y que la sesión y el usuario siguen activos; deja el contexto en req.auth. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readBearerToken(req);
  if (!token) throw new AppError('AUTH_UNAUTHENTICATED', 401, 'Inicia sesión para continuar.');
  const payload = verifyAccessToken(token);
  if (!payload) {
    throw new AppError(
      'AUTH_SESSION_EXPIRED',
      401,
      'Tu sesión ha caducado. Vuelve a iniciar sesión.',
    );
  }
  req.auth = await resolveAuthContext(payload);
  next();
}
