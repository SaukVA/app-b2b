> **Sustituido por [specs/002-desktop-local-backend/contracts/desktop-bridge.md](../../002-desktop-local-backend/contracts/desktop-bridge.md).**

# Contrato: puente de escritorio (`window.desktop`)

Lo expone `apps/desktop/src/preload.ts` mediante `contextBridge.exposeInMainWorld('desktop', …)` y lo
implementan los handlers de `apps/desktop/src/ipc/auth.ts` y `ipc/server.ts`. Su tipo se declara en
`packages/shared/src/types/desktop.ts` para que lo use `apps/client`.

**En web `window.desktop` es `undefined`.** Es la única señal que usa el cliente para mostrar u ocultar
el bloque de servidor (FR-018 y FR-019).

```ts
interface DesktopBridge {
  readonly isDesktop: true;
  getServerUrl(): Promise<string>;                 // p. ej. "https://erp.empresa.local/api"
  checkServer(): Promise<{ reachable: boolean }>;  // GET {serverUrl}/health, timeout de 5 s
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string, persistent: boolean): Promise<void>;
  clearRefreshToken(): Promise<void>;
}
```

| Método | Canal IPC | Comportamiento |
|---|---|---|
| `getServerUrl` | `server:get-url` | Lee `userData/config.json`. Si no existe, usa `DEFAULT_SERVER_URL` de la configuración de build. |
| `checkServer` | `server:check` | `reachable: true` si `/health` responde `success: true` antes de 5 s. |
| `getRefreshToken` | `auth:get-refresh` | Devuelve primero el token en memoria y, si no hay, el guardado con `safeStorage`. |
| `setRefreshToken` | `auth:set-refresh` | Siempre lo guarda en memoria. Con `persistent = true` también lo cifra con `safeStorage` en `userData/session.bin`; con `false` borra ese archivo. |
| `clearRefreshToken` | `auth:clear-refresh` | Borra la memoria y `session.bin` (logout, FR-013). |

**Seguridad**: `contextIsolation: true` y `nodeIntegration: false`. El renderer nunca accede a `fs` ni a
`safeStorage` directamente. El token cifrado solo se puede descifrar con la cuenta del sistema operativo
que lo guardó.

**"Cambiar servidor"**: navega a la ruta pública `/ajustes/servidor`, que solo existe en escritorio. La
pantalla de configuración pertenece a Ajustes › Base de datos (fuera de alcance). Mientras no exista, la
ruta muestra un aviso con la URL actual.
