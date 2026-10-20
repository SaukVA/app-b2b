import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { ensureBootstrapAccount } from '../../apps/server/src/modules/auth/bootstrap.service';
import { UserModel } from '../../apps/server/src/modules/users/user.model';
import { hashPassword } from '../../apps/server/src/utils/password';
import { E2E_MONGO_URI_FILE } from './mongoUriFile';

// Datos sembrados directamente en la base de datos del servidor E2E. Dar de alta usuarios por la API
// retiraría la cuenta inicial "admin" (003), que necesitan smoke.spec.ts y los tests de tema.

export interface SeedUser {
  login: string;
  name: string;
  role: string;
  password: string;
}

async function connect(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(readFileSync(E2E_MONGO_URI_FILE, 'utf8'));
}

export async function seedUsers(users: SeedUser[]): Promise<void> {
  await connect();
  const docs = await Promise.all(
    users.map(async ({ password, ...user }) => ({
      ...user,
      passwordHash: await hashPassword(password),
      status: 'Activo' as const,
      isBootstrap: false,
    })),
  );
  await UserModel.insertMany(docs);
}

/**
 * Borra los usuarios sembrados y vuelve a crear la cuenta inicial: cualquier login con usuarios reales en
 * la base de datos la retira (auth.service, retireBootstrapIfNeeded).
 */
export async function removeUsers(logins: string[]): Promise<void> {
  await connect();
  await UserModel.deleteMany({ login: { $in: logins } });
  await ensureBootstrapAccount();
  await mongoose.disconnect();
}
