# Data Model: Escritorio con backend local y base de datos configurable

No hay colecciones nuevas en MongoDB: usuarios, sesiones e intentos siguen como en
[001 data-model](../001-user-login/data-model.md), dentro de la base de datos configurada. Los datos nuevos viven
en el equipo (proceso principal de Electron) o son tipos de intercambio de `packages/shared`.

## DatabaseConfig (equipo, `userData/database.bin`)

Lo guarda el proceso principal; el renderer nunca la recibe.

| Campo | Tipo | Reglas |
|---|---|---|
| `uri` | string | Cadena `mongodb://` o `mongodb+srv://` válida según `parseMongoUri` (R8). Si no es local, MUST ir cifrada (TLS). |

- En disco: JSON `{ uri }` cifrado con `safeStorage` (R7). NEVER texto plano.
- Sin cifrado disponible: solo en memoria durante la ejecución (`persisted = false`).
- Un `database.bin` que no se puede descifrar equivale a «sin configurar».

**Transiciones**:

```text
sin configurar ──guardar──► configurada ──guardar otra──► configurada (otra uri)
                                │
                     database.bin ilegible ──► sin configurar
```

Cada «guardar» reinicia el backend local y borra el refresh token del equipo (R5, R6).

## ParsedMongoUri (`packages/shared`, resultado de `parseMongoUri`)

| Campo | Tipo | Reglas |
|---|---|---|
| `scheme` | `'mongodb' \| 'mongodb+srv'` | |
| `hosts` | string[] | Al menos uno. `+srv`: exactamente uno y sin puerto. |
| `database` | string \| null | Ruta tras el host. |
| `username` | string \| null | |
| `hasPassword` | boolean | La contraseña nunca forma parte del resultado. |
| `isLocal` | boolean | `true` si todos los hosts son `localhost`, `127.0.0.1` o `::1`. |
| `usesTls` | boolean | `+srv` salvo `tls=false`/`ssl=false`; `mongodb://` solo con `tls=true` o `ssl=true`. |
| `display` | string | Hosts unidos por coma (lo que muestra el indicador). |
| `masked` | string | Cadena con la contraseña sustituida por `••••••••`. |

**Errores** (`{ ok: false, code, message }`):

| Código | Cuándo | Mensaje |
|---|---|---|
| `DATABASE_URI_INVALID` | Esquema, hosts o formato no válidos | «La cadena de conexión no es válida: …» (motivo) |
| `DATABASE_TLS_REQUIRED` | Remota sin TLS | «Las bases de datos remotas exigen conexión cifrada (tls=true o mongodb+srv).» |

## DatabaseSummary (`packages/shared`, proceso principal → renderer)

| Campo | Tipo | Reglas |
|---|---|---|
| `configured` | boolean | |
| `host` | string \| null | `ParsedMongoUri.display`; `null` si no hay configuración. |
| `maskedUri` | string \| null | `ParsedMongoUri.masked`; nunca la contraseña. |
| `persisted` | boolean | `false` si se guardó solo en memoria (FR-017). |

## DatabaseState (`packages/shared`)

`'unconfigured' | 'connected' | 'disconnected'`. El renderer añade `checking` mientras espera la respuesta. Se
calcula al abrir el login y tras guardar (FR-005), nunca de forma periódica.

## DatabaseTestResult (`packages/shared`)

`{ ok: true } | { ok: false; code: 'DATABASE_URI_INVALID' | 'DATABASE_TLS_REQUIRED' | 'DATABASE_UNREACHABLE' |
'DATABASE_AUTH_FAILED'; message: string }`. `DATABASE_UNREACHABLE` y `DATABASE_AUTH_FAILED` los produce la prueba
real (R10). `saveDatabase` devuelve el mismo tipo más `summary` cuando `ok` es `true`.

## Estado en el cliente (`features/database/databaseSlice.ts`)

| Campo | Tipo | Uso |
|---|---|---|
| `summary` | DatabaseSummary \| null | Indicador y formulario. |
| `state` | `'checking' \| DatabaseState` | Indicador del login. |
| `test` | `{ status: 'idle' \| 'running' \| 'done'; result: DatabaseTestResult \| null }` | Resultado de «Probar conexión». |
| `saving` | boolean | Deshabilita el formulario mientras se guarda. |
