import { model, Schema, type HydratedDocument } from 'mongoose';
import { APP_MODULES, type AppModule, type PermissionLevel } from '@app/shared';

export interface RoleFields {
  /** Única e inmutable: es lo que guarda `users.role` (ADR 0003). */
  key: string;
  name: string;
  isAdmin: boolean;
  order: number;
  /** Un módulo ausente cuenta como `none` (FR-026). */
  permissions: Partial<Record<AppModule, PermissionLevel>>;
  createdAt: Date;
  updatedAt: Date;
}

export type RoleDocument = HydratedDocument<RoleFields>;

const PERMISSION_LEVELS: PermissionLevel[] = ['edit', 'view', 'none'];

const permissionsSchema = new Schema(
  Object.fromEntries(
    APP_MODULES.map((module) => [module, { type: String, enum: PERMISSION_LEVELS }]),
  ),
  { _id: false },
);

const roleSchema = new Schema<RoleFields>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    order: { type: Number, required: true },
    permissions: { type: permissionsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const RoleModel = model<RoleFields>('Role', roleSchema);
