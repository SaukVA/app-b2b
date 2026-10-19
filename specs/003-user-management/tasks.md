---

description: "Task list for feature 003-user-management"
---

# Tasks: Gestión de usuarios (Ajustes › Usuarios)

**Input**: Design documents from `/specs/003-user-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/users-api.openapi.yaml, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) y el plan exigen:
- tests unitarios en los workspaces afectados;
- tests de integración del backend con supertest + mongodb-memory-server;
- tests de los componentes genéricos nuevos.

En cada fase los tests se escriben primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de
escribir los tests de cada fase se muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución:
US1 → US2 → US3 → US4 → US5 → US6.

**Reglas transversales** (aplican a todas las tareas):
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40, anidamiento
  ≤2 y early returns. Controladores y servicios ≤40 líneas efectivas.
- **Capas**: routes → controller → service → model. Ningún controlador importa modelos de Mongoose.
  Ninguna respuesta devuelve un documento: siempre `UserSummary`, `RoleSummary` o `AuthUser`.
- **Errores**: siempre `AppError` con los códigos de `USER_ERROR_CODES` (data-model.md) o los existentes
  (`VALIDATION_ERROR`, `AUTH_FORBIDDEN`). Nunca se exponen detalles internos (FR-023).
- **Contraseñas** (FR-022): nunca se registran, se devuelven ni se escriben en `userAuditEntries`.
- **Cliente**: los componentes nunca llaman a la API. Las llamadas viven en `features/users/usersApi.ts` y
  `features/roles/rolesApi.ts` y se usan desde thunks (ADR 0001).
- **Dependencias**: ninguna de terceros nueva (research R10).
- **Diseño**: el tablero `docs/design/canvas/Ajustes.dc.html` (pestaña Usuarios) ya está actualizado y es la
  referencia visual (research R9).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: registrar la decisión de arquitectura antes de tocar código

- [X] T001 Crear `docs/adr/0003-roles-permissions-in-database.md` con el formato de `docs/adr/0001-http-client-axios-thunks.md`, registrando research R11:
  - colección `roles` con `key`, `name`, `isAdmin`, `order` y `permissions`;
  - las claves iniciales son los nombres actuales, así que no hace falta migración;
  - siembra idempotente con `$setOnInsert` y `edit` forzado en el rol `isAdmin`;
  - módulos fijos en código;
  - permisos leídos en cada petición, sin caché;
  - `can(permissions, …)`;
  - alternativas descartadas: colección `permissions` aparte, *slugs* con migración, caché con TTL y
    `PERMISSIONS` como respaldo.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: roles y matriz en base de datos aplicados en toda la app, estado sin `Invitado`, DTO compartidos,
esqueleto de los módulos `users` y `roles`, componentes genéricos y layout de Ajustes

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase

### Shared

- [X] T002 [P] Reescribir `packages/shared/src/constants/roles.test.ts` para la nueva firma `can(permissions, module, level)`:
  - `edit` incluye `view`;
  - `view` no incluye `edit`;
  - un módulo ausente en el `PermissionSet` cuenta como `none`;
  - `APP_MODULES` es exactamente `['ventas','clientes','productos','proveedores','cobros','ajustes']`;
  - `ADMIN_ROLE_KEY === 'Administrador'`.
- [X] T003 Reescribir `packages/shared/src/constants/roles.ts`:
  - exporta `APP_MODULES` (`as const`), `AppModule` (derivado de `APP_MODULES`), `PermissionLevel`
    (`'edit' | 'view' | 'none'`), `PermissionSet` (`Readonly<Partial<Record<AppModule, PermissionLevel>>>`),
    `ADMIN_ROLE_KEY = 'Administrador'` y `can(permissions, module, level)`;
  - **elimina** `ROLES` y `PERMISSIONS` (research R11);
  - hace pasar T002.
- [X] T004 [P] Actualizar `packages/shared/src/types/user.ts` según data-model.md:
  - `Role = string` (clave de un documento de `roles`);
  - `UserStatus = 'Activo' | 'Bloqueado'`;
  - `UserSummary` (`id`, `name`, `email`, `role`, `roleName`, `status`, `lastLoginAt: string | null` en ISO
    8601);
  - `CreateUserRequest`, `CreateUserResponse` (`user`, `bootstrapRetired: boolean`), `UpdateUserRequest`
    (`name?`, `email?`, `role?`), `UpdateUserStatusRequest` y `ResetUserPasswordRequest`.
- [X] T005 [P] Crear `packages/shared/src/types/role.ts` con `RoleSummary` (`key`, `name`, `isAdmin`, `order`, `permissions: Record<AppModule, PermissionLevel>`, siempre completo). Ampliar `AuthUser` en `packages/shared/src/types/auth.ts` con `roleName: string` y `permissions: Record<AppModule, PermissionLevel>`.
- [X] T006 [P] Crear `packages/shared/src/constants/users.ts` con `USER_NAME_MAX_LENGTH = 100` y `USER_ERROR_CODES`:
  - `notFound: 'USER_NOT_FOUND'`, `emailTaken: 'USER_EMAIL_TAKEN'`;
  - `firstMustBeAdmin: 'USER_FIRST_MUST_BE_ADMIN'`, `lastAdmin: 'USER_LAST_ADMIN'`;
  - `selfBlock: 'USER_SELF_BLOCK'`, `roleNotFound: 'USER_ROLE_NOT_FOUND'`;
  - el objeto lleva `as const`.
- [X] T007 Actualizar `packages/shared/src/index.ts` para exportar los tipos y constantes nuevos de T003–T006 y quitar `ROLES` y `PERMISSIONS`. Ejecutar `npm run build --workspace=@app/shared`.

### Server: roles en base de datos

- [X] T008 [P] Escribir `apps/server/src/modules/roles/role.service.test.ts` (mongodb-memory-server):
  - **siembra en base vacía**: `ensureDefaultRoles()` crea los 4 roles con los valores de data-model.md;
  - **idempotencia**: una segunda llamada no duplica nada;
  - **sin sobrescribir**: un cambio guardado (por ejemplo `Almacén.permissions.clientes = 'view'`) se
    conserva tras volver a sembrar;
  - **rol `isAdmin`**: con `ajustes: 'none'` vuelve a `edit` en todos los módulos;
  - **`listRoles()`**: devuelve `RoleSummary[]` ordenado por `order` con los módulos ausentes como `'none'`;
  - **`findRole(key)`**: devuelve `null` si no existe.
- [X] T009 [P] Crear `apps/server/src/modules/roles/role.model.ts` (colección `roles`):
  - `key` (string, required, unique, trim);
  - `name` (string, required);
  - `isAdmin` (boolean, default false);
  - `order` (number, required);
  - `permissions`: subdocumento sin `_id` con un campo opcional por cada `APP_MODULES` y enum
    `['edit','view','none']`;
  - timestamps.
- [X] T010 [P] Crear `apps/server/src/modules/roles/role.defaults.ts` con `DEFAULT_ROLES` (los 4 roles de data-model.md: Administrador `isAdmin` `order` 1 con todo `edit`; Comercial 2 `ventas: edit, clientes: edit, productos: view, proveedores: none, cobros: view, ajustes: none`; Almacén 3 `ventas: view, clientes: none, productos: edit, proveedores: view, cobros: none, ajustes: none`; Administración 4 `ventas: view, clientes: view, productos: view, proveedores: edit, cobros: edit, ajustes: none`)
- [X] T011 Crear `apps/server/src/modules/roles/role.mapper.ts` y `apps/server/src/modules/roles/role.service.ts` (hacer pasar T008):
  - `role.mapper.ts` contiene `toPermissionSet(doc | null)`, que devuelve un conjunto completo con los
    ausentes como `none` (y todo `none` si `doc` es `null`), y `toRoleSummary(doc)`;
  - `role.service.ts` contiene:
    - `ensureDefaultRoles()`: `bulkWrite` con `updateOne` + `upsert` + `$setOnInsert` por cada rol por
      defecto y, después, `$set` de `edit` en todos los módulos del rol `isAdmin`;
    - `listRoles()`;
    - `findRole(key)`;
    - `findAdminRoleKeys()`.
- [X] T012 Llamar a `ensureDefaultRoles()` antes de `ensureBootstrapAccount()`:
  - en `apps/server/src/server.ts`;
  - en `apps/server/src/embedded.ts`, donde `ensureBootstrap` pasa a ser una función que ejecuta las dos
    en orden.

### Server: adaptar autenticación de 001

- [X] T013 [P] Actualizar `apps/server/src/modules/auth/auth.service.test.ts`:
  - **quitar** el caso de `Invitado` / `AUTH_INVITATION_PENDING`;
  - **añadir**: `resolveAuthContext` devuelve `permissions` leídos del documento del rol;
  - **añadir**: tras cambiar `permissions` en `roles`, la siguiente llamada ya devuelve el valor nuevo
    (FR-028);
  - **añadir**: un usuario con clave de rol inexistente obtiene todos los módulos en `none`;
  - **añadir**: `login`, `refresh` y `getCurrentUser` devuelven un `AuthUser` con `roleName` y `permissions`.
- [X] T014 [P] Cambiar en `apps/server/src/utils/tokens.ts` la validación del `role` del payload: de `ROLES.includes(...)` a «string no vacío». Ajustar `apps/server/src/utils/tokens.test.ts`.
- [X] T015 [P] Actualizar `apps/server/src/modules/users/user.model.ts`:
  - `status`: enum `['Activo', 'Bloqueado']` (sin `Invitado`, research R5);
  - `role`: `{ type: String, required: true, trim: true }` sin enum (research R11);
  - quitar el import de `ROLES`.
- [X] T016 Cambiar `toAuthUser` en `apps/server/src/modules/users/user.mapper.ts` a `toAuthUser(doc, role: RoleDocument | null)`, que devuelve `roleName` (`role?.name ?? doc.role`) y `permissions` (`toPermissionSet(role)`).
- [X] T017 Actualizar `apps/server/src/modules/auth/auth.service.ts` (hacer pasar T013):
  - quitar la rama `Invitado` de `assertCanSignIn`;
  - añadir `permissions: PermissionSet` a `AuthContext`;
  - en `resolveAuthContext`, cargar el rol con `findRole(user.role)` y rellenar `permissions`;
  - en `createSession`, `refresh` y `getCurrentUser`, cargar el rol y pasarlo a `toAuthUser`;
  - cada función queda en ≤40 líneas efectivas (extraer `loadRoleFor(user)` si hace falta).
- [X] T018 Cambiar `apps/server/src/middlewares/requirePermission.ts` para que use `can(req.auth.permissions, module, level)`.
- [X] T019 Actualizar el bloque `@openapi` de `apps/server/src/modules/auth/auth.routes.ts`:
  - `AuthUser.role` pasa a ser un string sin enum;
  - `AuthUser` añade `roleName` y `permissions` (objeto con los 6 módulos y enum `edit|view|none`);
  - se quita `AUTH_INVITATION_PENDING` de la respuesta 403 de `/auth/login`.
- [X] T020 Ajustar `apps/server/src/modules/auth/auth.routes.test.ts` y `apps/server/src/modules/auth/bootstrap.routes.test.ts`:
  - sembrar roles con `ensureDefaultRoles()` en `beforeEach`;
  - comprobar la forma nueva de `AuthUser` en `/auth/login`, `/auth/refresh` y `/auth/me`;
  - eliminar cualquier aserción sobre `Invitado`.

### Server: esqueleto de los módulos users y roles

- [X] T021 [P] Escribir `apps/server/src/modules/roles/role.routes.test.ts` (supertest + mongodb-memory-server):
  - `GET /api/roles` con un Administrador → 200, con los 4 `RoleSummary` en orden y `permissions` completos;
  - con un Comercial → 403 `AUTH_FORBIDDEN`;
  - sin token → 401.
- [X] T022 Crear `apps/server/src/modules/roles/role.controller.ts` (`list`, que envuelve `listRoles()` en el envelope) y `apps/server/src/modules/roles/role.routes.ts` con `GET /` protegido por `requireAuth` + `requirePermission('ajustes', 'edit')` y su bloque `@openapi` (copiado de contracts/users-api.openapi.yaml: `/roles`, `RoleSummary`, `PermissionSet`, `PermissionLevel`). Montarlo en `apps/server/src/app.ts` en `/api/roles` (hace pasar T021).
- [X] T023 [P] Crear `apps/server/src/modules/users/userAudit.model.ts` (colección `userAuditEntries`):
  - `action`: enum `['create','update','block','unblock','resetPassword']`;
  - `actorId` (ObjectId) y `actorLogin` (string);
  - `targetId` (ObjectId) y `targetLogin` (string);
  - `changes`: `[{ field: enum ['name','email','role','status'], from, to }]`, por defecto `[]`;
  - `createdAt` con `timestamps: { createdAt: true, updatedAt: false }`;
  - índices `{ targetId: 1, createdAt: -1 }` y `{ createdAt: -1 }`.
- [X] T024 [P] Crear `apps/server/src/modules/users/user.validation.ts` con zod (data-model.md › Validación):
  - campos base:
    - `name`: `string().trim().min(1).max(USER_NAME_MAX_LENGTH)`;
    - `email`: `string().trim().toLowerCase().email()`;
    - `role`: `string().trim().min(1)`;
    - `password`: `string().min(MIN_PASSWORD_LENGTH)`, sin `trim`;
    - `status`: `enum(['Activo','Bloqueado'])`;
    - `userIdParams`: `{ id: string().regex(/^[a-f0-9]{24}$/) }`;
  - esquemas compuestos:
    - `createUserSchema` (`name`, `email`, `role`, `password`);
    - `updateUserSchema` (los tres opcionales, con `refine` que exige al menos uno);
    - `updateStatusSchema`;
    - `resetPasswordSchema`;
  - los tipos inferidos se exportan.
- [X] T025 Crear los helpers comunes en `apps/server/src/modules/users/user.service.ts` (cada uno ≤20 líneas):
  - `findRealUserOrThrow(id)`: si no existe o `isBootstrap`, `USER_NOT_FOUND` 404;
  - `assertRoleExists(key)`: si no existe, devuelve el rol o lanza `USER_ROLE_NOT_FOUND` 400;
  - `isAdminRoleKey(key)`;
  - `toEmailTakenError(err)`: E11000 → `USER_EMAIL_TAKEN` 409, «Ya existe un usuario con ese email.»;
  - `recordAudit({ action, actor, target, changes })`;
  - `revokeUserSessions(userId)`: `SessionModel.updateMany` con `revokedAt`.
  Añadir también `toUserSummary(doc, roleName)` en `apps/server/src/modules/users/user.mapper.ts`, con `email` = `doc.login` y `lastLoginAt` en ISO o `null`.
- [X] T026 Crear `apps/server/src/modules/users/user.controller.ts` (vacío por ahora, con el helper `sendSuccess`) y `apps/server/src/modules/users/user.routes.ts`:
  - el router aplica `requireAuth` + `requirePermission('ajustes', 'edit')` a todas sus rutas;
  - lleva el bloque `@openapi` de componentes compartidos de contracts/users-api.openapi.yaml (`Role`,
    `UserStatus`, `UserSummary`, `Forbidden`, `UserNotFound`, `ValidationOrRoleError`, `UserId`);
  - se monta en `apps/server/src/app.ts` en `/api/users`.

### Client: adaptar permisos de 001

- [X] T027 [P] Actualizar los fixtures de `AuthUser` (con `roleName` y `permissions`) en:
  - `apps/client/src/routes/RequireAuth.test.tsx`;
  - `apps/client/src/features/auth/authSlice.test.ts`;
  - `apps/client/src/features/auth/components/LoginForm.test.tsx`;
  - `apps/client/src/features/auth/components/LogoutButton.test.tsx`;
  - y cualquier otro test que construya un usuario.
  Añadir a `RequireAuth.test.tsx` el caso «permiso concedido por `permissions` aunque el rol sea desconocido».
- [X] T028 Cambiar `apps/client/src/routes/homeRoute.ts` (importar `APP_MODULES` de `@app/shared` en lugar de definirlo y usar `can(user.permissions, …)`), `apps/client/src/routes/RequireAuth.tsx` (añadir la prop opcional `level` con valor por defecto `'view'` y usar `can(user.permissions, module, level)`) y `selectCan` en `apps/client/src/features/auth/authSelectors.ts` (usar `user.permissions`). Hace pasar T027.

### Client: componentes genéricos «Albarán» (test primero en cada uno)

- [X] T029 [P] `apps/client/src/components/Select.tsx` + `Select.module.css` + `Select.test.tsx`:
  - etiqueta con el estilo «Etiqueta» enlazada por `htmlFor`;
  - `options: { value, label }[]`;
  - `error` con `aria-invalid` y `aria-describedby`, como `TextField`;
  - alto 44 px y tokens de `docs/design/README.md`.
- [X] T030 [P] `apps/client/src/components/Table.tsx` + `Table.module.css` + `Table.test.tsx`:
  - recibe `columns` (`key`, `header`, `align?`, `render`), `rows`, `getRowKey`, `caption` (accesible) y
    `renderCard` (variante móvil);
  - en escritorio pinta `<table>` dentro de un contenedor con `overflow-x: auto`, cabecera en `surface2` y
    filas separadas por `borderRow`;
  - por debajo de 760 px pinta `article` por fila mediante container query;
  - el test comprueba cabeceras, filas y que la variante de tarjetas existe en el DOM.
- [X] T031 [P] `apps/client/src/components/StatusStamp.tsx` + `StatusStamp.module.css` + `StatusStamp.test.tsx`:
  - sello de estado con texto siempre visible en IBM Plex Mono, mayúsculas y marcador cuadrado;
  - `tone: 'ok' | 'danger' | 'warning' | 'neutral'`, con colores de `docs/design/README.md` (Activo
    `okBg`/`okFg`, Bloqueado `#FBE4E1`/`#A12A1C` y sus variantes oscuras).
- [X] T032 [P] `apps/client/src/components/Dialog.tsx` + `Dialog.module.css` + `Dialog.test.tsx`:
  - modal con `role="dialog"`, `aria-modal="true"` y `aria-labelledby` del título;
  - foco inicial en el primer control, foco atrapado y Escape para cerrar;
  - al cerrar, devuelve el foco al disparador;
  - recibe `title`, `description?`, `children`, `actions` y `onClose`;
  - fondo `rgba(22,25,29,0.55)`, ancho máximo 480 px y radio 10;
  - el test cubre la accesibilidad, Escape y el retorno de foco.
- [X] T033 [P] `apps/client/src/components/Tabs.tsx` + `Tabs.module.css` + `Tabs.test.tsx`:
  - pestañas de navegación (`<nav>` con enlaces de React Router y `aria-current="page"`) recibidas por props
    (`{ to, label }[]`);
  - estilo del grupo de pestañas del tablero de Ajustes (fondo `surface2`, radio 8, pestaña activa en
    `surface`);
  - objetivos de 44 px.
- [X] T033a [P] `apps/client/src/components/IconButton.tsx` + `IconButton.module.css` + `IconButton.test.tsx`:
  - botón de solo icono con `aria-label` obligatorio, objetivo de 44 px y foco visible;
  - reenvía `ref` y props ARIA (`aria-haspopup`, `aria-expanded`);
  - el test comprueba el nombre accesible y el clic.
- [X] T033b [P] `apps/client/src/components/Menu.tsx` + `Menu.module.css` + `Menu.test.tsx`:
  - recibe un disparador (`IconButton`) e `items: { label, onSelect, tone? }[]`;
  - `role="menu"` y `menuitem`, flechas, Escape (cierra y devuelve el foco) y clic fuera;
  - el test cubre la apertura, la navegación con teclado y Escape.

### Client: base de Ajustes, roles y usuarios

- [X] T034 [P] Crear `apps/client/src/features/roles/rolesApi.ts` (`fetchRoles()` → `RoleSummary[]` desde `GET /roles`) y `apps/client/src/features/roles/rolesSlice.ts`, con el estado `{ items, status, error }` y el thunk `loadRoles`, junto a `rolesSlice.test.ts` (estados `pending`, `fulfilled` y `rejected`, con el mensaje del envelope). Registrar `roles` en `apps/client/src/store/store.ts`.
- [X] T035 [P] Crear `apps/client/src/features/users/usersApi.ts` vacío (con el helper `toUsersErrorMessage(err)` que extrae `error.message` del envelope o devuelve el mensaje de conexión de `authApi`) y `apps/client/src/features/users/usersSlice.ts` con el estado `{ items: UserSummary[], status, error, saving }`. Registrar `users` en `apps/client/src/store/store.ts`.
- [X] T036 Crear `apps/client/src/pages/SettingsPage.tsx` (+ `.module.css`) y `UsersSettingsPage.tsx` (por ahora solo el encabezado) y actualizar `apps/client/src/routes/AppRouter.tsx`:
  - `SettingsPage` es el layout de Ajustes: título «Ajustes», subtítulo del tablero, `Tabs` y `<Outlet />`;
  - solo muestra la pestaña Usuarios si `selectCan('ajustes', 'edit')`;
  - en el router, `ajustes` deja de ser `ModulePlaceholder` y pasa a ser `RequireAuth` (solo sesión, sin
    `module`) → `SettingsPage`, con:
    - `index`: redirección a la primera pestaña permitida; si no hay ninguna, `SettingsPage` muestra
      «No hay ajustes disponibles para tu rol.» (hasta que 004 añada Apariencia);
    - hija `usuarios`: `RequireAuth module="ajustes" level="edit"` → `UsersSettingsPage`;
  - la ruta pública de escritorio `/ajustes/base-de-datos` de 002 no se toca.
  Añadir `apps/client/src/pages/SettingsPage.test.tsx`: un Administrador ve la pestaña Usuarios y un
  Comercial abre Ajustes sin verla (US3 AS3).

**Checkpoint**: la app compila, los permisos salen de `roles` en todas partes, `GET /api/roles` funciona y
`/ajustes/usuarios` se abre solo para Administradores.

---

## Phase 3: User Story 1 - Crear el primer Administrador con la cuenta inicial (Priority: P1) 🎯 MVP

**Goal**: con la cuenta inicial `admin` se crea el primer usuario, que tiene que ser Administrador. La cuenta
inicial se retira y la persona vuelve al login.

**Independent Test**: base vacía → entrar con `admin`/`admin` → crear un Administrador → `admin`/`admin` ya no
entra y el nuevo usuario sí (quickstart §2).

### Tests for User Story 1 ⚠️ (escribir primero, deben fallar)

- [X] T037 [P] [US1] Añadir a `apps/server/src/modules/users/user.service.test.ts` (mongodb-memory-server, roles sembrados) los casos de `createUser` sin usuarios reales:
  - con `role` distinto del rol `isAdmin` → `USER_FIRST_MUST_BE_ADMIN` 409 y no se crea nada;
  - con Administrador:
    - crea un usuario `Activo` con el email normalizado y la contraseña hasheada;
    - devuelve `bootstrapRetired: true`;
    - la cuenta inicial desaparece y sus sesiones quedan con `revokedAt`;
  - registra en `userAuditEntries` una entrada `create` con `actorLogin: 'admin'` y sin contraseña.
- [X] T038 [P] [US1] Crear `apps/server/src/modules/users/user.routes.test.ts` (supertest) con los casos de primer acceso:
  - login con `admin`/`admin` y `POST /api/users` con rol Comercial → 409 `USER_FIRST_MUST_BE_ADMIN`;
  - con Administrador → 201 y `data.bootstrapRetired === true`;
  - después, el access token de `admin` → 401 en `GET /api/roles`;
  - `POST /api/auth/login` con `admin`/`admin` → 401 `AUTH_INVALID_CREDENTIALS`;
  - el nuevo usuario inicia sesión.
- [X] T039 [P] [US1] Crear `apps/client/src/features/users/components/UserForm.test.tsx` en modo alta con `firstAdmin`:
  - el rol aparece como campo de solo lectura «Administrador» con la ayuda «El primer usuario tiene que ser
    Administrador.»;
  - el botón dice «Crear Administrador»;
  - no envía con campos vacíos ni con una contraseña de menos de 8 caracteres e indica el campo que falla;
  - al enviar llama a `onSubmit` con `role: ADMIN_ROLE_KEY`.

### Implementation for User Story 1

- [X] T040 [US1] Implementar `createUser(input, actor)` en `apps/server/src/modules/users/user.service.ts` (hace pasar T037):
  - pasos, con helpers pequeños:
    - `assertRoleExists`;
    - `assertFirstUserIsAdmin` (si `countRealUsers() === 0` y el rol no es `isAdmin`, lanza
      `USER_FIRST_MUST_BE_ADMIN` 409 con «El primer usuario tiene que ser Administrador.»);
    - `hashPassword`;
    - `UserModel.create` con `status: 'Activo'`, `isBootstrap: false` y `login: email`, convirtiendo E11000
      con `toEmailTakenError`;
    - `retireBootstrapIfNeeded()`;
    - `recordAudit('create')`;
  - devuelve `CreateUserResponse`.
- [X] T041 [US1] Añadir el handler `create` en `apps/server/src/modules/users/user.controller.ts` (201 con `CreateUserResponse`, `actor` desde `req.auth`) y `POST /` con `validate({ body: createUserSchema })` y su bloque `@openapi` (copiado del contrato) en `apps/server/src/modules/users/user.routes.ts` (hace pasar T038).
- [X] T042 [P] [US1] Añadir `createUser(body)` a `apps/client/src/features/users/usersApi.ts` y el thunk `createUser` a `apps/client/src/features/users/usersSlice.ts`:
  - `saving` durante la petición;
  - si va bien, añade `user` a `items` ordenado por nombre;
  - si falla, guarda el mensaje en `error`.
  Ampliar `usersSlice.test.ts` con estos casos.
- [X] T043 [US1] Crear `apps/client/src/features/users/components/UserForm.tsx` (+ `.module.css`) en modo alta (hace pasar T039):
  - campos: `TextField` Nombre y Email, `Select` Rol (con las opciones que recibe) y `PasswordField`
    «Contraseña inicial» con la ayuda «Mínimo 8 caracteres. No hace falta cambiarla en el primer acceso.»;
  - variante `firstAdmin`: el rol queda fijo y el botón dice «Crear Administrador»;
  - validación en cliente igual que la de zod;
  - un solo envío aunque se pulse varias veces.
- [X] T044 [US1] Completar `apps/client/src/pages/UsersSettingsPage.tsx` para el primer acceso:
  - si `user.isBootstrap`, muestra el aviso del tablero («Has entrado con la cuenta inicial «admin». Crea
    el primer usuario…», con `Alert` en tono de aviso) y `UserForm` en modo `firstAdmin`, con el texto
    «Todavía no hay usuarios…» en lugar del listado;
  - al crear con `bootstrapRetired`, despacha `sessionCleared()`, borra el refresh token de escritorio
    (`getDesktopBridge()?.clearRefreshToken()`) y navega a `/login` con
    `state.notice = 'Entra con el usuario que acabas de crear.'`.
- [X] T045 [US1] Mostrar en `apps/client/src/pages/LoginPage.tsx` el `state.notice` de la navegación con un `Alert` informativo sobre el formulario y cubrirlo en `apps/client/src/pages/LoginPage.test.tsx`.

**Checkpoint**: US1 funcional y comprobable por separado (quickstart §2).

---

## Phase 4: User Story 2 - Dar de alta un usuario (Priority: P1)

**Goal**: el Administrador da de alta usuarios con cualquier rol guardado, que pueden entrar al momento, y
puede corregir su nombre y su email (FR-024).

**Independent Test**: dar de alta a un Comercial y comprobar que entra; probar el email duplicado sin
distinguir mayúsculas; corregir el email y entrar con el nuevo (quickstart §3.1–3.3).

### Tests for User Story 2 ⚠️

- [X] T046 [P] [US2] Ampliar `apps/server/src/modules/users/user.service.test.ts`:
  - **alta con usuarios reales**: con cualquier rol existente → `Activo` y `bootstrapRetired: false`;
  - **errores de alta**:
    - `role: 'Inexistente'` → `USER_ROLE_NOT_FOUND` 400;
    - email `" Ana@Empresa.ES "` cuando ya existe `ana@empresa.es` → `USER_EMAIL_TAKEN` 409;
    - dos altas simultáneas con el mismo email → solo una tiene éxito;
  - **`updateUser` con nombre y email**:
    - cambia `login` y deja una entrada `update` con
      `changes: [{ field: 'email', from, to }, { field: 'name', … }]`;
    - email ya usado por otro → 409;
    - no revoca sesiones;
    - el email anterior ya no inicia sesión y el nuevo sí.
- [X] T047 [P] [US2] Ampliar `apps/server/src/modules/users/user.routes.test.ts`:
  - `POST /api/users` → 201 con el `UserSummary` (`roleName` incluido) y 400 `VALIDATION_ERROR` con
    contraseña de 7 caracteres, email sin formato o nombre vacío o de 101 caracteres;
  - `PATCH /api/users/:id` con `{ email }` → 200, `{}` → 400 e id inexistente → 404 `USER_NOT_FOUND`;
  - `PATCH /api/users/:id` con el id de la cuenta inicial → 404;
  - Comercial → 403 en `POST` y `PATCH`.
- [X] T048 [P] [US2] Ampliar `apps/client/src/features/users/components/UserForm.test.tsx`:
  - **modo alta normal**: el `Select` muestra los roles recibidos y el envío incluye el rol elegido;
  - **modo edición**: precarga nombre y email, no muestra el campo de contraseña y envía solo los campos
    cambiados;
  - **error del servidor**: se muestra en un `Alert`.

### Implementation for User Story 2

- [X] T049 [US2] Implementar `updateUser(id, input, actor)` en `apps/server/src/modules/users/user.service.ts` para `name` y `email` (el `role` llega en US4):
  - pasos: `findRealUserOrThrow`, calcular `changes` solo con los campos que cambian, `findOneAndUpdate`
    (convirtiendo E11000), `recordAudit('update')` si hay cambios;
  - devuelve `UserSummary` (hace pasar T046).
- [X] T050 [US2] Añadir el handler `update` y `PATCH /:id` con `validate({ params: userIdParams, body: updateUserSchema })` y su bloque `@openapi` en `apps/server/src/modules/users/user.controller.ts` y `user.routes.ts` (hace pasar T047).
- [X] T051 [P] [US2] Añadir `updateUser(id, body)` a `apps/client/src/features/users/usersApi.ts` y el thunk `updateUser` a `apps/client/src/features/users/usersSlice.ts`, que sustituye el elemento en `items`. Cubrirlo en `usersSlice.test.ts`.
- [X] T052 [US2] Ampliar `apps/client/src/features/users/components/UserForm.tsx` con el modo edición (nombre, email y rol) y las opciones de rol desde `RoleSummary[]`. Hace pasar T048.
- [X] T053 [US2] Completar `apps/client/src/pages/UsersSettingsPage.tsx` con la sección «Nuevo usuario» del tablero, con el subtítulo «Queda Activo y puede entrar en cuanto lo guardes. Comunícale la contraseña por tu cuenta: la aplicación no envía correos.»:
  - al montar despacha `loadRoles`;
  - `UserForm` en modo alta;
  - tras crear, limpia el formulario salvo el rol;
  - si hay error de conexión, conserva lo escrito salvo la contraseña.

**Checkpoint**: altas normales y corrección de nombre o email funcionan (la edición se abre desde el listado en
US3).

---

## Phase 5: User Story 3 - Consultar el listado de usuarios (Priority: P1)

**Goal**: listado con nombre, email, rol, último acceso y estado, con acciones por fila, en escritorio y en
móvil.

**Independent Test**: con varios usuarios de distintos roles y estados, la pestaña los muestra todos
correctamente; un Comercial no ve la pestaña (quickstart §3.4–3.5).

### Tests for User Story 3 ⚠️

- [X] T054 [P] [US3] Ampliar `apps/server/src/modules/users/user.service.test.ts` y `user.routes.test.ts` con `listUsers` / `GET /api/users`:
  - excluye la cuenta inicial;
  - ordena por nombre con *collation* `es` (Á antes de B);
  - `roleName` sale de `roles`;
  - `lastLoginAt` es `null` si nunca ha entrado;
  - Comercial → 403.
- [X] T055 [P] [US3] Crear `apps/client/src/features/users/components/UsersTable.test.tsx`:
  - pinta nombre, email, `roleName`, último acceso («Nunca» si `null`, si no fecha y hora con
    `APP_TIME_ZONE`) y el `StatusStamp` con el texto del estado;
  - marca «(tú)» en la fila del usuario actual;
  - el botón «Opciones de {nombre}» abre un menú con «Editar nombre, email o rol» y «Restablecer contraseña».

### Implementation for User Story 3

- [X] T056 [US3] Implementar `listUsers()` en `apps/server/src/modules/users/user.service.ts`:
  - consulta `UserModel.find({ isBootstrap: false }).collation({ locale: 'es' }).sort({ name: 1 })`;
  - toma los nombres de rol de una sola consulta a `roles` (mapa `key → name`);
  - aplica `toUserSummary`.
  Añadir el handler `list` y `GET /` con su `@openapi` en `user.controller.ts` y `user.routes.ts` (hace pasar T054).
- [X] T057 [P] [US3] Añadir `fetchUsers()` a `apps/client/src/features/users/usersApi.ts` y el thunk `loadUsers` a `usersSlice.ts`, con los estados `loading` y `failed` y su mensaje. Cubrirlo en `usersSlice.test.ts`.
- [X] T058 [US3] Crear `apps/client/src/features/users/components/UsersTable.tsx` (+ `.module.css`) componiendo `Table` (con tarjetas en móvil), `StatusStamp` y un menú de acciones por fila:
  - el menú compone `IconButton` (T033a) y `Menu` (T033b); `UsersTable` solo decide qué acciones mostrar;
  - las acciones se reciben por props: `onEdit`, `onResetPassword`, `onBlock` y `onUnblock`;
  - en esta fase solo se cablea `onEdit`;
  - hace pasar T055.
- [X] T059 [US3] Completar `apps/client/src/pages/UsersSettingsPage.tsx` con la sección «Usuarios» (contador «N usuarios», estados de carga y error con `Alert`):
  - al montar despacha `loadUsers`;
  - `onEdit` abre `Dialog` «Editar usuario» con `UserForm` en modo edición y despacha `updateUser`;
  - layout de dos columnas que se apila por debajo de 760 px, como en el tablero.
  Añadir `apps/client/src/pages/UsersSettingsPage.test.tsx`, que comprueba que lista los usuarios y abre la edición.

**Checkpoint**: US1–US3 completas (todas las P1). Se puede entregar como MVP ampliado.

---

## Phase 6: User Story 4 - Cambiar el rol y bloquear o desbloquear (Priority: P2)

**Goal**: cambiar el rol y bloquear o desbloquear, con efecto en las sesiones abiertas y sin quedarse nunca
sin un Administrador activo.

**Independent Test**: quickstart §4 (cambio de rol con la sesión abierta, bloqueo, desbloqueo, último
Administrador, autobloqueo y concurrencia).

### Tests for User Story 4 ⚠️

- [X] T060 [P] [US4] Ampliar `apps/server/src/modules/users/user.service.test.ts`:
  - **cambio de rol**: `updateUser` con `role` existente → cambia, deja entrada `update` con
    `{ field: 'role' }` y no revoca sesiones; rol inexistente → `USER_ROLE_NOT_FOUND`;
  - **último Administrador por cambio de rol**: degradar al único Administrador activo →
    `USER_LAST_ADMIN` 409 y el rol queda igual;
  - **bloqueo**: `setUserStatus(id, 'Bloqueado')` → estado cambiado, todas sus sesiones con `revokedAt`,
    entrada `block`, y su login posterior → `AUTH_ACCOUNT_BLOCKED`;
  - **desbloqueo**: estado `Activo`, entrada `unblock`, y entra con su contraseña de siempre;
  - **autobloqueo**: `USER_SELF_BLOCK` 409;
  - **último Administrador por bloqueo**: con un único Administrador activo A y un usuario X cuyo rol de
    prueba (insertado en `roles`) tiene `ajustes: edit`, X bloquea a A → `USER_LAST_ADMIN` 409 y A sigue
    `Activo`;
  - **concurrencia** (FR-016): con dos Administradores, `Promise.all` de dos bloqueos cruzados → como mucho
    uno tiene éxito, después hay al menos un Administrador activo y no queda ninguna entrada de auditoría de
    la acción rechazada.
- [X] T061 [P] [US4] Ampliar `apps/server/src/modules/users/user.routes.test.ts`:
  - `PATCH /api/users/:id/status` → 200 y 400 con `status: 'Invitado'`;
  - `PATCH /api/users/:id` con `role` → 200;
  - 409 `USER_SELF_BLOCK` y 409 `USER_LAST_ADMIN`;
  - el access token del usuario bloqueado → 401 en la petición siguiente;
  - tras cambiar su rol a Almacén, `GET /api/auth/me` del afectado devuelve los `permissions` de Almacén.
- [X] T062 [P] [US4] Ampliar `apps/client/src/features/users/components/UsersTable.test.tsx` y `UsersSettingsPage.test.tsx`:
  - «Bloquear» no aparece en la fila propia y «Desbloquear» solo en las bloqueadas;
  - «Bloquear» abre la confirmación «¿Bloquear a {nombre}?» y solo despacha al confirmar;
  - un cambio de rol pide confirmación;
  - un `USER_LAST_ADMIN` se muestra en `Alert` dentro del diálogo;
  - el cambio de rol propio despacha `loadMe`.

### Implementation for User Story 4

- [X] T063 [US4] Implementar en `apps/server/src/modules/users/user.service.ts` el helper `applyWithAdminGuard(id, update)` (research R2):
  - aplica el cambio con `findOneAndUpdate({ new: false })`;
  - si el usuario era un Administrador activo, cuenta `{ isBootstrap: false, status: 'Activo', role: { $in: adminRoleKeys } }`;
  - si da 0, compensa con `updateOne({ _id: id, ...update }, { $set: valoresAnteriores })` (solo restaura
    si el documento conserva los valores que puso esta llamada) y lanza `USER_LAST_ADMIN` 409 («Debe quedar
    al menos un Administrador activo.»);
  - ≤20 líneas, con subhelpers.
  Orden en `setUserStatus` y en `updateUser`: guarda → `revokeUserSessions` (solo al bloquear) →
  `recordAudit`. Una acción compensada no revoca sesiones ni se audita.
  Ampliar `updateUser` para `role` (`assertRoleExists` y guard) e implementar `setUserStatus(id, status, actor)`, que llama a `assertNotSelf` (`USER_SELF_BLOCK` 409, «No puedes bloquearte a ti mismo.»), al guard, a `revokeUserSessions` al bloquear y a `recordAudit('block' | 'unblock')`. Hace pasar T060.
- [X] T064 [US4] Añadir el handler `setStatus` y `PATCH /:id/status` con `validate({ params: userIdParams, body: updateStatusSchema })` y su `@openapi` en `apps/server/src/modules/users/user.controller.ts` y `user.routes.ts`. Actualizar el `@openapi` de `PATCH /:id` con el 409 `USER_LAST_ADMIN` (hace pasar T061).
- [X] T065 [P] [US4] Añadir `setUserStatus(id, status)` a `apps/client/src/features/users/usersApi.ts` y el thunk `setUserStatus` a `usersSlice.ts`. Si `updateUser` cambia el rol del usuario actual, despachar `loadMe()` de `authSlice`. Cubrirlo en `usersSlice.test.ts`.
- [X] T066 [US4] Cablear `onBlock` y `onUnblock` en `apps/client/src/features/users/components/UsersTable.tsx` y `apps/client/src/pages/UsersSettingsPage.tsx`:
  - **bloqueo**: `Dialog` de confirmación con el texto del tablero y el botón «Bloquear» en tono de
    peligro;
  - **desbloqueo**: directo;
  - **cambio de rol**: confirmación previa dentro del diálogo de edición, con el aviso «Un cambio de rol se
    aplica a sus sesiones abiertas en 15 minutos como máximo.»;
  - **errores**: en un `Alert` dentro del diálogo.
  Hace pasar T062.

**Checkpoint**: US4 comprobable por separado (quickstart §4).

---

## Phase 7: User Story 5 - Restablecer la contraseña de un usuario (Priority: P2)

**Goal**: el Administrador pone una contraseña nueva a un usuario. Sus sesiones se cierran y su bloqueo
temporal se reinicia.

**Independent Test**: quickstart §5.

### Tests for User Story 5 ⚠️

- [X] T067 [P] [US5] Ampliar `apps/server/src/modules/users/user.service.test.ts`:
  - **`resetUserPassword(id, password, actor)`**:
    - la contraseña anterior falla y la nueva funciona;
    - todas sus sesiones quedan con `revokedAt`;
    - se borra su `loginAttempts` (un usuario bloqueado 15 min entra al momento);
    - un `Bloqueado` sigue `Bloqueado`;
    - entrada `resetPassword` con `changes: []` y sin hash ni contraseña en el documento;
  - **autorrestablecimiento**: también revoca la sesión propia.
- [X] T068 [P] [US5] Ampliar `apps/server/src/modules/users/user.routes.test.ts`:
  - `PUT /api/users/:id/password` → 200 con `data: null` y 400 con 7 caracteres;
  - el access token del afectado → 401 en la petición siguiente.
- [X] T069 [P] [US5] Crear `apps/client/src/features/users/components/ResetPasswordDialog.test.tsx`:
  - título «Restablecer contraseña» y texto con el nombre;
  - no envía con menos de 8 caracteres;
  - llama a `onSubmit(password)`;
  - muestra el error recibido.

### Implementation for User Story 5

- [X] T070 [US5] Implementar `resetUserPassword(id, password, actor)` en `apps/server/src/modules/users/user.service.ts`:
  - pasos: `findRealUserOrThrow`, `hashPassword`, `updateOne` de `passwordHash`,
    `revokeUserSessions`, `resetAttempts(user.login)` y `recordAudit('resetPassword')`;
  - no cambia `status` (FR-019);
  - hace pasar T067.
- [X] T071 [US5] Añadir el handler `resetPassword` y `PUT /:id/password` con `validate({ params: userIdParams, body: resetPasswordSchema })` y su `@openapi` en `apps/server/src/modules/users/user.controller.ts` y `user.routes.ts` (hace pasar T068).
- [X] T072 [P] [US5] Añadir `resetUserPassword(id, password)` a `apps/client/src/features/users/usersApi.ts` y el thunk a `usersSlice.ts`. Si el afectado es el usuario actual, despachar `sessionCleared()`, limpiar el refresh token de escritorio y navegar a `/login`.
- [X] T073 [US5] Crear `apps/client/src/features/users/components/ResetPasswordDialog.tsx`, que compone `Dialog` y `PasswordField` con la ayuda «Mínimo 8 caracteres.» y el texto del tablero. Cablear `onResetPassword` en `UsersTable.tsx` y `UsersSettingsPage.tsx` (hace pasar T069).

**Checkpoint**: US5 comprobable por separado (quickstart §5).

---

## Phase 8: User Story 6 - Consultar la matriz de permisos por rol (Priority: P3)

**Goal**: ver la matriz guardada en la base de datos, con una columna por rol y de solo lectura.

**Independent Test**: quickstart §6 (valores iniciales, cambio y rol nuevo insertados en MongoDB, Administrador
restaurado al arrancar y rol inexistente rechazado).

### Tests for User Story 6 ⚠️

- [X] T074 [P] [US6] Crear `apps/client/src/features/users/components/PermissionsMatrix.test.tsx`:
  - con los 4 `RoleSummary` iniciales pinta 6 filas (Ventas, Clientes, Productos, Proveedores, Cobros,
    Ajustes) con E, V o — idénticos a FR-020;
  - un quinto rol añade una columna;
  - cada cabecera de rol lleva el nombre completo accesible (`abbr title` o texto oculto);
  - la leyenda «E = editar · V = solo ver · — = sin acceso» está presente;
  - no hay ningún control editable (ni `input`, ni `select`, ni `button`).

### Implementation for User Story 6

- [X] T075 [US6] Crear `apps/client/src/features/users/components/PermissionsMatrix.tsx` (+ `.module.css`):
  - recibe `roles: RoleSummary[]`;
  - filas en el orden de `APP_MODULES` con etiqueta legible y columnas en el orden de `order`;
  - celdas en IBM Plex Mono: `edit` → E, `view` → V, `none` → —;
  - subtítulo «Guardados en la base de datos. Solo lectura.» y leyenda;
  - hace pasar T074.
- [X] T076 [US6] Añadir la sección «Permisos por rol» con `PermissionsMatrix` a `apps/client/src/pages/UsersSettingsPage.tsx`, en la segunda columna y con los roles de `rolesSlice`. Añadir el caso a `UsersSettingsPage.test.tsx`.

**Checkpoint**: todas las historias completas.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T077 [P] Anotar en `specs/001-user-login/spec.md`:
  - FR-004: «el caso de invitación no completada queda sin efecto por 003-user-management (no hay estado
    Invitado)»;
  - FR-005: «la matriz se guarda en base de datos (003-user-management, FR-020)».
  Añadir al inicio de `specs/001-user-login/contracts/auth-api.openapi.yaml` una nota de que `AuthUser` y `AUTH_INVITATION_PENDING` los actualiza `specs/003-user-management/contracts/users-api.openapi.yaml`.
- [X] T078 [P] Comprobar que `/api-docs` coincide con `specs/003-user-management/contracts/users-api.openapi.yaml` (`/users`, `/users/{id}`, `/users/{id}/status`, `/users/{id}/password` y `/roles`, con códigos de error y esquemas) y con el `AuthUser` ampliado.
- [X] T079 [P] Revisar con `npm run lint` que las funciones nuevas o modificadas cumplen ≤40 líneas efectivas y anidamiento ≤2 (en especial `user.service.ts`, `auth.service.ts` y `role.service.ts`), y extraer helpers donde haga falta.
- [X] T080 [P] Revisar la accesibilidad de `/ajustes/usuarios` a 390 px y a 1440 px según `docs/design/README.md` y el tablero `Ajustes.dc.html`:
  - etiquetas, foco visible y foco en los diálogos;
  - menú con teclado;
  - objetivos de 44 px, contraste 4.5:1 y estado en texto;
  - sin scroll horizontal de la página.
- [X] T081 Comprobar que ningún log del servidor ni ninguna entrada de `userAuditEntries` contiene contraseñas o hashes (FR-022, SC-008), con una búsqueda en los tests y una revisión manual de la colección tras quickstart §7.
- [X] T082 Ejecutar `npm run lint` y `npm test --workspaces` en verde. Validar manualmente quickstart.md completo en web y, al menos §2–§4, en escritorio (`npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup y bloquea todas las historias. Orden interno:
  - Shared (T002–T007) antes que todo lo demás;
  - Server roles (T008–T012) antes de adaptar la autenticación (T013–T020);
  - esqueleto `users`/`roles` (T021–T026);
  - Client (T027–T036) en paralelo con el servidor una vez hecho Shared.
- **US1 (Fase 3)**: depende de Foundational. Es el MVP.
- **US2 (Fase 4)**: depende de US1 (comparte `createUser`, `UserForm` y la página).
- **US3 (Fase 5)**: depende de US2 (la edición se abre desde el listado con `UserForm` en modo edición).
- **US4 (Fase 6)**: depende de US3 (menú por fila) y de `updateUser` (US2).
- **US5 (Fase 7)**: depende de US3 (menú por fila). Independiente de US4.
- **US6 (Fase 8)**: depende solo de Foundational (`rolesSlice`) y de que exista la página. Se puede hacer en
  paralelo con US4 y US5.
- **Polish (Fase 9)**: al final.

### Story Completion Order

```text
Setup → Foundational → US1 → US2 → US3 ─┬─► US4
                                        ├─► US5
                                        └─► US6
                                                → Polish
```

### Within Each User Story

- Tests primero, y deben fallar.
- Servidor (servicio → controlador/rutas con `@openapi`) → cliente (API → slice → componentes → página).
- `user.service.ts`, `user.controller.ts`, `user.routes.ts`, `usersSlice.ts` y `UsersSettingsPage.tsx`
  los tocan varias historias: no paralelizar tareas de historias distintas sobre esos archivos.

---

## Parallel Example: Foundational

```text
# Tras T003 (roles.ts):
T004 types/user · T005 types/role + auth · T006 constants/users
# Servidor y cliente en paralelo:
T008 role.service.test · T009 role.model · T010 role.defaults · T013 auth.service.test · T014 tokens · T015 user.model
T027 fixtures cliente · T029 Select · T030 Table · T031 StatusStamp · T032 Dialog · T033 Tabs · T033a IconButton · T033b Menu · T034 roles slice · T035 users slice
```

## Parallel Example: User Story 1

```text
# Tests en paralelo:
T037 user.service.test (primer Administrador) · T038 user.routes.test · T039 UserForm.test
# Implementación: T040 → T041 en el servidor, en paralelo con T042 en el cliente; después T043 → T044 → T045
```

## Parallel Example: después de US3

```text
Dev A: US4 (T060–T066)   Dev B: US5 (T067–T073)   Dev C: US6 (T074–T076)
```

(US4 y US5 tocan `user.service.ts`, `user.routes.ts`, `UsersTable.tsx` y `UsersSettingsPage.tsx`: si se hacen
en paralelo, coordinar los cambios en esos archivos.)

---

## Implementation Strategy

### MVP (US1)

1. Fases 1 y 2: incluyen el cambio de roles a base de datos, que es lo de más riesgo porque toca 001.
   Ejecutar la suite completa al acabar la fase 2.
2. US1: primer Administrador y retirada de `admin`. **Parar y validar** (quickstart §2).

### Entrega incremental

3. US2 + US3: altas, edición y listado. Con esto se cierran los P1.
4. US4: rol, bloqueo y regla del último Administrador, incluida la concurrencia.
5. US5: restablecer contraseña.
6. US6: matriz de solo lectura desde la base de datos.
7. Polish.

### Notas

- Hacer commit al terminar cada tarea o grupo lógico (Conventional Commits, idioma consistente dentro de un
  mismo PR).
- No adelantar la edición de la matriz ni la creación de roles desde la app, el cambio de contraseña por el
  propio usuario, ni las pestañas Apariencia (004) y Base de datos (005): quedan fuera de alcance.
