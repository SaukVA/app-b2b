---

description: "Task list for feature 002-desktop-local-backend"
---

# Tasks: Escritorio con backend local y base de datos configurable

**Input**: Design documents from `/specs/002-desktop-local-backend/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/desktop-bridge.md,
contracts/embedded-backend.md, contracts/health.openapi.yaml, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) y el plan exigen tests unitarios en los cuatro
workspaces y de integración del backend con supertest + mongodb-memory-server. En cada fase los tests se escriben
primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de cada fase se muestra el
plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución:
US1 → US2 → US3.

**Reglas transversales** (aplican a todas las tareas):
- Funciones de ≤20 líneas efectivas como referencia y nunca >40; anidamiento ≤2; early returns (principio IV).
- Lógica del proceso principal en funciones puras con dependencias inyectadas (`safeStorage`, `utilityProcess`,
  `ipcMain`, `fetch`, temporizadores) para poder probarlas con dobles.
- Todo argumento que llega por IPC se valida en el proceso principal: `typeof uri === 'string'` y longitud ≤ 2048;
  si no cumple, el handler lanza (contracts/desktop-bridge.md).
- La cadena de conexión completa NEVER viaja del proceso principal al renderer ni se escribe en claro en disco ni en
  logs (FR-013, FR-014, FR-015).
- El puente `window.desktop` solo se llama desde `features/database/databaseApi.ts` y `features/auth/authApi.ts`,
  nunca desde componentes (principio VIII).
- Ninguna dependencia de terceros nueva. `@app/server` es una dependencia interna de workspace (research R12).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar el empaquetado del backend dentro del escritorio y registrar la decisión de arquitectura

- [X] T001 Añadir `"@app/server": "*"` a `dependencies` de `apps/desktop/package.json`; cambiar el script `build` a `npm run build --workspace=@app/shared && npm run build --workspace=@app/server && tsc -p tsconfig.build.json` (así `dev` y `package` compilan el servidor antes de arrancar Electron, research R12) y ejecutar `npm install` en la raíz
- [X] T002 [P] Crear `docs/adr/0002-desktop-embedded-backend.md` con el formato de `docs/adr/0001-http-client-axios-thunks.md`, registrando research R1–R6 y R12 (backend en `utilityProcess`, solo `127.0.0.1` y puerto 0, secreto JWT por arranque, reinicio del hijo al cambiar de base de datos, invalidación de sesiones, empaquetado como dependencia de workspace y alternativa esbuild si falla)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos compartidos, backend embebido que arranca y responde, proceso principal que lo gestiona, almacén
cifrado y puente v2 con el login ya leyendo del slice

**⚠️ CRITICAL**: ninguna historia puede empezar hasta completar esta fase

### Shared

- [X] T003 [P] Escribir `packages/shared/src/utils/mongoUri.test.ts` para `parseMongoUri`: acepta `mongodb://` y `mongodb+srv://`; rechaza otro esquema, sin hosts o `+srv` con más de un host o con puerto (`DATABASE_URI_INVALID` con motivo); `isLocal` solo si todos los hosts son `localhost`, `127.0.0.1` o `::1`; `usesTls` en `+srv` salvo `tls=false`/`ssl=false` y en `mongodb://` solo con `tls=true` o `ssl=true`; remota sin TLS → `DATABASE_TLS_REQUIRED`; `display` son los hosts unidos por coma sin usuario ni contraseña; `masked` sustituye la contraseña por `••••••••`; el resultado nunca contiene la contraseña (`hasPassword` booleano)
- [X] T004 [P] Crear `packages/shared/src/constants/database.ts` con los códigos `DATABASE_URI_INVALID`, `DATABASE_TLS_REQUIRED`, `DATABASE_UNREACHABLE`, `DATABASE_AUTH_FAILED`, `DATABASE_UNAVAILABLE`, el máximo `DATABASE_URI_MAX_LENGTH = 2048` y los mensajes de data-model.md («La cadena de conexión no es válida: …», «Las bases de datos remotas exigen conexión cifrada (tls=true o mongodb+srv).», «No se puede conectar con la base de datos.»)
- [X] T005 [P] Reescribir `packages/shared/src/types/desktop.ts` con `DesktopBridge` v2 (contracts/desktop-bridge.md: sin `checkServer`; con `getDatabase`, `getDatabaseStatus`, `testDatabase`, `saveDatabase`), `DatabaseSummary` (`configured: boolean`, `host: string | null`, `maskedUri: string | null`, `persisted: boolean`), `DatabaseState` (`'unconfigured' | 'connected' | 'disconnected'`), `DatabaseTestResult` (`{ ok: true } | { ok: false; code: 'DATABASE_URI_INVALID' | 'DATABASE_TLS_REQUIRED' | 'DATABASE_UNREACHABLE' | 'DATABASE_AUTH_FAILED'; message: string }`) y `DatabaseSaveResult` (`DatabaseTestResult & { summary?: DatabaseSummary }`)
- [X] T006 Implementar `parseMongoUri` en `packages/shared/src/utils/mongoUri.ts` devolviendo `{ ok: true, value: ParsedMongoUri } | { ok: false, code, message }` con los campos de data-model.md (`scheme`, `hosts` «al menos uno; `+srv`: exactamente uno y sin puerto», `database`, `username`, `hasPassword`, `isLocal`, `usesTls`, `display`, `masked`), sin dependencias nuevas, hasta que T003 pase; exportar `parseMongoUri`, `ParsedMongoUri`, los tipos de T005 y las constantes de T004 desde `packages/shared/src/index.ts`

### Server

- [X] T007 [P] Escribir `apps/server/src/config/env.test.ts`: `PORT=0` es válido, `HOST` y `MONGODB_URI` son opcionales, `PORT` negativo o `JWT_ACCESS_SECRET` corto siguen fallando (reiniciar la caché de `getEnv` entre casos)
- [X] T008 [P] Escribir `apps/server/src/embeddedRuntime.test.ts` con dependencias falsas (`listen`, `connect`, `ensureBootstrap`, `parentPort`, temporizadores falsos de Jest): envía `{ type: 'ready', port }` antes de intentar conectar; sin `MONGODB_URI` no conecta; si `connect` falla reintenta cada 5 s; tras la primera conexión llama una sola vez a `ensureBootstrap` (cuenta «admin» de 001 US7)
- [X] T009 Modificar `apps/server/src/config/env.ts`: `PORT` `z.coerce.number().int().nonnegative()`, `HOST` `z.string().min(1).optional()`, `MONGODB_URI` `.optional()`; añadir `resetEnvCache()` solo para tests si hace falta para T007
- [X] T010 Modificar `apps/server/src/server.ts`: si `MONGODB_URI` falta, terminar con el mensaje «Falta MONGODB_URI» (la web mantiene el comportamiento actual) y escuchar en `HOST` cuando esté definido
- [X] T011 [P] Modificar `apps/server/src/config/database.ts`: `connectDatabase(uri, options?)` acepta opciones de Mongoose y exporta `EMBEDDED_CONNECTION_OPTIONS = { bufferCommands: false, serverSelectionTimeoutMS: 5000 }` (research R4)
- [X] T012 [P] Modificar `apps/server/src/app.ts`: `buildApp(options: { docs?: boolean } = {})`, que monta `/api-docs` solo si `docs !== false` (por defecto `true`; el backend embebido no lo monta, research R3)
- [X] T013 Crear `apps/server/src/embeddedRuntime.ts` con `startEmbedded(deps)`: escucha en `HOST`/`PORT` con `buildApp({ docs: false })`, envía `ready` con el puerto real, conecta en segundo plano con `EMBEDDED_CONNECTION_OPTIONS` y reintentos cada 5 s, y después ejecuta `ensureBootstrapAccount()`; deja un `onMessage(message)` que por ahora ignora mensajes desconocidos (T030 añade `test-connection`), hasta que T008 pase
- [X] T014 Crear `apps/server/src/embedded.ts` (entrada del proceso hijo) que conecta `process.parentPort` de Electron (`postMessage` y evento `message` con `event.data`) con `startEmbedded`, y registra en `console.error` los fallos sin imprimir nunca `MONGODB_URI`

### Desktop

- [X] T015 [P] Escribir `apps/desktop/src/backend/backendProcess.test.ts` con un `fork` falso: el hijo recibe el entorno de contracts/embedded-backend.md (`PORT=0`, `HOST=127.0.0.1`, `NODE_ENV=production`, `CORS_ORIGINS` con `app://.` y la URL de Vite en desarrollo, `JWT_ACCESS_SECRET` de 48 bytes en base64url distinto en cada arranque, `MONGODB_URI` solo si hay configuración); `getUrl()` resuelve `http://127.0.0.1:<port>/api` al recibir `ready` y rechaza a los 10 s; `restart()` mata el hijo y lanza otro; si el hijo termina inesperadamente se relanza como mucho 3 veces seguidas; `stop()` lo mata sin relanzarlo
- [X] T016 [P] Escribir `apps/desktop/src/ipc/database.test.ts` (almacén) con un `safeStorage` falso y un directorio temporal: `write` guarda `{ uri }` cifrado en `database.bin`; `read` lo devuelve; un `database.bin` ilegible equivale a sin configurar; sin cifrado disponible guarda solo en memoria y el resumen lleva `persisted: false`; `toSummary` devuelve `host` y `maskedUri` sin la contraseña; el handler `database:get` devuelve el resumen y nunca la cadena
- [X] T017 Crear `apps/desktop/src/backend/backendProcess.ts` con `createBackendProcess({ fork, entryPath, getUri, devClientUrl, timers })` que expone `start()`, `restart()`, `stop()` y `getUrl()` según contracts/embedded-backend.md (secreto con `crypto.randomBytes(48).toString('base64url')`), hasta que T015 pase
- [X] T018 Crear `apps/desktop/src/ipc/database.ts` con `createDatabaseStore({ userDataDir, encryptor })` (mismo patrón que `createRefreshTokenStore` en `apps/desktop/src/ipc/auth.ts`), `toSummary(uri | null, persisted)` con `parseMongoUri`, `assertUriArg(value)` (string ≤ `DATABASE_URI_MAX_LENGTH`), `DATABASE_CHANNELS` (`database:get`, `database:status`, `database:test`, `database:save`) y `registerDatabaseIpc(ipcMain, deps)` con solo `database:get`, hasta que T016 pase
- [X] T019 Modificar `apps/desktop/src/main.ts`: crear el almacén de base de datos y el backend (`entryPath` con `require.resolve('@app/server/dist/embedded.js')`, `fork` con `utilityProcess.fork`), registrar `backend:get-url` → `backend.getUrl()`, registrar `registerDatabaseIpc`, arrancar el backend en `app.whenReady()`, pararlo en `before-quit`, borrar `userData/config.json` si existe (research R13) y quitar `registerServerIpc`
- [X] T020 [P] Eliminar `apps/desktop/src/ipc/server.ts`, `apps/desktop/src/ipc/server.test.ts` y `apps/desktop/src/ipc/config.ts` (research R13, sustituidos por esta spec)
- [X] T021 Reescribir `apps/desktop/src/preload.ts` con el puente v2: `getServerUrl` → `backend:get-url`, `getDatabase` → `database:get`, `getDatabaseStatus` → `database:status`, `testDatabase` → `database:test`, `saveDatabase` → `database:save` y los tres `auth:*` sin cambios; actualizar el comentario de canales repetidos (`ipc/auth.ts`, `ipc/database.ts` y `main.ts`)

### Client

- [X] T022 [P] Renombrar `apps/client/src/components/ServerStatus.test.tsx` a `apps/client/src/components/ConnectionStatus.test.tsx` y reescribirlo para las props `label`, `value`, `state` (`checking | ok | down | unconfigured`), `linkText` y `href`: el estado siempre aparece como texto («Comprobando…», «Conectado», «Sin conexión», «Sin configurar») en un `role="status"` y el enlace usa `linkText`
- [X] T023 [P] Escribir `apps/client/src/features/database/databaseSlice.test.ts` con estado inicial de data-model.md (`summary: null`, `state: 'checking'`, `test: { status: 'idle', result: null }`, `saving: false`) y el thunk `loadDatabaseSummary` (puente falso en `window.desktop`)
- [X] T024 Renombrar `apps/client/src/components/ServerStatus.tsx` y `ServerStatus.module.css` a `ConnectionStatus.tsx` y `ConnectionStatus.module.css` con las props de T022 y un estilo para `unconfigured` con los tokens de `apps/client/src/styles/tokens.css`, hasta que T022 pase
- [X] T025 Crear `apps/client/src/features/database/databaseApi.ts` con `getDatabaseSummary()` → `getDesktopBridge().getDatabase()` (las historias añaden el resto de llamadas)
- [X] T026 Crear `apps/client/src/features/database/databaseSlice.ts` con el estado de T023 y `loadDatabaseSummary`, y registrarlo como `database` en `apps/client/src/store/store.ts`, hasta que T023 pase
- [X] T027 Modificar `apps/client/src/pages/LoginPage.tsx`: eliminar `useServerInfo` y la llamada directa al puente; en escritorio despachar `loadDatabaseSummary` al montar y pintar `ConnectionStatus` con `label` «Base de datos», `value` = `summary.host`, estado `unconfigured` si `configured` es `false` y `linkText` «Cambiar base de datos» o «Configurar base de datos» si no hay ninguna; exportar `DATABASE_SETTINGS_PATH = '/ajustes/base-de-datos'` en lugar de `SERVER_SETTINGS_PATH`; adaptar `apps/client/src/pages/LoginPage.test.tsx` al puente v2 (sin `checkServer`)

**Checkpoint**: `npm run dev --workspace=apps/desktop` arranca Electron con su backend local; sin configuración, el
login muestra «Base de datos · Sin configurar» y «Configurar base de datos»; `npm test --workspaces` en verde.

---

## Phase 3: User Story 1 - Conectar el escritorio a una base de datos local o remota (Priority: P1) 🎯 MVP

**Goal**: desde el login de escritorio se introduce una cadena de conexión, se prueba sin guardar, se guarda y la
app pasa a usar esa base de datos sin reiniciarse; en una base de datos vacía se entra con «admin»/«admin».

**Independent Test**: instalación nueva → «Configurar base de datos» → cadena de una base de datos vacía → «Probar
conexión» → «Guardar» → entrar con «admin»/«admin» (quickstart escenarios 1–5).

### Tests for User Story 1 ⚠️ (escribir primero, deben fallar)

- [ ] T028 [P] [US1] Escribir `apps/server/src/config/database.test.ts`: `testConnection(uri, timeoutMs)` contra mongodb-memory-server devuelve `{ ok: true }` y cierra la conexión temporal sin tocar la conexión global de Mongoose; contra un puerto cerrado con un tiempo corto devuelve `DATABASE_UNREACHABLE`; `classifyConnectionError` convierte un error de autenticación del driver (código 18 / `AuthenticationFailed`) en `DATABASE_AUTH_FAILED`
- [ ] T029 [P] [US1] Ampliar `apps/server/src/embeddedRuntime.test.ts`: el mensaje `{ type: 'test-connection', id, uri }` responde `{ type: 'test-result', id, result }` con el mismo `id`
- [ ] T030 [P] [US1] Ampliar `apps/desktop/src/backend/backendProcess.test.ts`: `testConnection(uri)` envía `test-connection` con un `id` único, resuelve con el `test-result` de ese `id` y, si no llega en 10 s, resuelve `{ ok: false, code: 'DATABASE_UNREACHABLE' }`
- [ ] T031 [P] [US1] Ampliar `apps/desktop/src/ipc/database.test.ts`: `database:test` con cadena no válida o remota sin TLS responde `DATABASE_URI_INVALID` / `DATABASE_TLS_REQUIRED` sin llamar al backend y no guarda nada; con cadena válida delega en `backend.testConnection`; `database:save` valida igual sin conectar, guarda, llama a `backend.restart()` y devuelve `{ ok: true, summary }` aunque la base de datos no responda; un argumento que no es string o supera 2048 caracteres hace lanzar al handler
- [ ] T032 [P] [US1] Ampliar `apps/client/src/features/database/databaseSlice.test.ts` con los thunks `testDatabase` (`test.status` `running` → `done` con `result`) y `saveDatabase` (`saving` `true` → `false`, actualiza `summary` si `ok`)
- [ ] T033 [P] [US1] Escribir `apps/client/src/features/database/components/DatabaseForm.test.tsx`: campo «Cadena de conexión» con etiqueta; «Probar conexión» muestra «Conexión correcta» o el mensaje del error en un `Alert`; «Guardar» llama a `onSave`; con error de validación muestra el motivo y no navega; botones deshabilitados mientras `saving` o `test.status === 'running'`
- [ ] T034 [P] [US1] Escribir `apps/client/src/pages/DatabaseSettingsPage.test.tsx`: muestra el formulario; tras un guardado correcto navega a `/login`; «Volver» sin guardar no llama a `saveDatabase`

### Implementation for User Story 1

- [ ] T035 [US1] Añadir a `apps/server/src/config/database.ts` `testConnection(uri, timeoutMs = 10000)` (`mongoose.createConnection` con `serverSelectionTimeoutMS: timeoutMs`, `db.admin().ping()` y cierre en `finally`) y `classifyConnectionError(err)`, hasta que T028 pase
- [ ] T036 [US1] Manejar `test-connection` en `onMessage` de `apps/server/src/embeddedRuntime.ts` con `testConnection` y responder `test-result`, hasta que T029 pase
- [ ] T037 [US1] Añadir `testConnection(uri)` a `apps/desktop/src/backend/backendProcess.ts` (mapa de peticiones pendientes por `id`, límite de 10 s), hasta que T030 pase
- [ ] T038 [US1] Añadir los handlers `database:test` y `database:save` a `registerDatabaseIpc` en `apps/desktop/src/ipc/database.ts` (dependencias inyectadas: almacén y backend) y pasarlas desde `apps/desktop/src/main.ts`; el backend lee la cadena con `getUri` del almacén en cada arranque, hasta que T031 pase
- [ ] T039 [US1] Añadir `testDatabase(uri)` y `saveDatabase(uri)` a `apps/client/src/features/database/databaseApi.ts` y los thunks homónimos a `apps/client/src/features/database/databaseSlice.ts`, hasta que T032 pase
- [ ] T040 [US1] Crear `apps/client/src/features/database/components/DatabaseForm.tsx` y `DatabaseForm.module.css` componiendo `TextField`, `Button` y `Alert`, con las props `test`, `saving`, `onTest`, `onSave` (sin llamar al puente ni a la store) y el aspecto del tablero Ajustes › Base de datos, modo «MongoDB directo» (`docs/design/README.md` y `docs/design/canvas/`), hasta que T033 pase
- [ ] T041 [US1] Crear `apps/client/src/pages/DatabaseSettingsPage.tsx` (título «Base de datos», `DatabaseForm` conectado al slice, enlace «Volver» al login y `navigate('/login')` tras guardar con `ok`), hasta que T034 pase
- [ ] T042 [US1] Modificar `apps/client/src/routes/AppRouter.tsx`: ruta pública solo en escritorio `DATABASE_SETTINGS_PATH` → `DatabaseSettingsPage` y actualizar el comentario (FR-007, FR-008); eliminar `apps/client/src/pages/ServerSettingsPlaceholder.tsx` y `ServerSettingsPlaceholder.test.tsx`

**Checkpoint**: quickstart escenarios 1–5 pasan en escritorio (`npm run dev --workspace=apps/client` +
`npm run dev --workspace=apps/desktop`).

---

## Phase 4: User Story 2 - Ver a qué base de datos está conectado el escritorio (Priority: P1)

**Goal**: el login de escritorio muestra el host (sin credenciales) y el estado real de la base de datos en texto,
comprobado al abrir el login y tras guardar; los fallos de conexión no cuentan como intento fallido; la web no
muestra nada de esto.

**Independent Test**: login de escritorio con la base de datos arrancada y con `docker compose stop`; login en la
web (quickstart escenarios 5, 8, 9 y 11).

### Tests for User Story 2 ⚠️ (escribir primero, deben fallar)

- [ ] T043 [P] [US2] Ampliar `apps/server/src/modules/health/health.test.ts`: con mongodb-memory-server conectado `data.database` es `connected`; tras `disconnectDatabase()` es `disconnected`; la respuesta mantiene `status: 'ok'`
- [ ] T044 [P] [US2] Escribir `apps/server/src/middlewares/errorHandler.test.ts`: `MongooseServerSelectionError`, `MongoNotConnectedError`, `MongoNetworkError` y el error de operación sin conexión inicial (con `bufferCommands: false`) → `503` con `{ code: 'DATABASE_UNAVAILABLE', message: 'No se puede conectar con la base de datos.' }`; el resto sigue en `500 INTERNAL_ERROR` sin `stack`
- [ ] T045 [P] [US2] Ampliar `apps/server/src/modules/auth/auth.routes.test.ts`: con la base de datos desconectada (`bufferCommands: false`), `POST /api/auth/login` responde `503 DATABASE_UNAVAILABLE` y, al reconectar, no hay ningún `LoginAttempt` registrado para ese email (FR-018)
- [ ] T046 [P] [US2] Ampliar `apps/desktop/src/ipc/database.test.ts`: `database:status` sin configuración → `unconfigured` sin llamar a `fetch`; con configuración llama a `<url del backend>/health` y devuelve su `data.database`; sin respuesta en 5 s, respuesta no OK o backend no listo → `disconnected`
- [ ] T047 [P] [US2] Ampliar `apps/client/src/features/database/databaseSlice.test.ts` con `checkDatabaseStatus` (`state` pasa a `checking` y después al valor recibido; si el puente falla, `disconnected`)
- [ ] T048 [P] [US2] Ampliar `apps/client/src/pages/LoginPage.test.tsx`: con puente que da `connected` muestra el host y «Conectado»; con `disconnected` muestra «Sin conexión»; con una cadena con usuario y contraseña solo aparece el host; el estado se pide una sola vez al montar (sin sondeo con temporizadores falsos); sin `window.desktop` no aparecen indicador ni enlace
- [ ] T049 [P] [US2] Ampliar `apps/client/src/features/auth/components/LoginForm.test.tsx`: un error `503 DATABASE_UNAVAILABLE` muestra un mensaje de conexión distinto del de credenciales y no marca los campos como inválidos

### Implementation for User Story 2

- [ ] T050 [US2] Modificar `apps/server/src/modules/health/health.routes.ts`: `database` `connected` solo si `mongoose.connection.readyState === 1` y `ping` responde en menos de 2 s (helper en el propio módulo), y actualizar su bloque `@openapi` para que coincida con `specs/002-desktop-local-backend/contracts/health.openapi.yaml`, hasta que T043 pase
- [ ] T051 [US2] Modificar `apps/server/src/middlewares/errorHandler.ts`: añadir `isDatabaseConnectionError(err)` (por `name` del error) y traducirlo en `toAppError` a `AppError('DATABASE_UNAVAILABLE', 503, 'No se puede conectar con la base de datos.')`; documentar el código en la descripción de `ErrorEnvelope` de `apps/server/src/docs/swagger.ts`, hasta que T044 y T045 pasen
- [ ] T052 [US2] Añadir el handler `database:status` a `apps/desktop/src/ipc/database.ts` (`fetch` inyectado con `AbortSignal.timeout(5000)` contra `backend.getUrl()`), hasta que T046 pase
- [ ] T053 [US2] Añadir `getDatabaseStatus()` a `apps/client/src/features/database/databaseApi.ts` y el thunk `checkDatabaseStatus` a `databaseSlice.ts`; en `apps/client/src/pages/LoginPage.tsx` despacharlo al montar junto a `loadDatabaseSummary` (al volver de guardar se monta de nuevo, lo que cubre «después de guardar», FR-005) y mapear `connected` → `ok`, `disconnected` → `down`, hasta que T047 y T048 pasen
- [ ] T054 [US2] Modificar `toAuthErrorMessage` en `apps/client/src/features/auth/authApi.ts` y la lógica que decide marcar los campos (en `apps/client/src/features/auth/authSlice.ts` o `components/LoginForm.tsx`, donde esté hoy) para tratar `DATABASE_UNAVAILABLE` como error de conexión, hasta que T049 pase

**Checkpoint**: quickstart escenarios 5, 8, 9 y 11 pasan; US1 sigue funcionando.

---

## Phase 5: User Story 3 - Cambiar de base de datos sin perder la seguridad (Priority: P2)

**Goal**: al cambiar de base de datos ninguna sesión anterior sigue valiendo; la cadena guardada solo se ve con la
contraseña oculta y nunca está en claro en disco; sin cifrado del sistema se avisa y no se escribe en disco.

**Independent Test**: sesión con «Mantener la sesión», cambiar de base de datos y volver a la primera; buscar la
contraseña en `userData` (quickstart escenarios 6, 7 y 10).

### Tests for User Story 3 ⚠️ (escribir primero, deben fallar)

- [ ] T055 [P] [US3] Ampliar `apps/desktop/src/ipc/database.test.ts`: `database:save` llama a `refreshTokenStore.clear()` (memoria y `session.bin`) antes de `backend.restart()`; los bytes de `database.bin` no contienen ni la cadena ni la contraseña; sin cifrado disponible no se crea `database.bin` y el resumen trae `persisted: false`; `database:get` devuelve `maskedUri` con `••••••••` y nunca la contraseña
- [ ] T056 [P] [US3] Ampliar `apps/client/src/features/database/components/DatabaseForm.test.tsx`: con `summary` configurado muestra «Actual: <maskedUri>» con la contraseña oculta y el campo vacío; con `persisted: false` muestra el aviso «La configuración solo durará mientras la aplicación siga abierta.»
- [ ] T057 [P] [US3] Ampliar `apps/client/src/pages/DatabaseSettingsPage.test.tsx`: tras guardar con `ok` se limpia la sesión del cliente (`auth` sin usuario ni access token) antes de navegar a `/login`

### Implementation for User Story 3

- [ ] T058 [US3] En `apps/desktop/src/ipc/database.ts` inyectar el almacén de refresh token y llamar a `clear()` en `database:save` antes de reiniciar el backend; pasarlo desde `apps/desktop/src/main.ts`, hasta que T055 pase
- [ ] T059 [US3] En `apps/client/src/features/database/databaseSlice.ts`, al completarse `saveDatabase` con `ok`, despachar la acción de `apps/client/src/features/auth/authSlice.ts` que limpia la sesión local (reutilizar la del logout; si no existe una síncrona, añadir `sessionCleared`), hasta que T057 pase
- [ ] T060 [US3] En `apps/client/src/features/database/components/DatabaseForm.tsx` mostrar la cadena actual enmascarada (`summary.maskedUri`) como texto de solo lectura y el `Alert` de aviso cuando `persisted` es `false`, hasta que T056 pase

**Checkpoint**: quickstart escenarios 6, 7 y 10 pasan; US1 y US2 siguen funcionando.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T061 [P] Marcar en `specs/001-user-login/spec.md` la US6 y el SC-004 como sustituidos por 002-desktop-local-backend (FR-018 ya lo está) y añadir al inicio de `specs/001-user-login/contracts/desktop-bridge.md` la nota «Sustituido por specs/002-desktop-local-backend/contracts/desktop-bridge.md»
- [ ] T062 [P] Actualizar `CLAUDE.md`: en Contexto, el escritorio arranca su propio backend local y se conecta directamente a MongoDB (local o remoto con TLS); en la tabla de `apps/desktop`, el uso de Electron (empaqueta `apps/client` y `apps/server`)
- [ ] T063 [P] Comprobar con `npm run lint` que todas las funciones nuevas cumplen ≤40 líneas efectivas y anidamiento ≤2, y extraer helpers donde haga falta
- [ ] T064 [P] Comprobar que `/api-docs` (backend web) coincide con `specs/002-desktop-local-backend/contracts/health.openapi.yaml` y documenta `DATABASE_UNAVAILABLE`
- [ ] T065 [P] Revisar la accesibilidad de `apps/client/src/pages/DatabaseSettingsPage.tsx` y del indicador del login a 390 px y 1440 px según `docs/design/README.md` (etiquetas, foco visible, objetivos de 44 px, contraste 4.5:1, estado en texto)
- [ ] T066 Ejecutar `npm run package --workspace=apps/desktop`, instalar el resultado y repetir los escenarios 1–3 de quickstart.md sin `apps/server` en marcha (research R12); si el backend no arranca empaquetado, parar y proponer el ADR de esbuild
- [ ] T067 Ejecutar `npm run lint` y `npm test --workspaces` en verde y validar manualmente quickstart.md completo

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sin dependencias.
- **Foundational (Fase 2)**: depende de Setup y bloquea todas las historias. Dentro: Shared → Server/Desktop →
  Client (el cliente necesita los tipos v2 de T005).
- **US1 (Fase 3)**: depende de Foundational. Es el MVP.
- **US2 (Fase 4)**: depende de Foundational; en la práctica después de US1 para poder configurar una base de
  datos y comprobar «Conectado».
- **US3 (Fase 5)**: depende de US1 (`database:save`, `DatabaseForm`, `DatabaseSettingsPage`).
- **Polish (Fase 6)**: al final.

### Story Completion Order

```text
Setup → Foundational → US1 ─┬─► US2
                            └─► US3
                                    → Polish
```

### Within Each User Story

- Tests primero, y deben fallar.
- Servidor → proceso principal (backend, IPC) → cliente (API → slice → componentes → páginas → rutas).

---

## Parallel Example: Foundational

```text
# Tests y tipos en paralelo:
T003 mongoUri.test · T004 constants/database · T005 types/desktop · T007 env.test · T008 embeddedRuntime.test
T015 backendProcess.test · T016 ipc/database.test · T022 ConnectionStatus.test · T023 databaseSlice.test

# Implementación en paralelo (archivos distintos):
T011 config/database.ts · T012 app.ts · T020 eliminar ipc/server y config
```

## Parallel Example: User Story 1

```text
# Tests en paralelo:
T028 database.test · T029 embeddedRuntime.test · T030 backendProcess.test · T031 ipc/database.test
T032 databaseSlice.test · T033 DatabaseForm.test · T034 DatabaseSettingsPage.test
```

## Parallel Example: después de US1

```text
Dev A: US2 (T043–T054)   Dev B: US3 (T055–T060)
```

(T046/T055 y T053/T059 tocan los mismos archivos: si se hacen en paralelo, coordinar los cambios en
`apps/desktop/src/ipc/database.ts` y `databaseSlice.ts`.)

---

## Implementation Strategy

### MVP (US1)

1. Fases 1 y 2.
2. US1: configurar, probar y guardar una base de datos y entrar con «admin». **Parar y validar** (quickstart 1–5).

### Entrega incremental

3. US2: estado real en el login y errores de conexión que no cuentan como intento (cierra los P1).
4. US3: invalidación de sesiones, cadena enmascarada y aviso sin cifrado.
5. Polish, incluido el empaquetado real (T066), que valida el riesgo de research R12.

### Notas

- Hacer commit al terminar cada tarea o grupo lógico (Conventional Commits, en español o inglés pero
  consistente dentro de un mismo PR).
- No adelantar la pestaña Ajustes › Base de datos dentro de la app, el resto de Ajustes ni el modo API en
  escritorio: quedan fuera de alcance (spec, Assumptions).
