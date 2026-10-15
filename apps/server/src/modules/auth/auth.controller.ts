import type { CookieOptions, Request, Response } from 'express';
import {
  PERSISTENT_SESSION_DAYS,
  type ApiSuccess,
  type AuthUser,
  type LoginResponse,
} from '@app/shared';
import { getEnv } from '../../config/env';
import { getCurrentUser, login, logout, refresh } from './auth.service';
import type { LoginInput, RefreshInput } from './auth.validation';

export const REFRESH_COOKIE = 'refreshToken';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sin "Mantener la sesión" es una cookie de sesión: se pierde al cerrar el navegador (research R2). */
export function refreshCookieOptions(persistent: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api/auth',
    secure: getEnv().NODE_ENV === 'production',
    ...(persistent ? { maxAge: PERSISTENT_SESSION_DAYS * DAY_MS } : {}),
  };
}

function sendSuccess<T>(res: Response, data: T): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.json(body);
}

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    const input = req.body as LoginInput;
    const { refreshToken, ...session } = await login(input);
    if (input.client === 'desktop') {
      sendSuccess<LoginResponse>(res, { ...session, refreshToken });
      return;
    }
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(input.persistent));
    sendSuccess<LoginResponse>(res, session);
  },

  /** Web: token en la cookie y se reescribe; escritorio: va y vuelve en el cuerpo (research R2). */
  async refresh(req: Request, res: Response): Promise<void> {
    const body = req.body as RefreshInput;
    const cookieToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    const { refreshToken, persistent, client, ...session } = await refresh(
      body.refreshToken ?? cookieToken,
    );
    if (client === 'desktop') {
      sendSuccess<LoginResponse>(res, { ...session, refreshToken });
      return;
    }
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(persistent));
    sendSuccess<LoginResponse>(res, session);
  },

  /** En escritorio no hay cookie; borrarla igualmente no tiene efecto. */
  async logout(req: Request, res: Response): Promise<void> {
    await logout(req.auth!.sessionId);
    // Mismas opciones que al crearla (sin Max-Age): si no, el navegador no la borra.
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(false));
    sendSuccess<null>(res, null);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await getCurrentUser(req.auth!.userId);
    sendSuccess<AuthUser>(res, user);
  },
};
