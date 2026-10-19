# Data Model: Gestión de usuarios (003-user-management)

## Colección `users` (existente, de 001; se modifica)

| Campo | Tipo | Cambio en 003 | Reglas |
|---|---|---|---|
| `login` | string | — | Email del usuario (o `admin` en la cuenta inicial). Único, en minúsculas y sin espacios. En la API se expone como `email`. |
| `name` | string | Obligatorio para usuarios reales | 1–100 caracteres sin espacios al principio ni al final (FR-006). |
| `passwordHash` | string | — | bcrypt coste 10, `select: false`. Nunca sale del servicio (FR-022). |
| `role` | `Role` (string) | **Deja de ser enum** (research R11) | Clave de un documento de `roles`; el servicio comprueba que existe. Los valores actuales (`Administrador`, `Comercial`, `Almacén`, `Administración`) son claves válidas sin migración. |
| `status` | `UserStatus` | **Se elimina `Invitado`** (research R5) | `Activo` o `Bloqueado`. |
| `isBootstrap` | boolean | — | `true` solo en la cuenta inicial; nunca aparece en el listado (FR-005). |
| `homeScreen` | `HomeScreen \| null` | — | Lo gestiona 004. |
| `lastLoginAt` | Date \| null | — | Lo escribe el login (001). En el listado, `null` se muestra como "Nunca". |
| `createdAt` / `updatedAt` | Date | — | Timestamps de Mongoose. |

### Transiciones de estado

```text
           alta (POST /users)
                  │
                  ▼
   ┌──────────► Activo ──── bloquear ────► Bloqueado
   │                                          │
   └────────────────── desbloquear ◄──────────┘
```

- **Bloquear**:
  - No se permite sobre uno mismo (`USER_SELF_BLOCK`).
  - Tampoco sobre el último Administrador activo (`USER_LAST_ADMIN`).
  - Revoca todas las sesiones del usuario.
- **Desbloquear**: solo cambia el estado; el usuario entra con su contraseña de siempre.
- **Restablecer contraseña**: no cambia el estado (FR-019).
- **Cambiar el rol de `Administrador` a otro**: no se permite si es el último Administrador activo.
- No hay borrado de usuarios.

### Invariante

En todo momento, si existe al menos un usuario real, hay **al menos un** usuario con `isBootstrap: false`,
`status: 'Activo'` y un `role` cuyo documento en `roles` tiene `isAdmin: true` (FR-016, FR-027). Se garantiza
con la compensación de research R2.

## Colección `roles` (nueva, research R11)

| Campo | Tipo | Reglas |
|---|---|---|
| `key` | string | Único e inmutable. Es lo que guarda `users.role`. Los roles iniciales usan como clave su nombre actual. |
| `name` | string | Nombre visible (selector de rol, listado y cabecera de la matriz). |
| `isAdmin` | boolean | `true` solo en el rol Administrador del sistema. Siempre tiene `edit` en todos los módulos (FR-027). |
| `order` | number | Orden de las columnas de la matriz y del selector. |
| `permissions` | `Partial<Record<AppModule, PermissionLevel>>` | `edit`, `view` o `none` por módulo. Un módulo ausente cuenta como `none` (FR-026). |
| `createdAt` / `updatedAt` | Date | Timestamps de Mongoose. |

- Índice único en `key`.
- **Siembra** (`ensureDefaultRoles()`, al arrancar el servidor y el backend embebido):
  - Inserta con `$setOnInsert` los roles por defecto que falten, sin sobrescribir los que ya existen.
  - Después fuerza `edit` en todos los módulos del rol `isAdmin`.
- **Valores por defecto** (`modules/roles/role.defaults.ts`), los de FR-020:

  | key / name | isAdmin | order | ventas | clientes | productos | proveedores | cobros | ajustes |
  |---|---|---|---|---|---|---|---|---|
  | Administrador | true | 1 | edit | edit | edit | edit | edit | edit |
  | Comercial | false | 2 | edit | edit | view | none | view | none |
  | Almacén | false | 3 | view | none | edit | view | none | none |
  | Administración | false | 4 | view | view | view | edit | edit | none |

- En esta entrega la aplicación solo lee esta colección; crear, editar o borrar roles queda para una spec
  futura. Si un usuario tiene una clave de rol que no existe, se le tratan todos los módulos como `none`.

## Colección `userAuditEntries` (nueva)

| Campo | Tipo | Reglas |
|---|---|---|
| `action` | enum | `create`, `update`, `block`, `unblock` o `resetPassword`. |
| `actorId` | ObjectId | Usuario que hizo la acción (puede ser la cuenta inicial, que luego desaparece). |
| `actorLogin` | string | Copia del login del autor en ese momento. |
| `targetId` | ObjectId | Usuario afectado. |
| `targetLogin` | string | Copia del email del afectado en ese momento. |
| `changes` | `{ field, from, to }[]` | Campos cambiados: `name`, `email`, `role` o `status`. Vacío en `resetPassword`. Nunca contiene contraseñas ni hashes. |
| `createdAt` | Date | Fecha y hora de la acción. |

- Solo se inserta; la aplicación nunca actualiza ni borra entradas.
- Índices: `{ targetId: 1, createdAt: -1 }` y `{ createdAt: -1 }`, para consultarlo en una futura pantalla.
- En esta entrega no hay endpoint de lectura.

## Colecciones relacionadas (de 001, sin cambios de esquema)

- **`sessions`**: al bloquear o restablecer la contraseña se marcan con `revokedAt` todas las sesiones
  activas del usuario. Al crear el primer Administrador, `retireBootstrapIfNeeded()` revoca las de la cuenta
  inicial.
- **`loginAttempts`**: al restablecer la contraseña se borra la entrada del email del usuario (FR-019). Al
  cambiar el email, la entrada del email anterior se deja caducar (TTL de 24 h).

## Tipos compartidos (`packages/shared`)

```ts
// constants/roles.ts (sustituye a ROLES y PERMISSIONS, que se eliminan)
export const APP_MODULES = ['ventas', 'clientes', 'productos', 'proveedores', 'cobros', 'ajustes'] as const;
export type AppModule = (typeof APP_MODULES)[number];
export type PermissionLevel = 'edit' | 'view' | 'none';
export type PermissionSet = Readonly<Partial<Record<AppModule, PermissionLevel>>>;
/** Clave del rol Administrador del sistema que crea la siembra. */
export const ADMIN_ROLE_KEY = 'Administrador';
/** `true` si el conjunto tiene al menos el nivel pedido en el módulo (ausente = none). */
export function can(permissions: PermissionSet, module: AppModule, level: PermissionLevel): boolean;

// types/role.ts (nuevo)
export interface RoleSummary {
  key: string;
  name: string;
  isAdmin: boolean;
  order: number;
  permissions: Record<AppModule, PermissionLevel>; // completo: los ausentes ya vienen como 'none'
}

// types/auth.ts (AuthUser de 001, se amplía)
export interface AuthUser {
  // … campos de 001 …
  role: Role;            // clave del rol
  roleName: string;      // nuevo
  permissions: Record<AppModule, PermissionLevel>; // nuevo, completo
}

// types/user.ts
export type Role = string; // clave de un documento de `roles` (antes, unión fija de 4 valores)
export type UserStatus = 'Activo' | 'Bloqueado';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleName: string;
  status: UserStatus;
  lastLoginAt: string | null; // ISO 8601
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

// constants/users.ts
export const USER_NAME_MAX_LENGTH = 100;
export const USER_ERROR_CODES = {
  notFound: 'USER_NOT_FOUND',
  emailTaken: 'USER_EMAIL_TAKEN',
  firstMustBeAdmin: 'USER_FIRST_MUST_BE_ADMIN',
  lastAdmin: 'USER_LAST_ADMIN',
  selfBlock: 'USER_SELF_BLOCK',
  roleNotFound: 'USER_ROLE_NOT_FOUND',
} as const;
```

`UserSummary` añade `roleName: string` para que el listado no tenga que cruzar los datos con los roles.

## Validación (zod, `user.validation.ts`)

| Campo | Regla |
|---|---|
| `name` | `string().trim().min(1).max(USER_NAME_MAX_LENGTH)` |
| `email` | `string().trim().toLowerCase().email()` |
| `role` | `string().trim().min(1)`; su existencia en `roles` la comprueba el servicio (`USER_ROLE_NOT_FOUND`, 400) |
| `password` | `string().min(MIN_PASSWORD_LENGTH)`; no se recorta |
| `status` | `enum(['Activo', 'Bloqueado'])` |
| `:id` | ObjectId válido (24 hex); si no lo es, `VALIDATION_ERROR`; si no existe o es la cuenta inicial, `USER_NOT_FOUND` |
| `UpdateUserRequest` | al menos uno de `name`, `email` o `role` |
