# Implementation Plan: Gestión de usuarios (Ajustes › Usuarios)

**Branch**: `003-user-management` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-user-management/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Pestaña Ajustes › Usuarios, solo para Administradores, en web y escritorio. Incluye alta (también la del
primer Administrador con la cuenta inicial), listado, edición de nombre, email y rol, bloqueo y
desbloqueo, restablecimiento de contraseña, matriz de permisos de solo lectura y registro de acciones sin
pantalla. Enfoque técnico:

- **Servidor**: módulo `modules/users/` completo sobre el modelo `User` que ya existe, con
  `requirePermission('ajustes', 'edit')`.
  - Los cambios llegan a las sesiones abiertas gracias a la comprobación por petición de 001: el bloqueo y
    el restablecimiento revocan las sesiones; el cambio de rol se aplica en la siguiente petición (R1).
  - La regla "al menos un Administrador activo" se garantiza con actualización optimista y compensación,
    sin transacciones (R2).
  - El email es único gracias al índice que ya existe (R3).
  - La cuenta inicial se retira con `retireBootstrapIfNeeded()` de 001 (R4).
  - Nueva colección `userAuditEntries`, de solo inserción (R6).
  - **Roles y matriz en base de datos** (R11): módulo `modules/roles/` con la colección `roles`, la
    siembra idempotente al arrancar y `GET /roles`.
    - `resolveAuthContext` carga los permisos del rol en cada petición, y `requirePermission` los usa.
    - Los módulos siguen en código.
    - Sin edición en esta entrega. Se registra como ADR 0003.
- **Shared**:
  - `UserStatus` sin `Invitado` (R5) y nuevos DTO de gestión.
  - `Role` pasa a ser una clave `string`.
  - `ROLES` y `PERMISSIONS` desaparecen en favor de `APP_MODULES`, `PermissionSet`, `RoleSummary` y
    `can(permissions, …)`.
  - `AuthUser` añade `roleName` y `permissions`.
- **Cliente**:
  - `features/users/` y `features/roles/` (slice + API con thunks).
  - `homeRoute`, `RequireAuth` y `selectCan` pasan a usar `user.permissions`.
  - Layout de Ajustes con pestañas.
  - 7 componentes genéricos nuevos de «Albarán» (`Select`, `Table`, `StatusStamp`, `Dialog`, `Tabs`,
    `IconButton`, `Menu`).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**: las existentes. Servidor: Express 5.1, Mongoose 8.24, zod 3.24 y bcryptjs 2.4.
Cliente: React 19, React Router 7.18, Redux Toolkit 2.5 y axios 1.20. **Sin dependencias nuevas** (R10).

**Storage**: MongoDB 8.0.
- Se modifica `users`: el estado sin `Invitado` y el rol pasa de enum a clave.
- Se añaden `roles` (con siembra) y `userAuditEntries`.
- Se usan `sessions` y `loginAttempts` de 001.

**Testing**: Jest 30 + ts-jest. Servidor: supertest + mongodb-memory-server. Cliente: Testing Library +
jsdom.

**Target Platform**: igual que 001: servidor Linux/Windows, navegadores actuales y Electron 34 con backend
embebido (002).

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `apps/desktop` sin
cambios, `packages/shared`).

**Performance Goals**: alta completa en menos de 1 min de interacción (SC-001). Cada operación responde
en menos de 500 ms; el hash bcrypt (~150 ms) es lo más lento.

**Constraints**:
- Los cambios llegan a las sesiones en 15 min como máximo (aclaración del 2026-10-16).
- Sin transacciones multi-documento, porque la MongoDB puede ser standalone.
- Contraseñas nunca en claro ni en el registro de acciones.
- Funciones de 40 líneas efectivas como máximo; controladores y servicios cortos (constitución IV).

**Scale/Scope**: decenas de usuarios y pocos roles, así que el listado no necesita búsqueda ni paginación y
no hace falta caché de roles. 6 endpoints (5 de usuarios y 1 de roles), 1 pestaña con 3 diálogos y 7
componentes genéricos. Además, se adaptan las piezas de 001 que leían la matriz fija.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cómo lo cumple el diseño | Estado |
|---|---|---|---|
| I | Organización por dominio | Todo en `apps/server/src/modules/users/` (modelo, auditoría, rutas, controlador, servicio, validación y tests) y `apps/client/src/features/users/` | ✅ |
| II | Contrato API primero | [contracts/users-api.openapi.yaml](contracts/users-api.openapi.yaml) → bloques `@openapi` en `user.routes.ts`; envelope; `AppError` con códigos `USER_*`; se actualiza el `@openapi` de `/auth/login` (sin `AUTH_INVITATION_PENDING`) | ✅ |
| III | Validación en el borde | `user.validation.ts` (body y params) con `validate()` en cada ruta | ✅ |
| IV | Funciones cortas y capas | routes → controller → service → model. Helpers pequeños con nombre (`assertNotSelf`, `applyWithAdminGuard`, `revokeUserSessions`, `recordAudit`, `toUserSummary`); controlador sin Mongoose; DTO `UserSummary` | ✅ |
| V | Cambios mínimos | Se reutilizan `requirePermission`, `retireBootstrapIfNeeded`, `hashPassword`, `resetAttempts` y la comprobación por petición. Guardar roles y matriz en la base de datos (decisión del usuario) obliga a tocar piezas de 001: `roles.ts`, `auth.service.ts`, `user.mapper.ts`, `requirePermission.ts`, `homeRoute.ts`, `RequireAuth.tsx`, `authSelectors.ts` y sus tests, más el arranque (`server.ts`, `embeddedRuntime.ts`). Es el mínimo para que haya una sola fuente de verdad (ver Complexity Tracking). No es una refactorización: es el cambio funcional que exigen FR-020, FR-021 y FR-028, aprobado por el usuario en la aclaración del 2026-10-16. Para facilitar la revisión, la fase 2 (T001–T036) se entrega en un PR propio antes de las historias | ⚠️ justificado |
| VI | Tipos compartidos | `Role` (clave), `UserStatus`, `AppModule`/`APP_MODULES`, `PermissionSet`, `RoleSummary`, `AuthUser` ampliado, `UserSummary`, `CreateUserRequest`/`Response`, `UpdateUserRequest`, `UpdateUserStatusRequest`, `ResetUserPasswordRequest` y `USER_ERROR_CODES` en `packages/shared`; `can()` sigue siendo la única función de comprobación | ✅ |
| VII | Testing obligatorio | `user.service.test.ts` (reglas: primer Administrador, último Administrador, autobloqueo, revocación y auditoría), `user.routes.test.ts` (supertest + mongodb-memory-server, 403 por rol, 409, 404), tests de los 5 componentes genéricos y de `usersSlice` | ✅ |
| VIII | Componentes reutilizables | `Select`, `Table` (+ tarjetas en móvil), `StatusStamp`, `Dialog`, `Tabs`, `IconButton` y `Menu` en `components/`, con tokens de `docs/design/README.md`; los componentes de `features/users/components` solo los componen | ✅ |
| — | Dependencias nuevas | Ninguna | ✅ |
| — | ADR | ADR 0003 "Roles y matriz de permisos en base de datos": cambia dónde vive una definición central que usan todas las features (R11) | ✅ previsto |
| — | Diseño | Lienzo de Ajustes › Usuarios actualizado el 2026-10-16 (alta directa, sin invitaciones, menú por fila, diálogos, primer Administrador, matriz por roles) junto con `docs/design/` (R9) | ✅ hecho |

**Resultado (antes y después del diseño)**: PASA, con la ampliación del principio V justificada en Complexity
Tracking. Queda una tarea previa: el ADR 0003 (R11). El diseño (R9) ya está actualizado.

## Project Structure

### Documentation (this feature)

```text
specs/003-user-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── users-api.openapi.yaml
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
docs/adr/0003-roles-permissions-in-database.md   # nuevo (R11)

packages/shared/src/
├── types/user.ts                 # Role = string, UserStatus sin Invitado + DTO de gestión (data-model.md)
├── types/role.ts                 # nuevo: RoleSummary
├── types/auth.ts                 # AuthUser + roleName, permissions
├── constants/roles.ts            # APP_MODULES, PermissionSet, ADMIN_ROLE_KEY, can(permissions…); sin ROLES/PERMISSIONS
├── constants/roles.test.ts       # adaptado a la nueva firma de can()
├── constants/users.ts            # nuevo: USER_NAME_MAX_LENGTH, USER_ERROR_CODES
└── index.ts                      # exporta lo nuevo

apps/server/src/
├── app.ts                        # monta /api/users y /api/roles
├── server.ts, embeddedRuntime.ts # + ensureDefaultRoles() al arrancar
├── middlewares/requirePermission.ts  # can(req.auth.permissions, …)
├── modules/auth/
│   ├── auth.service.ts           # sin rama Invitado; resolveAuthContext carga permisos del rol
│   ├── auth.service.test.ts      # sin test de Invitado; + permisos desde roles
│   └── auth.routes.ts            # @openapi: AuthUser con roleName/permissions, sin AUTH_INVITATION_PENDING
├── modules/roles/                # nuevo
│   ├── role.model.ts, role.defaults.ts, role.service.ts (ensureDefaultRoles, listRoles, findRole)
│   ├── role.controller.ts, role.routes.ts (GET /roles con @openapi)
│   └── role.service.test.ts, role.routes.test.ts
└── modules/users/
    ├── user.model.ts             # enum de estado sin Invitado; role sin enum
    ├── user.mapper.ts            # toAuthUser con permisos del rol + toUserSummary
    ├── userAudit.model.ts        # nuevo: userAuditEntries
    ├── user.validation.ts        # nuevo
    ├── user.service.ts           # nuevo: list, create, update, setStatus, resetPassword + helpers
    ├── user.controller.ts        # nuevo
    ├── user.routes.ts            # nuevo, con @openapi
    ├── user.service.test.ts      # nuevo
    └── user.routes.test.ts       # nuevo

apps/client/src/
├── components/                   # nuevos, cada uno .tsx + .module.css + .test.tsx
│   ├── Select, Table, StatusStamp, Dialog, Tabs, IconButton, Menu
├── features/users/
│   ├── usersApi.ts, usersSlice.ts, usersSlice.test.ts
│   └── components/
│       ├── UsersTable.tsx        # tabla/tarjetas + acciones por fila
│       ├── UserForm.tsx          # alta y edición (rol fijo en el primer Administrador)
│       ├── ResetPasswordDialog.tsx
│       └── PermissionsMatrix.tsx # pinta los roles de GET /roles
├── features/roles/               # nuevo: rolesApi.ts, rolesSlice.ts, rolesSlice.test.ts
├── features/auth/authSelectors.ts  # selectCan con user.permissions
├── pages/
│   ├── SettingsPage.tsx          # layout de Ajustes con Tabs (por ahora solo Usuarios)
│   └── UsersSettingsPage.tsx
├── routes/
│   ├── AppRouter.tsx             # /ajustes → SettingsPage, hija /ajustes/usuarios
│   ├── homeRoute.ts              # APP_MODULES de @app/shared; can(user.permissions, …)
│   └── RequireAuth.tsx (+ test)  # can(user.permissions, …)
└── store/store.ts                # registra usersReducer y rolesReducer

docs/design/                      # Ajustes.dc.html y README.md actualizados (R9)
```

**Structure Decision**: monorepo por dominio de CLAUDE.md. El módulo `users`, que en 001 solo tenía el
modelo, pasa a ser un módulo completo. `apps/desktop` no cambia: el escritorio usa la misma API a través
de su backend embebido (002).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Cambios fuera del módulo en piezas de 001 (principio V): `can()`, `Role`, `AuthUser`, `requirePermission`, `resolveAuthContext`, `homeRoute`, `RequireAuth`, `selectCan` y arranque | El usuario decidió guardar roles y matriz en la base de datos para poder ampliarlos sin tocar código (aclaración 2026-10-16). Todo lo que leía la matriz fija tiene que leerla de una sola fuente (FR-021) | Mantener `PERMISSIONS` en código además de la base de datos deja dos fuentes de verdad que pueden diverger; leer la base de datos solo en la pestaña sin aplicarla haría que la matriz mostrada no fuese la aplicada |
