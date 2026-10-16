# ADR 0002: Backend embebido en el escritorio con conexión directa a MongoDB

- **Estado**: Aceptada
- **Fecha**: 2026-10-16
- **Contexto de origen**: feature `002-desktop-local-backend` (research.md, R1–R6 y R12)

## Contexto

Hasta 001-user-login, la app de escritorio era solo una ventana que cargaba `apps/client` y hablaba con un
servidor API externo cuya URL se guardaba en el equipo (US6 de 001). Se quiere que la instalación de
escritorio funcione por sí sola, sin un servidor de la empresa intermedio, y que pueda usar una base de datos
MongoDB local o remota y cambiarla cuando se quiera.

Restricciones:

- Mismo código de backend que la web (`buildApp()` de `apps/server`): no se duplica lógica de negocio.
- Sin dependencias de terceros nuevas ni binarios nativos que compliquen el empaquetado.
- El backend no puede quedar accesible desde la red (FR-003) y la cadena de conexión no puede llegar completa
  al renderer (FR-015).

## Decisión

- **Proceso hijo** (R1): el proceso principal de Electron arranca `apps/server` con `utilityProcess.fork()`
  desde una entrada propia, `apps/server/src/embedded.ts`. `bcryptjs` y las peticiones no bloquean la ventana,
  y si el backend falla se relanza sin cerrar la app.
- **Red** (R2): el hijo escucha solo en `127.0.0.1` y en el puerto `0`. Al arrancar envía
  `{ type: 'ready', port }` y `getServerUrl()` devuelve `http://127.0.0.1:<port>/api`.
- **Configuración** (R3): por variables de entorno (`PORT=0`, `HOST`, `NODE_ENV=production`, `CORS_ORIGINS`,
  `MONGODB_URI` descifrada y un `JWT_ACCESS_SECRET` aleatorio por arranque). `/api-docs` no se monta.
- **Conexión y errores** (R4): el backend escucha antes de conectar, reintenta cada 5 s y usa
  `bufferCommands: false`. Los errores de conexión se traducen a `503 DATABASE_UNAVAILABLE`, que nunca cuenta
  como intento fallido de inicio de sesión.
- **Cambio de base de datos** (R5): al guardar otra cadena se detiene el hijo y se lanza otro. Un proceso, una
  base de datos durante toda su vida.
- **Sesiones** (R6): al cambiar de base de datos se borra el refresh token del equipo y el nuevo hijo usa otro
  secreto JWT, así que ninguna sesión anterior sigue valiendo.
- **Empaquetado** (R12): `apps/desktop` declara `"@app/server": "*"` como dependencia interna de workspace y
  su `build` compila `apps/server`. La entrada se resuelve con
  `require.resolve('@app/server/dist/embedded.js')`.

## Alternativas consideradas

- **Express en el proceso principal**: bloquea la UI con cada hash de `bcryptjs` y mezcla responsabilidades.
- **`child_process.fork` de Node**: funciona, pero `utilityProcess` es la opción soportada por Electron y
  comparte el ciclo de vida de la app.
- **Empaquetar un `mongod` propio**: nadie lo pide; la base de datos la elige el usuario.
- **Reconectar Mongoose en caliente** (`disconnect()` + `connect()`): el estado global de Mongoose es difícil
  de dejar limpio entre dos bases de datos.
- **Revocar las sesiones en la base de datos anterior**: puede no estar accesible y afectaría a otros equipos.
- **Empaquetador (esbuild)**: requiere una dependencia nueva; queda como plan B si electron-builder no incluye
  bien el workspace (ver Consecuencias).

## Consecuencias

- El escritorio ya no tiene modo API: `ipc/server.ts`, `ipc/config.ts` y `userData/config.json` desaparecen
  (R13) y la US6 de 001 queda sustituida por 002.
- La cadena de conexión está en el entorno del proceso hijo, legible por la misma cuenta del sistema
  operativo que ya puede descifrarla con `safeStorage`: no amplía la exposición.
- **Riesgo**: electron-builder con workspaces de npm y `node_modules` elevado a la raíz. Se valida con
  `npm run package --workspace=apps/desktop` (tarea T066). Si falla, un nuevo ADR propondrá esbuild para
  generar un único archivo del backend.
