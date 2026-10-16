import bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;

/** Hash fijo para comparar aunque el usuario no exista: el tiempo de respuesta no revela si el email existe. */
const DUMMY_HASH = bcrypt.hashSync('dummy-password-para-tiempo-constante', BCRYPT_COST);

/** Email (o "admin") sin espacios al principio ni al final y en minúsculas (FR-002). */
export function normalizeLogin(raw: string): string {
  return raw.trim().toLowerCase();
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && matches;
}
