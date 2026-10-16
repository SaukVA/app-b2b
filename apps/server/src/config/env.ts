import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// .env vive en la raíz del monorepo (src/config y dist/config están a la misma profundidad).
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Valida las variables de entorno una sola vez; lanza si falta alguna o no es válida. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variables de entorno no válidas o ausentes: ${fields}`);
  }
  cached = result.data;
  return cached;
}
