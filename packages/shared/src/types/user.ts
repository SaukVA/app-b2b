/** Clave de un documento de la colección `roles` (ADR 0003). */
export type Role = string;

export type UserStatus = 'Activo' | 'Bloqueado';

export type HomeScreen = 'panel' | 'ventas' | 'clientes' | 'productos' | 'proveedores' | 'cobros';

/** Usuario en Ajustes › Usuarios. NEVER incluye la contraseña ni su hash. */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleName: string;
  status: UserStatus;
  /** ISO 8601; `null` si nunca ha iniciado sesión ("Nunca"). */
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: Role;
  password: string;
}

export interface CreateUserResponse {
  user: UserSummary;
  /** true si esta alta ha retirado la cuenta inicial "admin" (primer Administrador). */
  bootstrapRetired: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: Role;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface ResetUserPasswordRequest {
  password: string;
}
