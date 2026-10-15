# Implementation Plan: Escritorio con backend local y base de datos configurable

**Branch**: `002-desktop-local-backend` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-desktop-local-backend/spec.md`

## Summary

La app de escritorio deja de depender de un servidor de la empresa. El proceso principal de Electron arranca el mismo
backend de `apps/server` en un proceso hijo (`utilityProcess`), que escucha solo en `127.0.0.1` y se conecta
directamente a la base de datos MongoDB configurada, local o remota (en remoto, solo con TLS).

La cadena de conexión se guarda cifrada con `safeStorage` y la interfaz solo recibe un resumen (host y versión
enmascarada). El login de escritorio muestra el host y el estado real de la base de datos y enlaza a una pantalla de
configuración con «Probar conexión» y «Guardar».

Al guardar, el proceso principal reinicia el backend con la nueva base de datos y un secreto JWT nuevo, y borra el
refresh token del equipo: las sesiones anteriores dejan de valer. La web no cambia. Detalle de las decisiones en
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22 (backend y proceso principal de Electron 34) y React 19
(cliente).

**Primary Dependencies**: las ya aprobadas en CLAUDE.md: Express 5.1, Mongoose 8, Electron 34 (`utilityProcess`,
`safeStorage`, `ipcMain`, `contextBridge`), React Router 7, Redux Toolkit 2.5 y electron-builder 25. **Ninguna
dependencia de terceros nueva**: `apps/desktop` añade la dependencia interna de workspace `@app/server` (R12).

**Storage**: MongoDB elegido por el usuario (local o remoto). En el equipo solo hay `userData/database.bin` (cadena
cifrada) y `userData/session.bin` (refresh token, 001). Sin colecciones nuevas.

**Testing**: Jest 30 con ts-jest:
- `packages/shared`: `parseMongoUri`.
- `apps/desktop`: almacén cifrado y handlers IPC, con `safeStorage`, `utilityProcess` e `ipcMain` falsos.
- `apps/server`: health, `errorHandler` y prueba de conexión, con supertest y mongodb-memory-server.
- `apps/client`: `ConnectionStatus`, `DatabaseForm`, `LoginPage` y el slice, con Testing Library.

**Target Platform**: escritorio Windows, macOS y Linux (Electron). La web (navegadores actuales) no cambia.

**Project Type**: monorepo con web (React + Express) y aplicación de escritorio (Electron) que empaqueta el cliente
y, desde ahora, el backend.

**Performance Goals**:
- «Probar conexión» responde en 10 s como máximo (FR-009).
- El estado de la base de datos llega en 5 s como máximo.
- Cambiar de base de datos completa el reinicio del backend en menos de 10 s (SC-002).

**Constraints**:
- Backend accesible solo desde `127.0.0.1` (FR-003).
- Cadena de conexión nunca en texto plano en disco ni completa en el renderer (FR-014, FR-015).
- TLS obligatorio en remoto (FR-016).
- Sin modo offline (FR-020).
- La web y su contrato de autenticación no cambian.

**Scale/Scope**: una base de datos por instalación y decenas de usuarios por base de datos, como en 001. Pantallas
nuevas: solo `/ajustes/base-de-datos` (escritorio). Cambian el bloque de estado del login y el puente
`window.desktop`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo se cumple | Estado |
|---|---|---|
| I. Organización por dominio | Cliente: `features/database/` (slice, API, componentes). Escritorio: `ipc/database.ts` y `backend/` (proceso hijo). Servidor: cambios en `config/`, `middlewares/` y `modules/health/`; el resto de módulos no se toca. | ✅ |
| II. Contrato API primero | `GET /health` añade `database` y documenta su `@openapi` ([contracts/health.openapi.yaml](contracts/health.openapi.yaml)). Nuevo código de error `DATABASE_UNAVAILABLE` (503) vía `AppError` en `errorHandler`. Sin rutas nuevas: probar y guardar van por IPC. | ✅ |
| III. Validación en el borde | No hay rutas HTTP nuevas con entrada. Lo que llega del renderer por IPC se valida en el proceso principal (tipo y `parseMongoUri`) antes de usarse, igual que `ipc/auth.ts`. | ✅ |
| IV. Funciones cortas y capas | Lógica de escritorio en funciones puras inyectables (almacén, gestor del proceso hijo, analizador). Ningún controlador nuevo. | ✅ |
| V. Cambios mínimos | Se reutilizan `buildApp()`, `connectDatabase()` y el patrón de `ipc/auth.ts`. Se renombra `ServerStatus` a `ConnectionStatus` porque cambia su significado (justificado en Complexity Tracking). Se eliminan `ipc/server.ts`, `ipc/config.ts` y `ServerSettingsPlaceholder` porque esta spec sustituye a la US6 de 001. | ✅ |
| VI. Tipos compartidos | `DesktopBridge`, `DatabaseSummary`, `DatabaseState`, `DatabaseTestResult` y `parseMongoUri` en `packages/shared`. | ✅ |
| VII. Testing | Tests unitarios en los cuatro workspaces y de integración del backend (health, errores de conexión, prueba de conexión) con mongodb-memory-server. | ✅ |
| VIII. Componentes reutilizables | `ConnectionStatus` genérico (props) y `DatabaseForm` compone `TextField`, `Button` y `Alert`. El puente se llama desde `databaseApi.ts`, nunca desde componentes; se corrige `LoginPage`, que lo hacía desde la fase 9 de 001. | ✅ |
| Restricciones: dependencias | Ninguna de terceros. `@app/server` es interna. | ✅ |
| Restricciones: arquitectura | ADR `docs/adr/0002-desktop-embedded-backend.md`. | ✅ (tarea) |
| Restricciones: seguridad | Cadena cifrada con `safeStorage`; nunca en `.env` ni en el repo. | ✅ |

**Re-check post-design**: los artefactos de la fase 1 ([data-model.md](data-model.md), [contracts/](contracts/),
[quickstart.md](quickstart.md)) no introducen rutas HTTP con entrada, dependencias ni tipos duplicados. Gate
superado.

## Project Structure

### Documentation (this feature)

```text
specs/002-desktop-local-backend/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── desktop-bridge.md       # window.desktop v2 (sustituye al de 001)
│   ├── embedded-backend.md     # Arranque, entorno y mensajes proceso principal ↔ backend
│   └── health.openapi.yaml     # GET /health con el estado de la base de datos
├── checklists/requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/desktop.ts               # DesktopBridge v2, DatabaseSummary, DatabaseState, DatabaseTestResult
└── utils/mongoUri.ts (+ .test.ts) # parseMongoUri: validación, local/remoto, TLS, máscara y host

apps/server/src/
├── config/env.ts                  # PORT ≥ 0, HOST y MONGODB_URI opcionales
├── config/database.ts             # opciones de conexión y testConnection(uri)
├── middlewares/errorHandler.ts    # errores de conexión → DATABASE_UNAVAILABLE (503)
├── modules/health/health.routes.ts (+ test)  # database: connected | disconnected
├── embedded.ts (+ embeddedRuntime.ts y test) # entrada del backend en escritorio
└── server.ts                      # web: exige MONGODB_URI (sin cambios de comportamiento)

apps/desktop/src/
├── backend/backendProcess.ts (+ test)   # arranca, reinicia y espera al backend hijo
├── ipc/database.ts (+ test)             # database.bin cifrado y handlers database:*
├── ipc/auth.ts                          # sin cambios (clear al cambiar de base de datos)
├── ipc/server.ts, ipc/config.ts         # se eliminan (R13)
├── preload.ts                           # puente v2
└── main.ts                              # registra IPC y arranca el backend

apps/client/src/
├── components/ConnectionStatus.tsx (+ .module.css, test)  # antes ServerStatus
├── features/database/
│   ├── databaseApi.ts
│   ├── databaseSlice.ts (+ test)
│   └── components/DatabaseForm.tsx (+ .module.css, test)
├── features/auth/authApi.ts             # DATABASE_UNAVAILABLE como error de conexión
├── pages/LoginPage.tsx (+ test)         # indicador de base de datos vía slice
├── pages/DatabaseSettingsPage.tsx (+ test)  # /ajustes/base-de-datos (sustituye a ServerSettingsPlaceholder)
└── routes/AppRouter.tsx                 # ruta pública solo en escritorio

docs/adr/0002-desktop-embedded-backend.md
specs/001-user-login/spec.md             # US6 marcada como sustituida por 002
```

**Structure Decision**: se mantiene la estructura de monorepo de CLAUDE.md. El único directorio nuevo de primer
nivel dentro de un workspace es `apps/desktop/src/backend/` (gestión del proceso hijo), que no es un dominio de
negocio sino infraestructura del shell de escritorio, al mismo nivel que `ipc/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Renombrar `ServerStatus` → `ConnectionStatus` (V: sin renombrados fuera de alcance) | El componente pasa a mostrar la base de datos y un estado nuevo (`unconfigured`); el nombre anterior induciría a error | Mantener `ServerStatus` y pasarle «Base de datos» como etiqueta deja un nombre que contradice su uso |
| Eliminar `ipc/server.ts`, `ipc/config.ts` y `ServerSettingsPlaceholder` | Esta spec sustituye a la US6 de 001 (FR-021): en escritorio ya no existe un servidor externo configurable | Dejarlos sin uso es código muerto y un puente con métodos que mienten (`checkServer`) |
