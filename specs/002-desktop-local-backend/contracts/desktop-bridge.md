# Contrato: puente de escritorio (`window.desktop`) · v2

Sustituye a [001 contracts/desktop-bridge.md](../../001-user-login/contracts/desktop-bridge.md). Lo expone
`apps/desktop/src/preload.ts` con `contextBridge.exposeInMainWorld('desktop', …)`. Su tipo vive en
`packages/shared/src/types/desktop.ts`. **En web `window.desktop` es `undefined`** (FR-008).

```ts
interface DesktopBridge {
  readonly isDesktop: true;
  /** URL del backend local (http://127.0.0.1:<puerto>/api). Espera a que esté listo, como mucho 10 s. */
  getServerUrl(): Promise<string>;
  /** Resumen sin credenciales: nunca devuelve la cadena completa. */
  getDatabase(): Promise<DatabaseSummary>;
  /** Estado real de la base de datos (5 s como máximo). */
  getDatabaseStatus(): Promise<{ state: DatabaseState }>;
  /** Valida y prueba una cadena sin guardarla (10 s como máximo). */
  testDatabase(uri: string): Promise<DatabaseTestResult>;
  /** Valida, guarda cifrada, borra la sesión del equipo y reinicia el backend con la nueva base de datos. */
  saveDatabase(uri: string): Promise<DatabaseTestResult & { summary?: DatabaseSummary }>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string, persistent: boolean): Promise<void>;
  clearRefreshToken(): Promise<void>;
}
```

| Método | Canal IPC | Comportamiento |
|---|---|---|
| `getServerUrl` | `backend:get-url` | Espera al mensaje `ready` del backend (ver [embedded-backend.md](embedded-backend.md)). Si no llega en 10 s, rechaza y el cliente lo trata como error de conexión. |
| `getDatabase` | `database:get` | Lee `database.bin` (o la memoria) y devuelve `DatabaseSummary`. |
| `getDatabaseStatus` | `database:status` | `unconfigured` sin configuración. Si no, `GET /api/health` del backend local: `database` de la respuesta, o `disconnected` si no responde en 5 s. |
| `testDatabase` | `database:test` | `parseMongoUri` → errores `DATABASE_URI_INVALID` / `DATABASE_TLS_REQUIRED` sin conectar. Si es válida, mensaje `test-connection` al backend (10 s): `DATABASE_UNREACHABLE` o `DATABASE_AUTH_FAILED` si falla. No guarda nada. |
| `saveDatabase` | `database:save` | Valida como `testDatabase` (sin conectar: se puede guardar aunque no responda). Guarda cifrada (o en memoria si no hay cifrado), borra el refresh token, reinicia el backend y devuelve `{ ok: true, summary }`. |
| `getRefreshToken` / `setRefreshToken` / `clearRefreshToken` | `auth:*` | Sin cambios respecto a 001. |

**Eliminado respecto a v1**: `checkServer()` y los canales `server:get-url` y `server:check`.

**Validación en el proceso principal**: todo argumento que llega por IPC se comprueba (`typeof uri === 'string'`,
longitud ≤ 2048) antes de usarse; si no cumple, el handler lanza.

**Seguridad**: `contextIsolation: true` y `nodeIntegration: false`. El preload corre en sandbox, así que repite los
nombres de canal en lugar de importarlos.
