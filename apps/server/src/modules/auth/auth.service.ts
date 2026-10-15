import {
  APP_TIME_ZONE,
  IDLE_TIMEOUT_MIN,
  LOCK_MINUTES,
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
import { SessionModel, type SessionDocument, type SessionFields } from './session.model';

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
  return new AppError(
    'AUTH_INVALID_CREDENTIALS',
    401,
    `Email o contraseña incorrectos. ${attempts}`,
  );
}

function sessionExpired(): AppError {
  return new AppError(
    'AUTH_SESSION_EXPIRED',
    401,
    'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  );
}

export function findUserByLogin(login: string): Promise<UserDocument | null> {
  return UserModel.findOne({ login }).select('+passwordHash').exec();
}

const timeFormat = new Intl.DateTimeFormat('es-ES', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function accountLocked(lockedUntil: Date): AppError {
  const time = timeFormat.format(lockedUntil);
  return new AppError(
    'AUTH_ACCOUNT_LOCKED',
    423,
    `Demasiados intentos. Vuelve a intentarlo a las ${time}.`,
  );
}

/**
 * Suma un fallo y, al llegar a MAX_FAILED_ATTEMPTS, bloquea el identificador LOCK_MINUTES (research R4).
 * Devuelve el error que ve el usuario: intentos restantes o la hora de fin del bloqueo.
 */
export async function registerFailure(identifier: string): Promise<AppError> {
  const lockUntil = new Date(Date.now() + LOCK_MINUTES * MINUTE_MS);
  const nextCount = {
    $min: [{ $add: [{ $ifNull: ['$failedCount', 0] }, 1] }, MAX_FAILED_ATTEMPTS],
  };
  const attempt = await LoginAttemptModel.findOneAndUpdate(
    { identifier },
    [
      { $set: { failedCount: nextCount, updatedAt: '$$NOW' } },
      {
        $set: {
          lockedUntil: {
            $cond: [{ $gte: ['$failedCount', MAX_FAILED_ATTEMPTS] }, lockUntil, null],
          },
        },
      },
    ],
    { upsert: true, new: true, timestamps: false },
  );
  if (attempt?.lockedUntil) return accountLocked(attempt.lockedUntil);
  return invalidCredentials(MAX_FAILED_ATTEMPTS - (attempt?.failedCount ?? 0));
}

/** Paso 2 de R5: con un bloqueo vigente no se mira la contraseña; si ya expiró, el contador vuelve a 0 (FR-016). */
export async function assertNotLocked(identifier: string): Promise<void> {
  const attempt = await LoginAttemptModel.findOne({ identifier });
  if (!attempt?.lockedUntil) return;
  if (attempt.lockedUntil.getTime() > Date.now()) throw accountLocked(attempt.lockedUntil);
  await resetAttempts(identifier);
}

export async function resetAttempts(identifier: string): Promise<void> {
  await LoginAttemptModel.deleteOne({ identifier });
}

/** Solo se llama con la contraseña correcta: no revela el estado a quien no la conoce (research R5). */
export function assertCanSignIn(user: UserDocument): void {
  if (user.status === 'Bloqueado') {
    throw new AppError(
      'AUTH_ACCOUNT_BLOCKED',
      403,
      'Tu cuenta está bloqueada. Contacta con un administrador.',
    );
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

/** Orden de research R5: bloqueo temporal → credenciales → estado → sesión. */
export async function login(input: LoginInput): Promise<IssuedSession> {
  const identifier = normalizeLogin(input.login);
  await retireBootstrapIfNeeded();
  await assertNotLocked(identifier);
  const user = await findUserByLogin(identifier);
  const passwordOk = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !passwordOk) throw await registerFailure(identifier);
  assertCanSignIn(user);
  await resetAttempts(identifier);
  return createSession(user, input);
}

function isSessionActive(
  session: SessionDocument | null,
  userId: string,
): session is SessionDocument {
  if (!session || session.revokedAt) return false;
  return session.expiresAt > new Date() && session.userId.toString() === userId;
}

/** El usuario de una sesión válida sigue existiendo, está Activo y no es una cuenta inicial ya retirada. */
async function loadSessionUser(userId: string): Promise<UserDocument> {
  const user = await UserModel.findById(userId);
  if (!user || user.status !== 'Activo') throw sessionExpired();
  if (user.isBootstrap && (await retireBootstrapIfNeeded())) throw sessionExpired();
  return user;
}

/** Sin "Mantener la sesión", cada actividad alarga la caducidad 30 min; la persistente no se alarga (R3). */
function activityUpdate(persistent: boolean, now: Date): Partial<SessionFields> {
  if (persistent) return { lastActivityAt: now };
  return { lastActivityAt: now, expiresAt: sessionExpiry(false, now) };
}

/** Registra actividad como mucho una vez por minuto para no escribir en cada petición (R3). */
export async function touchSession(session: SessionDocument, now = new Date()): Promise<void> {
  if (now.getTime() - session.lastActivityAt.getTime() < MINUTE_MS) return;
  await SessionModel.updateOne({ _id: session._id }, activityUpdate(session.persistent, now));
}

/** Comprueba en cada petición que la sesión y el usuario siguen siendo válidos (research R1). */
export async function resolveAuthContext(payload: AccessTokenPayload): Promise<AuthContext> {
  const session = await SessionModel.findById(payload.sid);
  if (!isSessionActive(session, payload.sub)) throw sessionExpired();
  const user = await loadSessionUser(payload.sub);
  await touchSession(session);
  return { userId: user.id, sessionId: session.id, role: user.role };
}

export interface RefreshedSession extends IssuedSession {
  persistent: boolean;
  client: ClientKind;
}

/** Un refresh token ya rotado que vuelve a llegar indica robo: se revoca su sesión. */
async function revokeReusedSession(tokenHash: string): Promise<void> {
  await SessionModel.updateOne(
    { previousRefreshTokenHash: tokenHash, revokedAt: null },
    { revokedAt: new Date() },
  );
}

/** Rotación atómica: si otro refresh ganó la carrera con el mismo token, no se encuentra y cuenta como reutilización. */
async function rotateSession(
  session: SessionDocument,
  tokenHash: string,
): Promise<{ session: SessionDocument; refreshToken: string }> {
  const refreshToken = createRefreshToken();
  const rotated = await SessionModel.findOneAndUpdate(
    { _id: session._id, refreshTokenHash: tokenHash },
    {
      refreshTokenHash: hashToken(refreshToken),
      previousRefreshTokenHash: tokenHash,
      ...activityUpdate(session.persistent, new Date()),
    },
    { new: true },
  );
  if (!rotated) throw sessionExpired();
  return { session: rotated, refreshToken };
}

/** Valida el refresh token, lo rota y emite un access token nuevo (research R1 y R3). */
export async function refresh(token: string | undefined): Promise<RefreshedSession> {
  if (!token) throw sessionExpired();
  const tokenHash = hashToken(token);
  const current = await SessionModel.findOne({ refreshTokenHash: tokenHash });
  if (!current) {
    await revokeReusedSession(tokenHash);
    throw sessionExpired();
  }
  if (!isSessionActive(current, current.userId.toString())) throw sessionExpired();
  const user = await loadSessionUser(current.userId.toString());
  const { session, refreshToken } = await rotateSession(current, tokenHash);
  const accessToken = signAccessToken({ sub: user.id, sid: session.id, role: user.role });
  return {
    accessToken,
    refreshToken,
    user: toAuthUser(user),
    persistent: session.persistent,
    client: session.client,
  };
}

/** Revoca la sesión: ni su access ni su refresh token vuelven a valer (FR-013). */
export async function logout(sessionId: string): Promise<void> {
  await SessionModel.updateOne({ _id: sessionId, revokedAt: null }, { revokedAt: new Date() });
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await UserModel.findById(userId);
  if (!user) throw sessionExpired();
  return toAuthUser(user);
}
