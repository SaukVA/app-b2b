import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_TTL_SEC, ROLES, type Role } from '@app/shared';
import { getEnv } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getEnv().JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  });
}

function isPayload(decoded: unknown): decoded is AccessTokenPayload {
  const value = decoded as Partial<AccessTokenPayload> | null;
  return typeof value?.sub === 'string' && typeof value.sid === 'string' && ROLES.includes(value.role as Role);
}

/** Devuelve el payload si la firma y la caducidad son válidas; si no, null. */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getEnv().JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (!isPayload(decoded)) return null;
    return { sub: decoded.sub, sid: decoded.sid, role: decoded.role };
  } catch {
    return null;
  }
}

/** Refresh token opaco; en la base de datos solo se guarda su hash. */
export function createRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
