---

description: "Task list for feature 001-user-login"
---

# Tasks: Inicio de sesión (login)

**Input**: Design documents from `/specs/001-user-login/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.openapi.yaml, contracts/desktop-bridge.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige tests unitarios junto al código, tests de
integración con supertest + mongodb-memory-server y tests de los componentes reutilizables. En cada historia
los tests se escriben primero y deben FALLAR antes de implementar.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución:
US1 → US7 → US2 → US3 → US4 → US5 → US6.

**Reglas transversales** (aplican a todas las tareas):
- Funciones de ≤20 líneas efectivas como referencia y nunca >40; anidamiento ≤2; early returns (principio IV).
- routes → controller → service → model; ningún controlador importa Mongoose; respuestas mapeadas a DTOs de
  `packages/shared` (principios IV y VI).
- Toda ruta con su bloque JSDoc `@openapi`, igual al de `contracts/auth-api.openapi.yaml` (principio II).
- Componentes genéricos sin lógica de negocio ni llamadas a la API, estilados con `styles/tokens.css`
  (principio VIII).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US7)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: montar el monorepo con el stack de CLAUDE.md y las dependencias aprobadas

- [X] T001 Crear `package.json` raíz con `"private": true`, `"workspaces": ["apps/*", "packages/*"]`, `"engines": { "node": ">=22.12.0" }`, scripts `dev` (concurrently server + client + desktop), `lint`, `format`, `test` y devDependencies TypeScript 5.7, ESLint 9, typescript-eslint 8, Prettier 3.4, Jest 30, ts-jest 29.2, concurrently 9 en `package.json`
- [X] T002 [P] Crear `tsconfig.base.json` (strict, `moduleResolution: bundler`, `paths` para `@app/shared`) en la raíz
- [X] T003 [P] Crear `eslint.config.js` (flat config + typescript-eslint, regla `max-lines-per-function` 40 con `skipBlankLines` y `skipComments`, `max-depth` 2) y `.prettierrc` en la raíz
- [X] T004 [P] Crear `docker-compose.yml` con servicio `mongo:8.0` en el puerto 27017 y volumen nombrado
- [X] T005 [P] Crear `.env.example` con `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `CORS_ORIGINS`, `NODE_ENV` (sin valores reales)
- [X] T006 [P] Inicializar `packages/shared` (`package.json` con nombre `@app/shared`, `tsconfig.json`, `jest.config.ts`, `src/index.ts`)
- [X] T007 [P] Inicializar `apps/server` (`package.json` con Express 5.1, Mongoose 8.9, zod 3.24, jsonwebtoken 9.0, bcryptjs 2.4, swagger-jsdoc 6.2, swagger-ui-express 5.0, dotenv 16, cookie-parser 1.4, cors 2.8; dev: supertest 7.0, mongodb-memory-server 10, tsx; `tsconfig.json`; `jest.config.ts` con ts-jest)
- [X] T008 [P] Inicializar `apps/client` con Vite 6 + React 19 (`package.json` con React Router 7.1, Redux Toolkit 2.5, React Redux 9.2, axios 1.7; dev: @testing-library/react, @testing-library/user-event, jest-environment-jsdom; `vite.config.ts` con proxy `/api` → servidor; `index.html`; `jest.config.ts` con entorno jsdom y `moduleNameMapper` para `*.module.css`)
- [X] T009 [P] Inicializar `apps/desktop` (`package.json` con Electron 34 y electron-builder 25, `tsconfig.json`, script `dev` que carga la URL de Vite)
- [X] T010 Actualizar la tabla de Tecnologías de `CLAUDE.md` añadiendo cookie-parser 1.4.x y cors 2.8.x en `apps/server` y @testing-library/react, @testing-library/user-event y jest-environment-jsdom en `apps/client`, con su uso
- [X] T011 [P] Crear `docs/adr/0001-http-client-axios-thunks.md` registrando la decisión R8 de research.md (axios + createAsyncThunk frente a RTK Query)
- [X] T012 Ejecutar `npm install` en la raíz y comprobar que `npm run lint` y `npm test --workspaces` se ejecutan sin errores (con 0 tests)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infraestructura que necesitan todas las historias

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase

### Shared

- [X] T013 [P] Crear tipos del envelope `ApiSuccess<T>` (`{ success: true, data: T }`) y `ApiError` (`{ success: false, error: { code: string, message: string } }`) en `packages/shared/src/types/api.ts`
- [X] T014 [P] Crear `Role` (`'Administrador' | 'Comercial' | 'Almacén' | 'Administración'`), `UserStatus` (`'Activo' | 'Invitado' | 'Bloqueado'`), `HomeScreen` (`'panel' | 'ventas' | 'productos'`) en `packages/shared/src/types/user.ts`
- [X] T015 [P] Crear `AppModule`, `PermissionLevel` (`'edit' | 'view' | 'none'`), `ROLES` y la matriz `PERMISSIONS` exactamente como en data-model.md, más `can(role, module, level)` en `packages/shared/src/constants/roles.ts`
- [X] T016 [P] Crear constantes `ACCESS_TOKEN_TTL_SEC = 900`, `IDLE_TIMEOUT_MIN = 30`, `PERSISTENT_SESSION_DAYS = 30`, `MAX_FAILED_ATTEMPTS = 5`, `LOCK_MINUTES = 15`, `MIN_PASSWORD_LENGTH = 8`, `DEFAULT_HOME_SCREEN = 'productos'`, `BOOTSTRAP_LOGIN = 'admin'` en `packages/shared/src/constants/auth.ts`
- [X] T017 [P] Crear `ClientKind`, `AuthUser`, `LoginRequest`, `LoginResponse` según data-model.md en `packages/shared/src/types/auth.ts` y `DesktopBridge` según contracts/desktop-bridge.md en `packages/shared/src/types/desktop.ts`
- [X] T018 Exportar todos los tipos y constantes desde `packages/shared/src/index.ts`
- [X] T019 [P] Test unitario de `can()` cubriendo las 24 celdas de la matriz en `packages/shared/src/constants/roles.test.ts`

### Server

- [X] T020 [P] Crear `config/env.ts` que valida las variables de entorno con zod y falla al arrancar si falta alguna en `apps/server/src/config/env.ts`
- [X] T021 [P] Crear `connectDatabase()` / `disconnectDatabase()` con Mongoose en `apps/server/src/config/database.ts`
- [X] T022 [P] Crear clase `AppError` (`code`, `status`, `message`) en `apps/server/src/utils/AppError.ts`
- [X] T023 Crear middleware `errorHandler` que traduce `AppError` al envelope de error, responde 500 `INTERNAL_ERROR` en lo demás y nunca expone `stack` si `NODE_ENV=production` en `apps/server/src/middlewares/errorHandler.ts`
- [X] T024 [P] Crear middleware `validate({ body?, params?, query? })` con zod que lanza `AppError('VALIDATION_ERROR', 400)` en `apps/server/src/middlewares/validate.ts`
- [X] T025 [P] Crear configuración swagger-jsdoc que lee los `@openapi` de `src/modules/**/*.routes.ts` en `apps/server/src/docs/swagger.ts`
- [X] T026 Crear modelo `User` con los campos de data-model.md: `login` (string, único, minúsculas, formato email salvo `isBootstrap`), `name`, `passwordHash` (`select: false`), `role` (enum Role), `status` (enum UserStatus), `isBootstrap` (boolean, índice), `homeScreen` (enum HomeScreen, nullable), `lastLoginAt` (Date, nullable), timestamps en `apps/server/src/modules/users/user.model.ts`
- [X] T027 [P] Crear `toAuthUser(doc)` que mapea un User a `AuthUser` en `apps/server/src/modules/users/user.mapper.ts`
- [X] T028 [P] Crear ruta `GET /api/health` → `{ success: true, data: { status: 'ok' } }` con su bloque `@openapi` en `apps/server/src/modules/health/health.routes.ts`
- [X] T029 Crear `buildApp()` con `express.json()`, `cookie-parser`, `cors` (orígenes de `CORS_ORIGINS` con `credentials: true`), `/api/health`, `/api-docs` y `errorHandler` al final en `apps/server/src/app.ts`
- [X] T030 Crear arranque (`connectDatabase` + `listen`) en `apps/server/src/server.ts`
- [X] T031 Crear helper de tests que levanta mongodb-memory-server y limpia colecciones entre tests en `apps/server/src/utils/testDb.ts`
- [X] T032 [P] Test de integración de `/api/health` y de un 404/500 con el envelope de error en `apps/server/src/modules/health/health.test.ts`

### Client

- [X] T033 [P] Crear tokens de color (claro y oscuro con `[data-theme="dark"]`), tipografía, espaciado y radios de `docs/design/README.md` como custom properties en `apps/client/src/styles/tokens.css` y estilos base (IBM Plex Sans/Mono, `body` con `--bg`) en `apps/client/src/styles/global.css`
- [X] T034 [P] Crear instancia axios con `baseURL` resuelta por `resolveApiBaseUrl()` (`window.desktop` → `getServerUrl()`, si no `/api`) y `withCredentials: true` en `apps/client/src/utils/httpClient.ts`
- [X] T035 [P] Crear `isDesktop()` y `getDesktopBridge()` que leen `window.desktop` tipado con `DesktopBridge` en `apps/client/src/utils/desktop.ts`
- [X] T036 Crear store de Redux Toolkit vacía con `RootState` y `AppDispatch` tipados en `apps/client/src/store/store.ts`
- [X] T037 Crear `AppRouter` con React Router 7 (ruta `/login` y layout raíz) y montar store + router en `apps/client/src/App.tsx` y `apps/client/src/main.tsx`

### Desktop

- [X] T038 Crear `main.ts` con `BrowserWindow` (`contextIsolation: true`, `nodeIntegration: false`, `preload`) que carga la URL de Vite en dev y `app://` en producción en `apps/desktop/src/main.ts`
- [X] T039 [P] Crear lectura y escritura de `userData/config.json` (`serverUrl`, con `DEFAULT_SERVER_URL` por defecto) usando `fs` en `apps/desktop/src/ipc/config.ts`

**Checkpoint**: base lista. `npm run dev` levanta servidor, cliente y escritorio; `/api/health` y `/api-docs` responden.

---

## Phase 3: User Story 1 - Iniciar sesión con email y contraseña (Priority: P1) 🎯 MVP

**Goal**: un usuario `Activo` entra con email y contraseña y llega a su pantalla de inicio con los
permisos de su rol; las credenciales erróneas dan un mensaje genérico con los intentos restantes.

**Independent Test**: insertar un usuario `Activo` en `users`, entrar con sus credenciales y llegar a la
pantalla de inicio; con contraseña errónea (email existente o no) ver el mismo mensaje y el mismo contador.

### Tests for User Story 1 ⚠️ (escribir primero, deben fallar)

- [X] T040 [P] [US1] Tests unitarios de `normalizeLogin` (mayúsculas y espacios), `hashPassword`/`verifyPassword` y `signAccessToken`/`verifyAccessToken` en `apps/server/src/utils/password.test.ts` y `apps/server/src/utils/tokens.test.ts`
- [X] T041 [P] [US1] Tests unitarios de `auth.service` (`login`): credenciales correctas; contraseña errónea con email existente e inexistente (mismo mensaje y contador; `failedCount` sube); estado `Bloqueado` → `AUTH_ACCOUNT_BLOCKED` solo con contraseña correcta; `Invitado` → `AUTH_INVITATION_PENDING`; `lastLoginAt` actualizado en `apps/server/src/modules/auth/auth.service.test.ts`
- [X] T042 [P] [US1] Tests de integración con supertest de `POST /api/auth/login` (200, 400 `VALIDATION_ERROR`, 401 `AUTH_INVALID_CREDENTIALS`, 403), `GET /api/auth/me` (200 y 401 `AUTH_UNAUTHENTICATED`) y de que la respuesta nunca contiene `passwordHash` en `apps/server/src/modules/auth/auth.routes.test.ts`
- [X] T043 [P] [US1] Tests de componentes `Button`, `TextField`, `PasswordField` (alternar visibilidad, `aria-label` "Mostrar/Ocultar contraseña", `aria-pressed`), `Checkbox`, `Alert` (`role="alert"`) y `BrandMark` en `apps/client/src/components/*.test.tsx`
- [X] T044 [P] [US1] Test de `LoginForm`: campos vacíos marcan el campo que falta sin llamar a la API; envío correcto despacha `login`; el error se muestra en `Alert`; "Entrar" deshabilitado mientras hay petición en curso; "¿La has olvidado?" muestra "Contacta con un administrador para restablecer tu contraseña" sin llamar a la API en `apps/client/src/features/auth/components/LoginForm.test.tsx`
- [X] T045 [P] [US1] Test de `RequireAuth`: sin sesión redirige a `/login` conservando `from`; tras el login navega a `from`, si no a `homeScreen`, si no a `DEFAULT_HOME_SCREEN`, y si el rol no tiene acceso, a la pantalla por defecto en `apps/client/src/routes/RequireAuth.test.tsx`

### Implementation for User Story 1

- [X] T046 [P] [US1] Implementar `normalizeLogin(raw)` (trim + minúsculas), `hashPassword` y `verifyPassword` con bcryptjs coste 10 y un `DUMMY_HASH` para comparar en tiempo constante cuando el usuario no existe en `apps/server/src/utils/password.ts`
- [X] T047 [P] [US1] Implementar `signAccessToken({ sub, sid, role })` (15 min) y `verifyAccessToken` con jsonwebtoken y `JWT_ACCESS_SECRET`, más `createRefreshToken()` (`crypto.randomBytes(32)`) y `hashToken()` (SHA-256) en `apps/server/src/utils/tokens.ts`
- [X] T048 [P] [US1] Crear modelo `Session` según data-model.md: `userId` (índice), `refreshTokenHash` (único), `persistent`, `client` (`'web' | 'desktop'`), `lastActivityAt`, `expiresAt` (índice TTL `expireAfterSeconds: 0`), `revokedAt` (nullable) en `apps/server/src/modules/auth/session.model.ts`
- [X] T049 [P] [US1] Crear modelo `LoginAttempt` según data-model.md: `identifier` (único), `failedCount` (0–5), `lockedUntil` (nullable), `updatedAt` con índice TTL de 24 h en `apps/server/src/modules/auth/loginAttempt.model.ts`
- [X] T050 [P] [US1] Crear esquemas zod `loginSchema` (`login` string trim min 1, `password` string min 1, `persistent` boolean, `client` enum web|desktop) en `apps/server/src/modules/auth/auth.validation.ts`
- [X] T051 [US1] Implementar en `auth.service.ts` las funciones `findUserByLogin`, `registerFailure(identifier)` (devuelve intentos restantes), `resetAttempts`, `assertCanSignIn(user)` (estado) y `createSession(user, { persistent, client })` (emite access y refresh, guarda el hash y actualiza `lastLoginAt`), y `login()` que las orquesta en el orden R5 de research.md en `apps/server/src/modules/auth/auth.service.ts`
- [X] T052 [US1] Implementar middleware `requireAuth` que verifica el Bearer, carga la sesión (no revocada y no caducada) y el usuario (`status = 'Activo'`), y si no, lanza `AUTH_UNAUTHENTICATED`/`AUTH_SESSION_EXPIRED`; deja `req.auth = { userId, sessionId, role }` en `apps/server/src/middlewares/requireAuth.ts`
- [X] T053 [P] [US1] Implementar middleware `requirePermission(module, level)` con `can()` de shared → `AppError('AUTH_FORBIDDEN', 403)` en `apps/server/src/middlewares/requirePermission.ts`
- [X] T054 [US1] Implementar `authController.login` (web: cookie `refreshToken` `httpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Secure` en producción, sin `Max-Age` si no es persistente; desktop: `refreshToken` en el cuerpo) y `authController.me` en `apps/server/src/modules/auth/auth.controller.ts`
- [X] T055 [US1] Crear `POST /api/auth/login` (con `validate(loginSchema)`) y `GET /api/auth/me` (con `requireAuth`) con sus bloques `@openapi` del contrato, y montarlas en `buildApp()` en `apps/server/src/modules/auth/auth.routes.ts` y `apps/server/src/app.ts`
- [X] T056 [P] [US1] Implementar componentes genéricos `Button` (variantes primary/secondary/tertiary, alto 44 px), `TextField` (label en estilo Etiqueta, error con borde y mensaje), `PasswordField` (botón 44×44 con `aria-label` y `aria-pressed`), `Checkbox` (≥44 px de objetivo), `Alert` (`role="alert"`, variante error) y `BrandMark` con CSS Modules y tokens en `apps/client/src/components/`
- [X] T057 [US1] Implementar `authApi.ts` con `loginRequest(body)` y `fetchMe()` usando `httpClient` en `apps/client/src/features/auth/authApi.ts`
- [X] T058 [US1] Implementar `authSlice` (estado `user`, `accessToken`, `status`, `error`; thunks `login` y `loadMe`) y `authSelectors` (`selectIsAuthenticated`, `selectCan(module, level)`), y registrar el reducer en la store en `apps/client/src/features/auth/authSlice.ts`, `apps/client/src/features/auth/authSelectors.ts` y `apps/client/src/store/store.ts`
- [X] T059 [US1] Añadir a `httpClient` un interceptor de petición que pone `Authorization: Bearer <accessToken>` leído de la store en `apps/client/src/utils/httpClient.ts`
- [X] T060 [US1] Implementar `LoginForm` (campo "Email" `type="text"`, `inputMode="email"`, `autoComplete="username"` para admitir `admin`; contraseña; "¿La has olvidado?"; "Mantener la sesión iniciada en este equipo"; "Entrar") componiendo los genéricos, y `LoginHero` (panel oscuro con marca y claim) en `apps/client/src/features/auth/components/`
- [X] T061 [US1] Implementar `LoginPage` con el layout del diseño «Albarán» (hero + formulario; ≤760 px: hero reducido a franja, con container query) en `apps/client/src/pages/LoginPage.tsx`
- [X] T062 [US1] Implementar `RequireAuth`, `resolveHomeRoute(user, from)` y rutas protegidas (placeholder `/productos` mientras no exista el módulo) en `apps/client/src/routes/RequireAuth.tsx`, `apps/client/src/routes/homeRoute.ts` y `apps/client/src/routes/AppRouter.tsx`

**Checkpoint**: US1 funciona y se prueba sola (quickstart §3, escenarios 1, 2, 4, 9, 11).

---

## Phase 4: User Story 7 - Primer acceso con la cuenta inicial "admin" (Priority: P1)

**Goal**: en una base de datos vacía se entra con `admin`/`admin`; en cuanto existe un usuario real, la
cuenta inicial desaparece y sus sesiones dejan de valer.

**Independent Test**: base vacía → arrancar → entrar con `admin`/`admin`; insertar un usuario real →
`admin`/`admin` da credenciales incorrectas y la sesión abierta de `admin` caduca.

### Tests for User Story 7 ⚠️

- [X] T063 [P] [US7] Tests unitarios de `ensureBootstrapAccount` (crea `admin` con rol Administrador e `isBootstrap: true` si no hay usuarios; no la duplica; la borra y revoca sus sesiones si hay usuarios reales) y de `retireBootstrapIfNeeded` en `apps/server/src/modules/auth/bootstrap.service.test.ts`
- [X] T064 [P] [US7] Test de integración: login `admin`/`admin` con base vacía → 200 `isBootstrap: true`; tras insertar un usuario real → login 401 `AUTH_INVALID_CREDENTIALS` y `GET /api/auth/me` con el token anterior → 401 `AUTH_SESSION_EXPIRED` en `apps/server/src/modules/auth/bootstrap.routes.test.ts`

### Implementation for User Story 7

- [X] T065 [US7] Implementar `countRealUsers()`, `ensureBootstrapAccount()` (crea `{ login: 'admin', name: 'Administrador inicial', role: 'Administrador', status: 'Activo', isBootstrap: true }` con hash de `admin`) y `retireBootstrapIfNeeded()` (borra la cuenta y revoca sus sesiones) en `apps/server/src/modules/auth/bootstrap.service.ts`
- [X] T066 [US7] Llamar a `ensureBootstrapAccount()` al arrancar, tras conectar con la base de datos, en `apps/server/src/server.ts`
- [X] T067 [US7] Llamar a `retireBootstrapIfNeeded()` en `login()` antes de buscar al usuario y en `requireAuth` cuando el usuario autenticado tenga `isBootstrap: true` en `apps/server/src/modules/auth/auth.service.ts` y `apps/server/src/middlewares/requireAuth.ts`
- [X] T068 [US7] Permitir `login = 'admin'` sin formato email en `user.model.ts` solo cuando `isBootstrap: true` (validador condicional) en `apps/server/src/modules/users/user.model.ts`

**Checkpoint**: una instalación nueva se puede usar sin preparación manual (quickstart §2).

---

## Phase 5: User Story 2 - Sesión activa mientras se trabaja (Priority: P1)

**Goal**: el usuario trabaja sin volver a introducir la contraseña; si no hay actividad durante 30 min
(sesión no persistente), la sesión caduca y vuelve a la pantalla en la que estaba tras identificarse.

**Independent Test**: con un access token de 15 min, trabajar más allá de su caducidad sin que se pida la
contraseña; simular 31 min de inactividad y comprobar que se pide.

### Tests for User Story 2 ⚠️

- [X] T069 [P] [US2] Tests unitarios de `refresh()`: rota el hash; un refresh token ya rotado revoca la sesión (reutilización); sesión no persistente con `lastActivityAt` > 30 min → `AUTH_SESSION_EXPIRED`; persistente con `createdAt` > 30 días → `AUTH_SESSION_EXPIRED` en `apps/server/src/modules/auth/auth.service.test.ts`
- [X] T070 [P] [US2] Test de integración de `POST /api/auth/refresh` con cookie (web) y con cuerpo (desktop) y de que `requireAuth` actualiza `lastActivityAt` como mucho una vez por minuto en `apps/server/src/modules/auth/auth.routes.test.ts`
- [X] T071 [P] [US2] Test del interceptor de respuesta: ante 401 hace un único refresh, encola las peticiones concurrentes y las reintenta; si el refresh falla, limpia la sesión y redirige a `/login` con `from` en `apps/client/src/utils/httpClient.test.ts`

### Implementation for User Story 2

- [X] T072 [US2] Implementar `touchSession(session)` (actualiza `lastActivityAt` y, si no es persistente, `expiresAt = lastActivityAt + 30 min`, como mucho una vez por minuto) y usarla en `requireAuth` en `apps/server/src/modules/auth/auth.service.ts` y `apps/server/src/middlewares/requireAuth.ts`
- [X] T073 [US2] Implementar `refresh(token)` en el servicio (buscar por hash, validar caducidad, detectar reutilización, rotar y emitir un access nuevo) y `authController.refresh` (lee la cookie o `body.refreshToken` según el cliente y reescribe la cookie o devuelve el token) en `apps/server/src/modules/auth/auth.service.ts` y `apps/server/src/modules/auth/auth.controller.ts`
- [X] T074 [US2] Crear `POST /api/auth/refresh` con su `@openapi` y su esquema zod opcional `{ refreshToken?: string }` en `apps/server/src/modules/auth/auth.routes.ts` y `apps/server/src/modules/auth/auth.validation.ts`
- [X] T075 [US2] Implementar `refreshRequest()` en `authApi.ts`, el thunk `refreshSession` y la restauración de sesión al arrancar (`refreshSession` + `loadMe` antes de pintar rutas protegidas) en `apps/client/src/features/auth/authApi.ts`, `apps/client/src/features/auth/authSlice.ts` y `apps/client/src/App.tsx`
- [X] T076 [US2] Implementar el interceptor de respuesta con refresh único y cola en `apps/client/src/utils/httpClient.ts`

**Checkpoint**: la sesión se renueva sola durante la actividad y caduca por inactividad (quickstart §3, escenario 4).

---

## Phase 6: User Story 3 - Cerrar sesión (Priority: P1)

**Goal**: "Cerrar sesión" invalida la sesión en el servidor y en el equipo; ni "atrás" ni reabrir dan acceso.

**Independent Test**: iniciar sesión, cerrar sesión, pulsar "atrás" y reabrir → se pide identificarse.

### Tests for User Story 3 ⚠️

- [X] T077 [P] [US3] Test de integración: `POST /api/auth/logout` → 200, la cookie se borra y tanto el access token anterior (`/auth/me`) como el refresh token anterior (`/auth/refresh`) responden 401 en `apps/server/src/modules/auth/auth.routes.test.ts`
- [X] T078 [P] [US3] Test de cliente: el thunk `logout` limpia el estado, llama a `clearRefreshToken()` en escritorio y navega a `/login` en `apps/client/src/features/auth/authSlice.test.ts`

### Implementation for User Story 3

- [X] T079 [US3] Implementar `logout(sessionId)` (fija `revokedAt`) y `authController.logout` (borra la cookie con el mismo `Path`) en `apps/server/src/modules/auth/auth.service.ts` y `apps/server/src/modules/auth/auth.controller.ts`
- [X] T080 [US3] Crear `POST /api/auth/logout` con `requireAuth` y su `@openapi` en `apps/server/src/modules/auth/auth.routes.ts`
- [X] T081 [US3] Implementar `logoutRequest()` y el thunk `logout`, y un `LogoutButton` en la barra lateral provisional que lo despacha en `apps/client/src/features/auth/authApi.ts`, `apps/client/src/features/auth/authSlice.ts` y `apps/client/src/features/auth/components/LogoutButton.tsx`

**Checkpoint**: quickstart §3, escenario 5.

---

## Phase 7: User Story 4 - Mantener la sesión en este equipo (Priority: P2)

**Goal**: con la casilla marcada la sesión sobrevive al cierre del navegador o la aplicación hasta 30 días; sin ella, no.

**Independent Test**: login con y sin casilla, cerrar y reabrir el navegador o la aplicación.

### Tests for User Story 4 ⚠️

- [X] T082 [P] [US4] Test de integración: login web con `persistent: true` → cookie con `Max-Age=2592000`; con `persistent: false` → cookie sin `Max-Age`/`Expires`; `expiresAt` de la sesión acorde a cada caso en `apps/server/src/modules/auth/auth.routes.test.ts`
- [X] T083 [P] [US4] Tests de `ipc/auth.ts`: `setRefreshToken(t, true)` cifra con `safeStorage` en `session.bin`; `setRefreshToken(t, false)` lo deja solo en memoria y borra `session.bin`; `getRefreshToken` prioriza la memoria en `apps/desktop/src/ipc/auth.test.ts`

### Implementation for User Story 4

- [X] T084 [US4] Fijar `expiresAt` en `createSession` según `persistent` (30 días absolutos frente a 30 min de inactividad) y `Max-Age` de la cookie en `authController` en `apps/server/src/modules/auth/auth.service.ts` y `apps/server/src/modules/auth/auth.controller.ts`
- [X] T085 [US4] Implementar handlers `auth:get-refresh`, `auth:set-refresh` y `auth:clear-refresh` con `safeStorage` y `userData/session.bin` según contracts/desktop-bridge.md en `apps/desktop/src/ipc/auth.ts`
- [X] T086 [US4] Exponer `getRefreshToken`, `setRefreshToken` y `clearRefreshToken` en `window.desktop` con `contextBridge` en `apps/desktop/src/preload.ts`
- [X] T087 [US4] En el cliente de escritorio: enviar `client: 'desktop'`, guardar el refresh token con `setRefreshToken(token, persistent)` tras el login y el refresh, y mandarlo en el cuerpo de `refreshRequest()` en `apps/client/src/features/auth/authSlice.ts` y `apps/client/src/features/auth/authApi.ts`

**Checkpoint**: quickstart §3, escenarios 6–7, y §4, escenarios 4–5.

---

## Phase 8: User Story 5 - Bloqueo temporal por intentos fallidos (Priority: P2)

**Goal**: 5 fallos consecutivos bloquean el identificador durante 15 min, incluso con la contraseña correcta.

**Independent Test**: 5 contraseñas erróneas → la correcta se rechaza con la hora de reintento; al pasar 15 min, entra.

### Tests for User Story 5 ⚠️

- [ ] T088 [P] [US5] Tests unitarios: el 5.º fallo fija `lockedUntil = ahora + 15 min`; con `lockedUntil` futuro se rechaza la contraseña correcta con `AUTH_ACCOUNT_LOCKED` (423) y la hora en el mensaje; con `lockedUntil` pasado se entra y `failedCount` vuelve a 0; un login correcto antes del límite reinicia el contador (con reloj simulado de Jest) en `apps/server/src/modules/auth/auth.service.test.ts`
- [ ] T089 [P] [US5] Test de integración de la secuencia 5 × 401 → 423 en `apps/server/src/modules/auth/auth.routes.test.ts`

### Implementation for User Story 5

- [ ] T090 [US5] Implementar `assertNotLocked(identifier)` (paso 2 de R5) y que `registerFailure` fije `lockedUntil` al alcanzar `MAX_FAILED_ATTEMPTS`, con el mensaje "Demasiados intentos. Vuelve a intentarlo a las HH:MM." en `apps/server/src/modules/auth/auth.service.ts`
- [ ] T091 [US5] Mostrar en `LoginForm` el mensaje de bloqueo devuelto por la API y diferenciar los errores de conexión ("No se puede conectar con el servidor") de los de credenciales, sin contarlos como intento en `apps/client/src/features/auth/components/LoginForm.tsx`

**Checkpoint**: quickstart §3, escenario 3.

---

## Phase 9: User Story 6 - Servidor visible y cambiable en escritorio (Priority: P2)

**Goal**: solo en escritorio el login muestra la dirección del servidor, su estado como texto y "Cambiar servidor".

**Independent Test**: abrir el login en web (sin bloque) y en escritorio (con bloque y estado real).

### Tests for User Story 6 ⚠️

- [ ] T092 [P] [US6] Test del componente `ServerStatus` (texto "Conectado"/"Sin conexión" además del color, dirección en Mono, enlace "Cambiar servidor") en `apps/client/src/components/ServerStatus.test.tsx`
- [ ] T093 [P] [US6] Test de `LoginPage`: sin `window.desktop` no se pinta `ServerStatus`; con un `window.desktop` simulado se pinta con el resultado de `checkServer()` en `apps/client/src/pages/LoginPage.test.tsx`
- [ ] T094 [P] [US6] Tests de `ipc/server.ts`: `server:get-url` lee la configuración; `server:check` devuelve `reachable: false` si `/health` no responde en 5 s en `apps/desktop/src/ipc/server.test.ts`

### Implementation for User Story 6

- [ ] T095 [P] [US6] Implementar handlers `server:get-url` y `server:check` (timeout de 5 s) en `apps/desktop/src/ipc/server.ts` y registrarlos en `apps/desktop/src/main.ts`
- [ ] T096 [US6] Exponer `isDesktop`, `getServerUrl` y `checkServer` en `window.desktop` en `apps/desktop/src/preload.ts`
- [ ] T097 [P] [US6] Implementar el componente genérico `ServerStatus` (props `url`, `reachable`, `settingsHref`) con CSS Modules en `apps/client/src/components/ServerStatus.tsx`
- [ ] T098 [US6] Pintar `ServerStatus` en `LoginPage` solo si `isDesktop()`, consultando `checkServer()` al montar en `apps/client/src/pages/LoginPage.tsx`
- [ ] T099 [US6] Crear la ruta pública `/ajustes/servidor`, solo registrada en escritorio, con `ServerSettingsPlaceholder` (muestra la URL actual y que la configuración llegará con Ajustes › Base de datos) en `apps/client/src/pages/ServerSettingsPlaceholder.tsx` y `apps/client/src/routes/AppRouter.tsx`

**Checkpoint**: quickstart §3, escenario 10, y §4, escenarios 1–3.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T100 [P] Revisar que todas las funciones nuevas cumplen ≤40 líneas efectivas y anidamiento ≤2 con `npm run lint` y extraer helpers donde haga falta
- [ ] T101 [P] Comprobar que `/api-docs` coincide con `contracts/auth-api.openapi.yaml` (rutas, códigos y esquemas)
- [ ] T102 [P] Revisar la accesibilidad de la pantalla de login a 390 px y 1440 px (etiquetas, foco visible de 2 px en óxido, objetivos de 44 px, contraste 4.5:1) en `apps/client/src/pages/LoginPage.tsx` y `apps/client/src/components/`
- [ ] T103 Ejecutar `npm run lint` y `npm test --workspaces` en verde y validar manualmente quickstart.md completo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup y bloquea todas las historias.
- **US1 (Fase 3)**: depende de Foundational. Es el MVP.
- **US7 (Fase 4)**: depende de US1 (usa `login()` y `requireAuth`).
- **US2 (Fase 5)**: depende de US1 (sesión y `requireAuth`).
- **US3 (Fase 6)**: depende de US1; se puede hacer en paralelo con US2.
- **US4 (Fase 7)**: depende de US2 (refresh) y US3 (`clearRefreshToken` en el logout).
- **US5 (Fase 8)**: depende de US1 (`registerFailure`); independiente de US2–US4.
- **US6 (Fase 9)**: depende de Foundational (puente de escritorio) y de `LoginPage` (US1); independiente del resto.
- **Polish (Fase 10)**: al final.

### Story Completion Order

```text
Setup → Foundational → US1 ─┬─► US7
                            ├─► US2 ─┐
                            ├─► US3 ─┴─► US4
                            ├─► US5
                            └─► US6
                                         → Polish
```

### Within Each User Story

- Tests primero, y deben fallar.
- Modelos → servicios → controladores/rutas → cliente (API → slice → componentes → páginas).

---

## Parallel Example: User Story 1

```text
# Tests en paralelo:
T040 utils de password/tokens · T041 auth.service · T042 rutas · T043 componentes genéricos · T044 LoginForm · T045 RequireAuth

# Implementación en paralelo (archivos distintos):
T046 password.ts · T047 tokens.ts · T048 session.model.ts · T049 loginAttempt.model.ts · T050 auth.validation.ts · T053 requirePermission.ts · T056 componentes genéricos
```

## Parallel Example: después de US1

```text
Dev A: US7 (T063–T068)   Dev B: US2 (T069–T076)   Dev C: US5 (T088–T091)   Dev D: US6 (T092–T099)
```

---

## Implementation Strategy

### MVP (US1 + US7)

1. Fases 1 y 2.
2. US1: login con usuario insertado a mano. **Parar y validar.**
3. US7: cuenta `admin` para que una instalación nueva se pueda usar sin preparación manual. **Demo.**

### Entrega incremental

4. US2 + US3: sesión que se renueva y logout fiable (cierra los P1).
5. US4, US5 y US6 (P2) en cualquier orden según las dependencias de arriba.
6. Polish.

### Notas

- Hacer commit al terminar cada tarea o grupo lógico (Conventional Commits, en español o inglés pero
  consistente dentro de un mismo PR).
- No adelantar el CRUD de usuarios, la configuración de servidor ni el Panel: pertenecen a otros módulos
  (principio V).
