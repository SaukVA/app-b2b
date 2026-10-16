# Bug Assessment: El login siempre muestra «Sin conexión» tras cambiar de base de datos

- **Slug**: login-db-status-offline
- **Created**: 2026-10-16
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> Cuando se hace un cambio de base de datos y se guardan los cambios, se hace una comprobación en la pantalla de login para revisar de que se tiene acceso a la base de datos, he probado haciendo varios cambios, por bd correctas y incorrectas pero siempre devuelve "Sin conexión"

## Symptom

En escritorio, tras guardar una base de datos en «Ajustes › Base de datos» y volver al login, el indicador muestra siempre «Sin conexión», también cuando la cadena es correcta y la base de datos está accesible. Lo esperado (FR-005) es «Conectado» si la base de datos responde y «Sin conexión» solo si no.

## Reproduction

1. Arrancar el escritorio (`npm run dev --workspace=apps/desktop`) con MongoDB local levantado (`docker compose up -d`).
2. En el login, pulsar «Cambiar base de datos» e introducir una cadena válida (p. ej. `mongodb://localhost:27017/app-b2b`); «Probar conexión» devuelve OK.
3. Pulsar «Guardar»: se navega a `/login`.
4. El indicador pasa por «Comprobando…» y queda en «Sin conexión», y no cambia aunque la conexión se establezca segundos después.

Confirmado por el usuario: en el arranque en frío **no** ocurre. Encaja con la hipótesis: al arrancar, el backend se lanza al iniciar la aplicación y le da tiempo a conectar mientras se carga la ventana y React; al guardar, el login se monta justo después del reinicio y la consulta llega antes de que termine la conexión.

## Suspected Code Paths

- `apps/desktop/src/ipc/database.ts:137` `saveDatabase()` — guarda la cadena y llama a `deps.backend.restart()` de forma síncrona; el renderer navega al login inmediatamente.
- `apps/client/src/pages/LoginPage.tsx:31-35` `DatabaseIndicator` — al montarse lanza `checkDatabaseStatus()` **una sola vez** y nunca vuelve a comprobar («nunca periódicamente»).
- `apps/desktop/src/ipc/database.ts:104-122` `askHealth()` / `databaseStatus()` — espera a `backend.getUrl()` (ready del hijo nuevo) y hace un único `GET /api/health`; cualquier `disconnected` es definitivo.
- `apps/server/src/embeddedRuntime.ts:71-76` `startEmbedded()` — envía `ready` en cuanto escucha y **después** lanza `connectWithRetry()` en segundo plano, sin esperarla.
- `apps/server/src/modules/health/health.routes.ts:13-15` `databaseHealth()` — con `readyState !== 1` (el hijo aún está en `connecting`) responde `disconnected` sin esperar.
- `apps/desktop/src/backend/backendProcess.ts:150-188` — `restart()` crea un `urlSlot` nuevo que se resuelve con el `ready` del hijo nuevo; correcto, pero ese `ready` llega antes de que Mongo esté conectado.

## Root Cause Hypothesis

Carrera entre el reinicio del backend embebido y la única comprobación de estado del login. Al guardar, el proceso principal reinicia el hijo; este empieza a escuchar, envía `ready` y solo entonces inicia `mongoose.connect()` (con `serverSelectionTimeoutMS: 5000`). El login, que se monta justo al volver, obtiene la URL nueva en cuanto llega `ready`, consulta `/api/health` mientras `readyState` es `connecting` (2) y recibe `disconnected`. Como `DatabaseIndicator` no reintenta ni el backend notifica cuando la conexión queda establecida, el indicador se queda en «Sin conexión» para cualquier cadena, correcta o no. Las pruebas actuales no lo detectan porque `fetchImpl` y `backend` están simulados y responden `connected` al instante. **Confianza: alta.**

## Proposed Remediation

**Preferred**: que la comprobación de estado del proceso principal tolere el arranque: en `databaseStatus()` (`apps/desktop/src/ipc/database.ts`), si `/api/health` responde `disconnected`, volver a preguntar a intervalos cortos (p. ej. cada 500 ms) hasta que responda `connected` o se agote `STATUS_TIMEOUT_MS` (5 s, que ya es el objetivo de rendimiento del plan). Así una base de datos correcta llega a «Conectado» en cuanto el hijo conecta, y una incorrecta sigue terminando en «Sin conexión» a los 5 s. Para que el reintento no sea ciego, `/api/health` puede exponer además el estado `connecting` (o el backend puede informar que el primer intento de conexión no ha terminado) y el proceso principal solo reintenta mientras sea así; esto evita esperar 5 s completos cuando el primer intento ya ha fallado. Extraer la espera a una función auxiliar para respetar el límite de ≤40 líneas.

**Alternatives**:
- Reintento en el renderer (`checkDatabaseStatus` o `DatabaseIndicator` reintentan mientras el estado sea `disconnected` durante unos segundos tras guardar). Más simple, pero duplica lógica de temporización en el cliente y contradice el comentario de diseño «nunca periódicamente».
- Que el hijo envíe un mensaje `database-state` (connected/disconnected) al proceso principal tras el primer intento de conexión, y que `databaseStatus()` espere ese mensaje (con el tope de 5 s). Es la opción más precisa, pero amplía el contrato `contracts/embedded-backend.md` y los tipos `BackendToMainMessage` de `packages/shared`.

**Files likely to change**:
- `apps/desktop/src/ipc/database.ts`
- `apps/desktop/src/ipc/database.test.ts`
- (si se añade `connecting`) `apps/server/src/modules/health/health.routes.ts`, `apps/server/src/modules/health/health.test.ts`, tipos en `packages/shared`, bloque `@openapi` de `/health`

**Tests to add or update**:
- `database.test.ts`: `fetchImpl` que devuelve `disconnected` en las primeras N llamadas y `connected` después → `database:status` resuelve `connected` dentro de `STATUS_TIMEOUT_MS` (temporizadores falsos de Jest).
- `database.test.ts`: `fetchImpl` que siempre devuelve `disconnected` → resuelve `disconnected` a los 5 s, sin quedar colgado.
- (si aplica) `health.test.ts`: con la conexión en curso, `/api/health` devuelve `connecting`.
- Opcional, integración en `embeddedRuntime`: `ready` antes de conectar no debe traducirse en estado definitivo.

## Risks & Considerations

- Tiempo en «Comprobando…»: con una base de datos inaccesible el indicador tardará hasta 5 s en mostrar «Sin conexión» (dentro del objetivo del plan, pero hoy es inmediato).
- Si se añade `connecting` a `/api/health`, es un cambio de contrato de la API: actualizar `@openapi`, `packages/shared` y los consumidores en el mismo commit.
- Evitar temporizadores huérfanos en el proceso principal (limpiar el intervalo al resolver la carrera).
- `entryPath` apunta a `@app/server/dist/embedded.js`: en desarrollo, si `dist` no se ha recompilado, la verificación puede ejecutar código antiguo del servidor.

## Open Questions

- Resuelta (2026-10-16): solo ocurre tras guardar; en el arranque en frío no se reproduce.
- Resuelta (2026-10-16): se aplica la opción preferida, reintento en el proceso principal (`databaseStatus()`), no el mensaje `database-state` del hijo.
