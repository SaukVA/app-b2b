import { model, Schema, type HydratedDocument } from 'mongoose';
import type { HomeScreen, UserStatus, Role } from '@app/shared';

export interface UserFields {
  login: string;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  isBootstrap: boolean;
  homeScreen: HomeScreen | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserFields>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_STATUSES: UserStatus[] = ['Activo', 'Bloqueado'];
const HOME_SCREENS: HomeScreen[] = ['panel', 'ventas', 'productos'];

/** El login es un email salvo en la cuenta inicial "admin". */
function isValidLogin(this: UserFields, login: string): boolean {
  return this.isBootstrap || EMAIL_PATTERN.test(login);
}

const userSchema = new Schema<UserFields>(
  {
    login: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: isValidLogin, message: 'El login debe ser un email válido' },
    },
    name: { type: String, default: '' },
    passwordHash: { type: String, required: true, select: false },
    // Clave de un documento de `roles`; su existencia la comprueba el servicio (ADR 0003).
    role: { type: String, required: true, trim: true },
    status: { type: String, enum: USER_STATUSES, required: true },
    isBootstrap: { type: Boolean, default: false, index: true },
    homeScreen: { type: String, enum: [...HOME_SCREENS, null], default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const UserModel = model<UserFields>('User', userSchema);
