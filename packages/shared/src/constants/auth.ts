import type { HomeScreen } from '../types/user';

export const ACCESS_TOKEN_TTL_SEC = 900;
export const IDLE_TIMEOUT_MIN = 30;
export const PERSISTENT_SESSION_DAYS = 30;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;
/** Provisional mientras no exista el Panel (data-model.md). */
export const DEFAULT_HOME_SCREEN: HomeScreen = 'productos';
export const BOOTSTRAP_LOGIN = 'admin';
