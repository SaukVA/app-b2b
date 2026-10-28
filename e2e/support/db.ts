import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { ensureBootstrapAccount } from '../../apps/server/src/modules/auth/bootstrap.service';
import {
  SupplierModel,
  type SupplierFields,
} from '../../apps/server/src/modules/suppliers/supplier.model';
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

/** Proveedor sembrado: nombre, CIF normalizado y dirección completa; el resto toma el valor por defecto. */
export type SeedSupplier = Pick<
  SupplierFields,
  'name' | 'cif' | 'address' | 'postalCode' | 'city'
> &
  Partial<SupplierFields>;

const SEED_AUTHOR = { id: '000000000000000000000000', login: 'admin' };

/** Siembra proveedores como si los hubiera dado de alta la cuenta inicial (010, research R12). */
export async function seedSuppliers(suppliers: SeedSupplier[]): Promise<void> {
  await connect();
  await SupplierModel.insertMany(
    suppliers.map((supplier) => ({
      version: 0,
      createdBy: SEED_AUTHOR,
      updatedBy: SEED_AUTHOR,
      ...supplier,
    })),
  );
}

/** Borra todos los proveedores de la base de datos E2E. */
export async function removeSuppliers(): Promise<void> {
  await connect();
  await SupplierModel.deleteMany({});
  await mongoose.disconnect();
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
