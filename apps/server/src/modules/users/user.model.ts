import { model, Schema, type HydratedDocument } from 'mongoose';
import type {
  HomeScreen,
  MoneyFormat,
  Role,
  TableDensity,
  ThemePreference,
  UserStatus,
} from '@app/shared';

export interface UserFields {
  login: string;
  name: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  isBootstrap: boolean;
  /** Preferencias de apariencia (004); `null` = valor por defecto. */
  theme: ThemePreference | null;
  tableDensity: TableDensity | null;
  moneyFormat: MoneyFormat | null;
  homeScreen: HomeScreen | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserFields>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_STATUSES: UserStatus[] = ['Activo', 'Bloqueado'];
const HOME_SCREENS: HomeScreen[] = [
  'panel',
  'ventas',
  'clientes',
  'productos',
  'proveedores',
  'cobros',
];
const THEMES: ThemePreference[] = ['light', 'dark', 'system'];
const TABLE_DENSITIES: TableDensity[] = ['comfortable', 'compact'];
const MONEY_FORMATS: MoneyFormat[] = ['es', 'en'];

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
    theme: { type: String, enum: [...THEMES, null], default: null },
    tableDensity: { type: String, enum: [...TABLE_DENSITIES, null], default: null },
    moneyFormat: { type: String, enum: [...MONEY_FORMATS, null], default: null },
    homeScreen: { type: String, enum: [...HOME_SCREENS, null], default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const UserModel = model<UserFields>('User', userSchema);
