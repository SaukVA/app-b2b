# Contrato: backend embebido en escritorio

El proceso principal de Electron (`apps/desktop/src/backend/backendProcess.ts`) arranca
`@app/server/dist/embedded.js` con `utilityProcess.fork()`. El backend es `buildApp()` de `apps/server` sin
`/api-docs`.

## Entorno del proceso hijo

El hijo hereda el entorno del proceso principal y estas variables lo sobrescriben: en Windows, sin las
variables del sistema (`SystemRoot`…) el hijo no puede abrir sockets y `listen` falla con `UNKNOWN`.

| Variable | Valor | Notas |
|---|---|---|
| `PORT` | `0` | El sistema asigna un puerto libre. |
| `HOST` | `127.0.0.1` | Nunca accesible desde la red (FR-003). |
| `NODE_ENV` | `production` | |
| `CORS_ORIGINS` | `app://.` y, en desarrollo, la URL del cliente Vite | |
| `JWT_ACCESS_SECRET` | 48 bytes aleatorios en base64url, nuevos en cada arranque | Ver research R3 y R6. |
| `MONGODB_URI` | Cadena descifrada | Vacía si no hay base de datos configurada (vacía y no ausente: así `dotenv` no carga la del `.env` de desarrollo). |

## Mensajes (proceso hijo → proceso principal)

| Mensaje | Cuándo |
|---|---|
| `{ type: 'ready', port: number }` | El servidor HTTP ya escucha. Se envía antes de conectar con la base de datos. |
| `{ type: 'test-result', id: string, result: DatabaseTestResult }` | Respuesta a `test-connection`. |

## Mensajes (proceso principal → proceso hijo)

| Mensaje | Efecto |
|---|---|
| `{ type: 'test-connection', id: string, uri: string }` | Conexión temporal (`serverSelectionTimeoutMS: 10000`), `ping` y cierre. Responde con `test-result` y el mismo `id`. Fallo de autenticación → `DATABASE_AUTH_FAILED`; cualquier otro fallo de conexión → `DATABASE_UNREACHABLE`. |

## Ciclo de vida

```text
arranque app ──► fork ──► ready(port) ──► conectar (reintento cada 5 s) ──► ensureBootstrapAccount()
guardar base de datos ──► kill hijo ──► fork con la nueva MONGODB_URI y otro JWT_ACCESS_SECRET ──► ready(port)
el hijo termina inesperadamente ──► se vuelve a lanzar (como mucho 3 veces seguidas; después, estado disconnected)
cerrar app ──► kill hijo
```

## Errores de base de datos en la API

Cualquier ruta que necesite la base de datos sin conexión responde:

```json
{ "success": false, "error": { "code": "DATABASE_UNAVAILABLE", "message": "No se puede conectar con la base de datos." } }
```

con status `503`. Aplica también a la web: hoy esos errores acaban en `500 INTERNAL_ERROR`.
