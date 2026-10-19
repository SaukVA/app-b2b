import { model, Schema, type HydratedDocument, type Types } from 'mongoose';

export type UserAuditAction = 'create' | 'update' | 'block' | 'unblock' | 'resetPassword';
export type UserAuditField = 'name' | 'email' | 'role' | 'status';

export interface UserAuditChange {
  field: UserAuditField;
  from: string | null;
  to: string | null;
}

/** Registro de acciones de gestión de usuarios (FR-025). Solo se inserta; NEVER guarda contraseñas. */
export interface UserAuditFields {
  action: UserAuditAction;
  actorId: Types.ObjectId;
  actorLogin: string;
  targetId: Types.ObjectId;
  targetLogin: string;
  changes: UserAuditChange[];
  createdAt: Date;
}

export type UserAuditDocument = HydratedDocument<UserAuditFields>;

const ACTIONS: UserAuditAction[] = ['create', 'update', 'block', 'unblock', 'resetPassword'];
const FIELDS: UserAuditField[] = ['name', 'email', 'role', 'status'];

const changeSchema = new Schema<UserAuditChange>(
  {
    field: { type: String, enum: FIELDS, required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { _id: false },
);

const userAuditSchema = new Schema<UserAuditFields>(
  {
    action: { type: String, enum: ACTIONS, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorLogin: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetLogin: { type: String, required: true },
    changes: { type: [changeSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'userAuditEntries' },
);

userAuditSchema.index({ targetId: 1, createdAt: -1 });
userAuditSchema.index({ createdAt: -1 });

export const UserAuditModel = model<UserAuditFields>('UserAuditEntry', userAuditSchema);
