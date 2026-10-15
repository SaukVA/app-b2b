# Research: Escritorio con backend local y base de datos configurable

Decisiones técnicas de la fase 0. Cada una resuelve un punto abierto del Technical Context de [plan.md](plan.md).
Las referencias «001 R*» apuntan a [specs/001-user-login/research.md](../001-user-login/research.md).

## R1. Dónde se ejecuta el backend local

- **Decision**: el proceso principal de Electron arranca `apps/server` en un proceso hijo con
  `utilityProcess.fork()` (API de Electron, sin dependencias nuevas). El backend es el mismo código que en la web
  (`buildApp()`), con un punto de entrada propio para escritorio: `apps/server/src/embedded.ts`.
- **Rationale**:
  - `bcryptjs` es JS puro y bloquea el hilo mientras calcula un hash (unos 100 ms). En el proceso principal
    congelaría la ventana; en un proceso hijo no.
  - Si el backend falla, se reinicia el hijo sin cerrar la aplicación.
  - Para cambiar de base de datos basta con reiniciar el hijo (R5), sin lógica de reconexión en caliente.
- **Alternatives considered**: ejecutar Express en el proceso principal (bloquea la UI y mezcla responsabilidades);
  `child_process.fork` de Node (funciona, pero `utilityProcess` es la opción soportada por Electron y comparte el
  ciclo de vida de la app); empaquetar un `mongod` propio (no lo pide nadie: la base de datos la elige el usuario).

## R2. Red del backend local

- **Decision**: el hijo escucha solo en `127.0.0.1` y en el puerto `0` (lo asigna el sistema). Al arrancar, envía
  al proceso principal `{ type: 'ready', port }`. `getServerUrl()` devuelve `http://127.0.0.1:<port>/api`.
- **Rationale**: cumple FR-003 (solo accesible desde el equipo) y evita choques de puerto. El cliente ya resuelve la
  URL base en cada petición (001, `httpClient`), así que un cambio de puerto tras reiniciar el hijo es transparente.
- **Alternatives considered**: puerto fijo (falla si está ocupado o si hay dos instancias); `0.0.0.0` (expone el
  servicio a la red local).

## R3. Configuración del backend embebido

- **Decision**: el proceso principal lanza el hijo con estas variables de entorno: `PORT=0`, `HOST=127.0.0.1`,
  `NODE_ENV=production`, `CORS_ORIGINS=app://.,<url del cliente en dev>`, `JWT_ACCESS_SECRET=<aleatorio por
  arranque>` y `MONGODB_URI=<cadena descifrada>` (solo si hay base de datos configurada).
  - `env.ts` admite `PORT=0` y `MONGODB_URI` opcional (y `HOST` opcional, por defecto el actual). `server.ts`
    (web) sigue exigiendo `MONGODB_URI`; `embedded.ts` funciona sin ella (estado «Sin configurar»).
  - `/api-docs` no se monta en el backend embebido.
- **Rationale**: reutiliza `getEnv()` sin otro mecanismo de configuración. El secreto JWT solo firma access tokens
  de 15 min y los refresh tokens viven en la base de datos (001 R1), así que un secreto nuevo por arranque no rompe
  «Mantener la sesión» y además invalida los access tokens al cambiar de base de datos (R6).
- **Riesgo aceptado**: la cadena de conexión está en el entorno del proceso hijo, legible por la misma cuenta del
  sistema operativo. Esa cuenta ya puede descifrarla con `safeStorage`, así que no amplía la exposición.
- **Alternatives considered**: pasar la cadena por mensaje tras arrancar (obliga a reconectar en caliente y a mantener
  un estado «esperando configuración» en el servidor); guardar un secreto JWT fijo cifrado (más superficie y
  ninguna ventaja).

## R4. Conexión, caídas y errores de base de datos

- **Decision**:
  - `embedded.ts` empieza a escuchar antes de conectar y llama a `connectDatabase()` en segundo plano, con
    reintentos cada 5 s si el servidor de base de datos no responde. Tras la primera conexión ejecuta
    `ensureBootstrapAccount()` (001 US7). Mongoose reconecta solo ante caídas posteriores (FR-019).
  - En el escritorio se conecta con `bufferCommands: false` y `serverSelectionTimeoutMS: 5000`: sin conexión, las
    operaciones fallan enseguida en vez de quedarse esperando.
  - `errorHandler` traduce los errores de conexión de Mongoose y del driver (`MongooseServerSelectionError`,
    `MongoNotConnectedError`, `MongoNetworkError` y el error de operación sin conexión inicial) a
    `AppError('DATABASE_UNAVAILABLE', 503, 'No se puede conectar con la base de datos.')`.
- **Rationale**: el login falla antes de llegar a `registerFailure`, así que un fallo de conexión nunca cuenta como
  intento (FR-018). El código propio permite al cliente tratarlo como error de conexión y no marcar los campos.
- **Alternatives considered**: dejar el buffering por defecto (las peticiones esperan 10 s y acaban en 500 genérico);
  cerrar el hijo si no conecta (el login no podría mostrar el estado).

## R5. Cambiar de base de datos sin reiniciar la aplicación

- **Decision**: al guardar, el proceso principal detiene el hijo y lanza otro con la nueva cadena y un secreto JWT
  nuevo. Mientras arranca, `getServerUrl()` espera al mensaje `ready` (como mucho 10 s).
- **Rationale**: un proceso, una base de datos durante toda su vida. Evita estados intermedios (consultas de la base
  anterior mezcladas con la nueva) y cumple FR-011 sin tocar la lógica de los módulos.
- **Alternatives considered**: `mongoose.disconnect()` + `connect()` dentro del mismo proceso (estado global de
  Mongoose compartido por todos los modelos; más difícil de dejar limpio).

## R6. Invalidar las sesiones al cambiar de base de datos

- **Decision**: al guardar otra base de datos, el proceso principal borra el refresh token del equipo (memoria y
  `session.bin`, 001 R2) y el nuevo hijo usa otro secreto JWT. El renderer limpia su sesión y vuelve al login.
- **Rationale**: los access tokens anteriores dejan de verificar (otro secreto) y el refresh token ya no existe en el
  equipo, así que ninguna sesión anterior se puede usar desde aquí (FR-012), ni siquiera si se vuelve después a la
  base de datos anterior.
- **Alternatives considered**: revocar las sesiones en la base de datos anterior (puede no estar accesible y
  afectaría a otros equipos que la usan).

## R7. Guardar la cadena de conexión

- **Decision**: el proceso principal guarda `{ uri }` cifrado con `safeStorage` en `userData/database.bin`, con el
  mismo patrón que `session.bin` (001 R2, `ipc/auth.ts`). Si `safeStorage.isEncryptionAvailable()` es `false`, se
  guarda solo en memoria y el resumen lleva `persisted: false` (FR-017). Un `database.bin` que no se puede descifrar
  equivale a «Sin configurar».
- **Rationale**: nunca hay texto plano en disco (FR-014). El renderer recibe solo un resumen (R9).
- **Alternatives considered**: `keytar` o el llavero del sistema (dependencia nativa que complica el empaquetado,
  justo lo que se evitó con `bcryptjs`).

## R8. Validar la cadena de conexión y exigir cifrado en remoto

- **Decision**: un analizador propio y pequeño, `parseMongoUri()`, en `packages/shared/src/utils/mongoUri.ts`:
  - Acepta `mongodb://` y `mongodb+srv://`. Extrae usuario, contraseña, hosts, base de datos y opciones.
  - Es local si todos los hosts son `localhost`, `127.0.0.1` o `::1`.
  - Va cifrada si es `mongodb+srv://` (TLS por defecto salvo `tls=false`/`ssl=false`) o si lleva `tls=true` o
    `ssl=true`.
  - Una cadena remota sin cifrado se rechaza con el código `DATABASE_TLS_REQUIRED` (FR-016).
  - Devuelve también la versión enmascarada (`mongodb://usuario:••••••••@host/db`) y el texto del indicador (solo
    hosts).
- **Rationale**: no hace falta ninguna dependencia nueva. El formato es estable y las reglas son pocas. Vive en
  `shared` porque lo usan el proceso principal (validar y enmascarar) y el backend (probar la conexión).
- **Alternatives considered**: `mongodb-connection-string-url` (dependencia transitiva del driver; importarla
  directamente o añadirla requiere aprobación y no aporta lo que nos falta: la regla de TLS).

## R9. Lo que ve el renderer

- **Decision**: el puente `window.desktop` (contrato en [contracts/desktop-bridge.md](contracts/desktop-bridge.md))
  pasa a exponer:
  - `getDatabase()`: devuelve `{ configured, host, maskedUri, persisted }`.
  - `getDatabaseStatus()`: devuelve `{ state }`.
  - `testDatabase(uri)` y `saveDatabase(uri)`.
  - Desaparece `checkServer()`, y `getServerUrl()` pasa a dar la URL del backend local.
  - La cadena completa solo viaja del renderer al proceso principal, cuando el usuario la escribe; nunca al revés
    (FR-015).
- **Rationale**: la interfaz necesita lo justo para pintar el indicador y el formulario. Así se cumplen FR-006 y
  FR-013 por construcción.

## R10. Estado y prueba de la conexión

- **Decision**:
  - `getDatabaseStatus()`:
    - Sin configurar da `unconfigured`.
    - Si no, el proceso principal llama a `GET /api/health` del backend local (5 s como máximo), que ahora incluye
      `database: 'connected' | 'disconnected'` según `mongoose.connection.readyState` y un `ping`.
    - Sin respuesta, da `disconnected`.
  - `testDatabase(uri)`:
    - Primero valida con `parseMongoUri()`.
    - Después el proceso principal pide al hijo, por mensaje (no por HTTP), que abra una conexión temporal
      (`mongoose.createConnection`, `serverSelectionTimeoutMS: 10000`), haga `ping` y la cierre.
    - Responde `{ ok: true }` o `{ ok: false, code, message }`.
- **Rationale**: el estado refleja la base de datos real, no solo que el backend esté vivo (FR-005). Probar por
  mensaje evita exponer en HTTP un endpoint que se conecte a direcciones arbitrarias. El límite de 10 s cumple
  FR-009.
- **Alternatives considered**: probar desde el proceso principal importando el driver (duplica dependencias en el
  proceso de la UI); endpoint `POST /api/database/test` (cualquier proceso local podría usarlo para sondear la red).

## R11. Cliente: indicador, pantalla y estado

- **Decision**:
  - El componente genérico `ServerStatus` (fase 9 de 001) se generaliza a `ConnectionStatus`, con props `label`,
    `value`, `state` (`checking | ok | down | unconfigured`), `linkText` y `href`. No se duplica (VIII).
  - Nueva funcionalidad `features/database/`, con `databaseApi.ts` (llama al puente), `databaseSlice.ts`
    (resumen, estado y resultado de la prueba) y `components/DatabaseForm.tsx`.
  - La página `/ajustes/base-de-datos`, pública y solo en escritorio, sustituye a `/ajustes/servidor`.
  - `LoginPage` deja de llamar al puente directamente: despacha los thunks del slice.
  - `toAuthErrorMessage()` trata `DATABASE_UNAVAILABLE` como error de conexión (no marca los campos).
- **Rationale**: cumple VIII (el puente no se llama desde componentes) y corrige de paso la llamada directa que dejó la
  fase 9 de 001.

## R12. Empaquetado

- **Decision**:
  - `apps/desktop` declara `"@app/server": "*"` como dependencia de workspace, para que electron-builder incluya
    `apps/server/dist` y sus dependencias de producción (Express, Mongoose…).
  - El proceso principal resuelve la entrada con `require.resolve('@app/server/dist/embedded.js')`.
  - `npm run dev --workspace=apps/desktop` compila `apps/server` antes de arrancar.
- **Rationale**: no hace falta empaquetador nuevo (esbuild requeriría aprobación). Es una dependencia interna del
  monorepo, no de terceros.
- **Riesgo**: electron-builder con workspaces de npm y `node_modules` elevado a la raíz. Se valida con
  `npm run package` en la tarea final del plan. Si falla, la alternativa es un ADR para añadir esbuild.

## R13. Configuración anterior (`serverUrl`)

- **Decision**: `userData/config.json` (con `serverUrl`, de 001 US6) se ignora y se borra en el primer arranque de la
  nueva versión. `ipc/config.ts` y `ipc/server.ts` desaparecen.
- **Rationale**: en escritorio ya no existe el modo API (spec, Clarifications). No hay nada que migrar a la base de
  datos.

## R14. Arquitectura registrada

- **Decision**: ADR `docs/adr/0002-desktop-embedded-backend.md` (R1–R6, R12), como exige CLAUDE.md para cambios de
  arquitectura. Se marca la US6 de 001 como sustituida en `specs/001-user-login/spec.md`.
