# Bug Fix: El login siempre muestra «Sin conexión» tras cambiar de base de datos

- **Slug**: login-db-status-offline
- **Fixed**: 2026-10-16
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`databaseStatus()` del proceso principal ya no da por buena la primera respuesta de `/api/health`: si no es `connected`, vuelve a preguntar cada 500 ms hasta que lo sea o se agote el tope de 5 s (`STATUS_TIMEOUT_MS`). Así, el backend que se acaba de reiniciar tiene tiempo de conectar antes de que el login muestre el estado.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/desktop/src/ipc/database.ts` | modified | Nueva constante `STATUS_RETRY_MS` (500 ms) y función auxiliar `waitForConnected()`. `databaseStatus()` la compite con el tope de 5 s, la cancela y limpia el temporizador al terminar. `askHealth()` no cambia. |
| `apps/desktop/src/ipc/database.test.ts` | modified / added tests | Los casos `disconnected` existentes pasan a temporizadores falsos (con el reintento tardan 5 s). Se añaden dos tests de regresión en un `describe` nuevo. |

## Diff Highlights (optional)

```ts
async function waitForConnected(deps, attempt: { cancelled: boolean }): Promise<DatabaseState> {
  while (!attempt.cancelled) {
    if ((await askHealth(deps)) === 'connected') return 'connected';
    await new Promise((resolve) => setTimeout(resolve, STATUS_RETRY_MS));
  }
  return 'disconnected';
}

// databaseStatus()
const state = await Promise.race([waitForConnected(deps, attempt), timeout]);
attempt.cancelled = true;
clearTimeout(timer);
```

## Tests Added or Updated

- `database.test.ts` › «tras reiniciar, sigue preguntando hasta que la base de datos conecta»: `/health` responde `disconnected` dos veces y después `connected` → el resultado es `connected` tras 2 × 500 ms y con 3 llamadas.
- `database.test.ts` › «con la base de datos inaccesible no se da por perdida antes de 5 s»: sin resolver a los 4999 ms; `disconnected` a los 5000 ms.
- `database.test.ts` › casos «/health responde disconnected», «la respuesta no es OK», «fetch falla» y «el backend no está listo»: ahora con temporizadores falsos, terminan en `disconnected` al cumplirse los 5 s.
- `database.test.ts` › «devuelve connected si /health responde connected»: sustituye al `it.each` anterior (se mantiene la comprobación de la URL `/api/health`).

## Local Verification

- `npm test --workspace=apps/desktop` → 3 suites, 58 tests, todos pasan.
- Con `database.ts` revertido a `HEAD`, los dos tests de regresión **fallan**; con la corrección, pasan.
- `npm run lint` → sin errores (inicialmente `max-lines-per-function` en el `describe`; se dividió en dos).
- `npx prettier --check` sobre los dos archivos → correcto.
- `npx tsc --noEmit -p apps/desktop` → 9 errores TS6059 (`rootDir` frente a `packages/shared`), los mismos que en `HEAD`: problema previo de configuración, ajeno a este cambio.
- Manual: no realizado (ver `/speckit-bug-test`).

## Deviations from Assessment

- No se añade el estado `connecting` a `/api/health`, que la evaluación dejaba como opcional. Se descarta para no cambiar el contrato de la API (`packages/shared`, `@openapi`, servidor). Consecuencia: con una base de datos inaccesible, «Sin conexión» aparece a los 5 s y no antes.
- No se añade el test opcional de integración en `embeddedRuntime`.

## Follow-ups

- Verificación manual en escritorio: guardar una cadena correcta → «Conectado»; guardar una incorrecta → «Sin conexión» a los ~5 s.
- Si la espera de 5 s con una base de datos incorrecta molesta, valorar `connecting` en `/api/health` o un mensaje `database-state` del backend embebido (alternativas de la evaluación).
- Revisar por separado los errores TS6059 de `tsc -p apps/desktop`.
