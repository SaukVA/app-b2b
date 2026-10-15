import {
  IDLE_TIMEOUT_MIN,
  MAX_FAILED_ATTEMPTS,
  PERSISTENT_SESSION_DAYS,
  type AuthUser,
  type ClientKind,
  type Role,
} from '@app/shared';
import { AppError } from '../../utils/AppError';
import { normalizeLogin, verifyPassword } from '../../utils/password';
import {
  createRefreshToken,
  hashToken,
  signAccessToken,
  type AccessTokenPayload,
} from '../../utils/tokens';
import { toAuthUser } from '../users/user.mapper';
import { UserModel, type UserDocument } from '../users/user.model';
import type { LoginInput } from './auth.validation';
import { retireBootstrapIfNeeded } from './bootstrap.service';
import { LoginAttemptModel } from './loginAttempt.model';
import { SessionModel, type SessionDocument } from './session.model';

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: Role;
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

function invalidCredentials(remaining: number): AppError {
  const attempts = remaining === 1 ? 'Te queda 1 intento.' : `Te quedan ${remaining} intentos.`;
  return new AppError('AUTH_INVALID_CREDENTIALS', 401, `Email o contraseña incorrectos. ${attempts}`);
}

function sessionExpired(): AppError {
  return new AppError('AUTH_SESSION_EXPIRED', 401, 'Tu sesión ha caducado. Vuelve a iniciar sesión.');
}

export function findUserByLogin(login: string): Promise<UserDocument | null> {
  return UserModel.findOne({ login }).select('+passwordHash').exec();
}

/** Suma un fallo (como mucho hasta MAX_FAILED_ATTEMPTS) y devuelve los intentos restantes. */
export async function registerFailure(identifier: string): Promise<number> {
  const attempt = await LoginAttemptModel.findOneAndUpdate(
    { identifier },
    [
      {
        $set: {
          failedCount: { $min: [{ $add: [{ $ifNull: ['$failedCount', 0] }, 1] }, MAX_FAILED_ATTEMPTS] },
          lockedUntil: { $ifNull: ['$lockedUntil', null] },
          updatedAt: '$$NOW',
        },
      },
    ],
    { upsert: true, new: true, timestamps: false },
  );
  return Math.max(MAX_FAILED_ATTEMPTS - (attempt?.failedCount ?? MAX_FAILED_ATTEMPTS), 0);
}

export async function resetAttempts(identifier: string): Promise<void> {
  await LoginAttemptModel.deleteOne({ identifier });
}

/** Solo se llama con la contraseña correcta: no revela el estado a quien no la conoce (research R5). */
export function assertCanSignIn(user: UserDocument): void {
  if (user.status === 'Bloqueado') {
    throw new AppError('AUTH_ACCOUNT_BLOCKED', 403, 'Tu cuenta está bloqueada. Contacta con un administrador.');
  }
  if (user.status === 'Invitado') {
    throw new AppError(
      'AUTH_INVITATION_PENDING',
      403,
      'Completa la invitación que has recibido antes de iniciar sesión.',
    );
  }
}

export function sessionExpiry(persistent: boolean, from: Date): Date {
  const ttl = persistent ? PERSISTENT_SESSION_DAYS * DAY_MS : IDLE_TIMEOUT_MIN * MINUTE_MS;
  return new Date(from.getTime() + ttl);
}

export async function createSession(
  user: UserDocument,
  options: { persistent: boolean; client: ClientKind },
): Promise<IssuedSession> {
  const now = new Date();
  const refreshToken = createRefreshToken();
  const session = await SessionModel.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    persistent: options.persistent,
    client: options.client,
    lastActivityAt: now,
    expiresAt: sessionExpiry(options.persistent, now),
    revokedAt: null,
  });
  await UserModel.updateOne({ _id: user._id }, { lastLoginAt: now });
  const accessToken = signAccessToken({ sub: user.id, sid: session.id, role: user.role });
  return { accessToken, refreshToken, user: toAuthUser(user) };
}

/** Orden de research R5: credenciales → estado → sesión. */
export async function login(input: LoginInput): Promise<IssuedSession> {
  const identifier = normalizeLogin(input.login);
  await retireBootstrapIfNeeded();
  const user = await findUserByLogin(identifier);
  const passwordOk = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !passwordOk) throw invalidCredentials(await registerFailure(identifier));
  assertCanSignIn(user);
  await resetAttempts(identifier);
  return createSession(user, input);
}

function isSessionActive(session: SessionDocument | null, userId: string): session is SessionDocument {
  if (!session || session.revokedAt) return false;
  return session.expiresAt > new Date() && session.userId.toString() === userId;
}

/** Comprueba en cada petición que la sesión y el usuario siguen siendo válidos (research R1). */
export async function resolveAuthContext(payload: AccessTokenPayload): Promise<AuthContext> {
  const session = await SessionModel.findById(payload.sid);
  if (!isSessionActive(session, payload.sub)) throw sessionExpired();
  const user = await UserModel.findById(payload.sub);
  if (!user || user.status !== 'Activo') throw sessionExpired();
  if (user.isBootstrap && (await retireBootstrapIfNeeded())) throw sessionExpired();
  return { userId: user.id, sessionId: session.id, role: user.role };
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw sessionExpired();
  return toAuthUser(user);
}
