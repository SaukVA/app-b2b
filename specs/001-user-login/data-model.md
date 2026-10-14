# Data Model: Inicio de sesión (001-user-login)

Los tipos de dominio (DTOs) viven en `packages/shared/src/types/auth.ts` y `user.ts`. Los esquemas de
Mongoose viven en `apps/server/src/modules/auth/` y `apps/server/src/modules/users/`. NEVER se devuelve un
documento de Mongoose: siempre se mapea a DTO.

## User (colección `users`)

Este módulo solo lee y actualiza los campos de acceso. El alta, edición y borrado de usuarios reales
corresponden al módulo de usuarios. El esquema se define aquí porque es la primera funcionalidad que lo
necesita.

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | |
| `login` | string | Único. Email normalizado (minúsculas, sin espacios) o `"admin"` en la cuenta inicial. |
| `name` | string | Obligatorio en usuarios reales. |
| `passwordHash` | string | Hash `bcryptjs` (coste 10). NEVER se serializa (`select: false`). |
| `role` | `Role` | `Administrador` \| `Comercial` \| `Almacén` \| `Administración`. |
| `status` | `UserStatus` | `Activo` \| `Invitado` \| `Bloqueado`. |
| `isBootstrap` | boolean | `true` solo en la cuenta inicial. Índice. |
| `homeScreen` | `HomeScreen` \| null | Pantalla de inicio preferida (Ajustes › Apariencia). |
| `lastLoginAt` | Date \| null | Se actualiza en cada login correcto (FR-024). |
| `createdAt`, `updatedAt` | Date | Timestamps de Mongoose. |

**Validaciones**: `login` cumple el formato de email salvo cuando `isBootstrap = true`. La contraseña de
un usuario real tiene al menos 8 caracteres (FR-023); el módulo de usuarios lo valida al crearla.

**Estados** (los cambia el módulo de usuarios; este módulo solo los consulta):

```text
Invitado ──(completa alta)──► Activo ◄──(desbloquear)──► Bloqueado
```

Solo `Activo` puede iniciar sesión (FR-004).

## Session (colección `sessions`)

| Campo | Tipo | Reglas |
|---|---|---|
| `_id` | ObjectId | Es el `sid` del access token. |
| `userId` | ObjectId → User | Índice. |
| `refreshTokenHash` | string | SHA-256 del refresh token vigente. Índice único. |
| `persistent` | boolean | "Mantener la sesión iniciada en este equipo". |
| `client` | `"web"` \| `"desktop"` | |
| `createdAt` | Date | |
| `lastActivityAt` | Date | Se actualiza como mucho una vez por minuto (R3). |
| `expiresAt` | Date | Persistente: `createdAt + 30 d`. No persistente: se recalcula como `lastActivityAt + 30 min`. Índice TTL. |
| `revokedAt` | Date \| null | Logout, reutilización detectada, bloqueo o retirada de la cuenta inicial. |

**Una sesión es válida si** `revokedAt = null`, `expiresAt > ahora` y el usuario existe con
`status = Activo`.

**Transiciones**:

```text
creada (login) ──refresh──► rotada (nuevo hash, mismo _id)
   │                          │
   ├──logout / bloqueo / retirada de "admin"──► revocada
   ├──inactividad > 30 min (no persistente)──► caducada
   └──30 días (persistente)──► caducada
Refresh con un hash antiguo ya rotado ⇒ reutilización ⇒ revocada
```

## LoginAttempt (colección `loginAttempts`)

| Campo | Tipo | Reglas |
|---|---|---|
| `identifier` | string | Identificador normalizado. Único. Existe aunque no haya usuario (R4). |
| `failedCount` | number | 0–5. |
| `lockedUntil` | Date \| null | `ahora + 15 min` al llegar a 5. |
| `updatedAt` | Date | Índice TTL de 24 h. |

**Reglas**: un fallo suma 1 y, al llegar a 5, fija `lockedUntil`. Un login correcto o el fin del bloqueo
reinician `failedCount` a 0. Los errores de conexión no llegan al servidor y no cuentan (FR-017).

## Tipos compartidos (`packages/shared`)

```ts
type Role = 'Administrador' | 'Comercial' | 'Almacén' | 'Administración';
type UserStatus = 'Activo' | 'Invitado' | 'Bloqueado';
type AppModule = 'ventas' | 'clientes' | 'productos' | 'proveedores' | 'cobros' | 'ajustes';
type PermissionLevel = 'edit' | 'view' | 'none';
type HomeScreen = 'panel' | 'ventas' | 'productos';
type ClientKind = 'web' | 'desktop';

interface AuthUser { id: string; login: string; name: string; role: Role; isBootstrap: boolean; homeScreen: HomeScreen | null; }
interface LoginRequest { login: string; password: string; persistent: boolean; client: ClientKind; }
interface LoginResponse { accessToken: string; refreshToken?: string; user: AuthUser; } // refreshToken solo con client = desktop
```

Matriz `PERMISSIONS` (copia de Ajustes › Usuarios; E = `edit`, V = `view`, — = `none`):

| Módulo | Administrador | Comercial | Almacén | Administración |
|---|---|---|---|---|
| Ventas | E | E | V | V |
| Clientes | E | E | — | V |
| Productos | E | V | E | V |
| Proveedores | E | — | V | E |
| Cobros | E | V | — | E |
| Ajustes | E | — | — | — |

`DEFAULT_HOME_SCREEN = 'productos'` es provisional mientras no exista el Panel.
