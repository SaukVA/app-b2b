# Implementation Plan: Inicio de sesión (login)

**Branch**: `001-user-login` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-user-login/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Autenticación con email (o la cuenta inicial `admin`) y contraseña para web y escritorio, con el rol y la
matriz de permisos aplicados desde el login. Enfoque técnico:

- **Tokens**: JWT de acceso de 15 min y refresh token opaco rotado, con su hash guardado en `sessions`.
  `requireAuth` comprueba en cada petición que la sesión y el usuario siguen siendo válidos, así que el
  logout y el bloqueo de un usuario tienen efecto inmediato.
- **Transporte del refresh token**: en web, cookie `httpOnly`; en escritorio, `safeStorage` de Electron
  detrás de un puente IPC.
- **Bloqueo**: 5 fallos por identificador bloquean 15 min, con el contador en `loginAttempts` para no
  revelar si el email existe.
- **Cuenta inicial**: `admin` se crea sola en una instalación vacía y se retira en cuanto existe un
  usuario real.
- **Interfaz**: componentes genéricos de «Albarán» en `apps/client/src/components`.

Es la primera funcionalidad del monorepo, así que el plan incluye la base mínima que necesita: workspaces,
`AppError`/`errorHandler`, conexión a Mongo, Swagger, store/router del cliente y shell de Electron. No
incluye nada que no use el login.

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**:
- Servidor: Express 5.1, Mongoose 8.9, zod 3.24, jsonwebtoken 9.0, bcryptjs 2.4, swagger-jsdoc 6.2,
  swagger-ui-express 5.0 y dotenv 16. **Nuevas, aprobadas el 2026-10-14**: cookie-parser 1.4 y cors 2.8
  (research R11).
- Cliente: React 19, Vite 6, React Router 7.1, Redux Toolkit 2.5, React Redux 9.2 y axios 1.7.
- Escritorio: Electron 34 y electron-builder 25.

**Storage**: MongoDB 8.0, con las colecciones `users`, `sessions` (TTL) y `loginAttempts` (TTL).

**Testing**: Jest 30 + ts-jest. supertest + mongodb-memory-server para la API. Tests de componentes con
`@testing-library/react` y `jsdom` (**ver Complexity Tracking**: dependencias de test nuevas).

**Target Platform**: servidor Linux/Windows; navegadores de escritorio y móvil actuales; Electron en
Windows/macOS/Linux.

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `apps/desktop`,
`packages/shared`).

**Performance Goals**: login completo en menos de 3 s (SC-001). Con `bcryptjs` coste 10 el hash tarda unos
100–200 ms y la consulta de sesión por petición menos de 10 ms.

**Constraints**:
- Ningún secreto en el cliente.
- Contraseñas nunca en claro (FR-009).
- Access token solo en memoria.
- Envelope `{success, data|error}` en todas las respuestas.
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**: decenas de usuarios y unos pocos puestos de escritorio. 5 endpoints, 1 pantalla y 1
puente IPC.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principio | Cómo lo cumple el diseño | Estado |
|---|---|---|---|
| I | Organización por dominio | `apps/server/src/modules/auth/` y `modules/users/` (solo modelo); `apps/client/src/features/auth/` | ✅ |
| II | Contrato API primero | `contracts/auth-api.openapi.yaml` → bloques `@openapi` en `auth.routes.ts` y `health.routes.ts`; envelope y `AppError` + `errorHandler` | ✅ |
| III | Validación en el borde | `auth.validation.ts` con zod para login y refresh; `validate()` en `middlewares/` | ✅ |
| IV | Funciones cortas y capas | routes → controller → service → model; helpers puros (`normalizeLogin`, `issueTokens`, `registerFailure`…); controladores sin Mongoose; DTO `AuthUser` | ✅ |
| V | Cambios mínimos | Solo la infraestructura que usa el login; sin módulos vacíos de otros dominios | ✅ |
| VI | Tipos compartidos | `Role`, `UserStatus`, `AuthUser`, `LoginRequest`, `PERMISSIONS` y `DesktopBridge` en `packages/shared` | ✅ |
| VII | Testing obligatorio | Tests unitarios de servicio/helpers, integración de rutas con supertest + mongodb-memory-server y tests de los componentes genéricos | ✅ (depende de las dependencias de test, ver Complexity Tracking) |
| VIII | Componentes reutilizables | `Button`, `TextField`, `PasswordField`, `Checkbox`, `Alert`, `BrandMark` y `ServerStatus` en `components/`; `LoginForm` en `features/auth/components` los compone | ✅ |
| — | Dependencias nuevas justificadas | `cookie-parser` y `cors` (R11) más las de test; requieren OK y actualizar la tabla de CLAUDE.md | ✅ aprobadas el 2026-10-14 |
| — | ADR | ADR 0001: axios + thunks como patrón de `*Api.ts` (R8) | ✅ previsto |

**Resultado (antes y después del diseño)**: PASA. No hay violaciones. Las dependencias nuevas se aprobaron el 2026-10-14 y se
añadirán a la tabla de Tecnologías de CLAUDE.md al instalarlas.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-login/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── auth-api.openapi.yaml
│   └── desktop-bridge.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
package.json                     # workspaces, scripts lint/test/format/dev
tsconfig.base.json
eslint.config.js
.env.example                     # MONGODB_URI, JWT_ACCESS_SECRET, CORS_ORIGINS, PORT
docker-compose.yml
docs/adr/0001-http-client-axios-thunks.md

packages/shared/src/
├── types/      auth.ts, user.ts, desktop.ts, api.ts (envelope)
└── constants/  roles.ts (ROLES, PERMISSIONS), auth.ts (límites de sesión e intentos)

apps/server/src/
├── config/        env.ts, database.ts
├── docs/          swagger.ts
├── middlewares/   errorHandler.ts, validate.ts, requireAuth.ts, requirePermission.ts
├── utils/         AppError.ts, tokens.ts, password.ts
├── modules/
│   ├── health/    health.routes.ts, health.test.ts
│   ├── users/     user.model.ts                      # solo el esquema; CRUD en su módulo futuro
│   └── auth/      auth.routes.ts, auth.controller.ts, auth.service.ts, auth.validation.ts,
│                  session.model.ts, loginAttempt.model.ts, bootstrap.service.ts,
│                  auth.service.test.ts, bootstrap.service.test.ts, auth.routes.test.ts
├── app.ts
└── server.ts                                         # conecta, ensureBootstrapAccount(), listen

apps/client/src/
├── styles/        tokens.css, global.css
├── components/    Button, TextField, PasswordField, Checkbox, Alert, BrandMark, ServerStatus
│                  (cada uno .tsx + .module.css + .test.tsx)
├── features/auth/ authSlice.ts, authApi.ts, authSelectors.ts,
│                  components/LoginForm.tsx, components/LoginHero.tsx
├── pages/         LoginPage.tsx, ServerSettingsPlaceholder.tsx
├── routes/        AppRouter.tsx, RequireAuth.tsx, homeRoute.ts
├── store/         store.ts
├── utils/         httpClient.ts (interceptor de refresh), desktop.ts
├── App.tsx
└── main.tsx

apps/desktop/src/
├── main.ts                      # BrowserWindow con contextIsolation, protocolo app://
├── preload.ts                   # contextBridge → window.desktop
└── ipc/       auth.ts, server.ts, config.ts
```

**Structure Decision**: monorepo de CLAUDE.md, organizado por dominio. `modules/users/user.model.ts` se
crea aquí porque el login lo necesita, pero el CRUD de usuarios queda para su propio módulo (principio
V). Todavía no hace falta `packages/ui`: los componentes genéricos van en `apps/client/src/components`
(principio VIII).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dependencias nuevas de producción: `cookie-parser`, `cors` | El refresh token en cookie `httpOnly` (web) y las peticiones desde el origen `app://` (escritorio) | Parsear cookies o cabeceras CORS a mano duplica código delicado de seguridad |
| Dependencias nuevas de test: `@testing-library/react`, `@testing-library/user-event`, `jest-environment-jsdom` | El principio VII exige tests de los componentes reutilizables | Probar componentes sin DOM no verifica accesibilidad (etiquetas, role="alert") ni interacción |
