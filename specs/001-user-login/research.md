# Research: Inicio de sesión (001-user-login)

Fase 0 del plan. Cada decisión resuelve una incógnita del Technical Context de `plan.md`.

## R1. Estrategia de tokens y sesiones

- **Decision**: access token JWT (`jsonwebtoken`) de 15 min con `sub` (userId), `sid` (sessionId) y
  `role`. Refresh token opaco (32 bytes aleatorios, `crypto.randomBytes`) con rotación en cada uso; en la
  colección `sessions` solo se guarda su hash SHA-256. `requireAuth` verifica el JWT **y** consulta la
  sesión y el estado del usuario en cada petición.
- **Rationale**: la consulta por petición cumple FR-013 (un logout invalida al instante) y FR-014 (un
  bloqueo corta las sesiones) sin listas negras de JWT. El volumen es pequeño (decenas de usuarios), así que
  el coste es despreciable. La rotación con detección de reutilización limita el robo de refresh tokens.
- **Alternatives considered**: JWT puro sin estado (no permite invalidar al hacer logout ni al bloquear);
  sesiones de servidor con `express-session` (dependencia nueva, y CLAUDE.md fija JWT access/refresh).

## R2. Transporte del refresh token: web frente a escritorio

- **Decision**:
  - **Web**: el refresh token va en una cookie `httpOnly`, `Secure` (en producción),
    `SameSite=Strict` y `Path=/api/auth`. Sin "Mantener la sesión" es una cookie de sesión (sin
    `Max-Age`); con ella, `Max-Age` de 30 días.
  - **Escritorio**: el login se envía con `client: "desktop"` y el refresh token se devuelve en el cuerpo
    de la respuesta. El proceso principal de Electron lo guarda cifrado con `safeStorage` solo si es
    persistente; si no, solo lo guarda en memoria.
  - El access token se guarda siempre solo en memoria en el cliente.
- **Rationale**: el escritorio carga el cliente desde un origen propio (`app://`) contra un servidor
  remoto, así que las cookies `SameSite=Strict` entre sitios no funcionan. Guardarlo en memoria o en
  `safeStorage` reproduce el comportamiento de la cookie de sesión o persistente. El mecanismo (JWT +
  refresh rotado) es el mismo en ambos casos, como exige FR-001.
- **Alternatives considered**: `localStorage` en web (expuesto a XSS); cookie también en escritorio
  (requiere `SameSite=None` y `Secure` en red local sin TLS, lo que es frágil).

## R3. Inactividad y caducidad

- **Decision**: la sesión guarda `lastActivityAt`, que `requireAuth` actualiza como mucho una vez por
  minuto.
  - Una sesión **no persistente** caduca si pasan más de 30 min desde `lastActivityAt`.
  - Una sesión **persistente** caduca a los 30 días de `createdAt` (caducidad absoluta) y no tiene límite
    de inactividad.
  - Al cerrar el navegador o la aplicación, una sesión no persistente se pierde porque el refresh token no
    se conserva (ver R2).
- **Rationale**: cumple FR-010, FR-011 y FR-012 con un solo campo y sin temporizadores en el cliente.
- **Alternatives considered**: un temporizador de inactividad en el cliente (se puede saltar y no protege
  la API).

## R4. Intentos fallidos y bloqueo temporal

- **Decision**: colección `loginAttempts` indexada por el identificador normalizado (email en minúsculas
  sin espacios, o `admin`), con `failedCount`, `lockedUntil` y un índice TTL de 24 h.
  - Al llegar a 5 fallos consecutivos se fija `lockedUntil = ahora + 15 min`.
  - Un acceso correcto o el fin del bloqueo reinician el contador.
  - Si el usuario no existe se compara la contraseña igualmente contra un hash ficticio, para que el
    tiempo de respuesta no revele si el email existe.
- **Rationale**: indexar por identificador y no por usuario permite mostrar "te quedan N intentos" también
  para emails inexistentes sin revelar nada (FR-003 y FR-015). El TTL evita que la colección crezca sin
  límite.
- **Alternatives considered**: guardar los campos en `User` (filtraría la existencia del email);
  `express-rate-limit` por IP (dependencia nueva, y no resuelve el bloqueo por cuenta).

## R5. Orden de las comprobaciones en el login

- **Decision**: 1) validar el payload con zod; 2) si el identificador está bloqueado temporalmente, dar
  `AUTH_ACCOUNT_LOCKED`; 3) comprobar la contraseña con `bcryptjs`; si falla, sumar un intento y dar
  `AUTH_INVALID_CREDENTIALS`; 4) solo con la contraseña correcta, comprobar el estado: `Bloqueado` da
  `AUTH_ACCOUNT_BLOCKED` e `Invitado` da `AUTH_INVITATION_PENDING`; 5) crear la sesión, actualizar
  `lastLoginAt` y reiniciar los intentos.
- **Rationale**: los mensajes de cuenta bloqueada o invitación pendiente solo aparecen ante credenciales
  correctas, así que no revelan el estado de una cuenta a quien no conoce la contraseña.

## R6. Cuenta inicial "admin"

- **Decision**: al arrancar el servidor, `ensureBootstrapAccount()` comprueba si hay usuarios reales
  (`isBootstrap: false`):
  - Si no hay ninguno y no existe la cuenta inicial, crea `{ login: "admin", isBootstrap: true, role:
    "Administrador", status: "Activo" }` con el hash de "admin".
  - Si hay al menos uno, borra la cuenta inicial y revoca sus sesiones.

  La misma comprobación (`retireBootstrapIfNeeded()`) se ejecuta en el login y en `requireAuth` cuando el
  usuario autenticado es la cuenta inicial. Así se cumple FR-022 aunque el primer usuario lo cree el
  futuro módulo de usuarios o se inserte directamente en los datos.
- **Rationale**: no exige preparación manual (SC-007). Además, este módulo no depende de cómo cree
  usuarios el módulo de usuarios: le basta con contar usuarios reales.
- **Alternatives considered**: un script de seed manual (incumple "sin intervención manual"); hacer el
  borrado solo desde el módulo de usuarios (no existe todavía y deja "admin" vivo si se crea por otra vía).

## R7. Roles y permisos

- **Decision**: `packages/shared/src/constants/roles.ts` define `ROLES` y la matriz `PERMISSIONS` (módulo
  → rol → `edit` | `view` | `none`), copiada de Ajustes › Usuarios. El middleware
  `requirePermission(module, level)` la aplica en el servidor y el cliente la usa para ocultar módulos.
- **Rationale**: una única fuente para el servidor y los clientes (principio VI). La matriz es fija en
  esta entrega; editarla corresponde al módulo de usuarios.

## R8. Cliente HTTP y estado en el frontend

- **Decision**: funciones axios en `features/auth/authApi.ts` con una instancia compartida
  (`utils/httpClient.ts`). Esa instancia tiene un interceptor que, ante un 401
  `AUTH_SESSION_EXPIRED`/`AUTH_UNAUTHENTICATED`, intenta un único refresh, encola las peticiones
  concurrentes y reintenta la original. El estado vive en `authSlice` con `createAsyncThunk`. Se registra
  como **ADR 0001** porque CLAUDE.md dejaba esta elección abierta para la primera funcionalidad.
- **Rationale**: axios ya está en el stack. El refresh con cola es más sencillo de controlar en un
  interceptor que en un `baseQuery` de RTK Query. Un solo patrón para todas las funcionalidades.
- **Alternatives considered**: RTK Query con `baseQueryWithReauth` (añade caché y convenciones que todavía
  no aportan nada; se puede reconsiderar en módulos de listados con otro ADR).

## R9. Estilos y componentes de UI

- **Decision**: CSS Modules (soporte nativo de Vite, sin dependencias) y custom properties en
  `apps/client/src/styles/tokens.css`, con los tokens de `docs/design/README.md` (tema claro y oscuro con
  `[data-theme]`). Los componentes genéricos nuevos van en `apps/client/src/components/`: `Button`,
  `TextField`, `PasswordField`, `Checkbox`, `Alert`, `BrandMark`, `ServerStatus`.
- **Rationale**: cumple el principio VIII (componentes reutilizables con los tokens de «Albarán») sin
  añadir librerías de terceros.
- **Alternatives considered**: Tailwind, styled-components o una librería de UI (dependencias nuevas y
  estilo ajeno a «Albarán»).

## R10. Detección de escritorio y servidor

- **Decision**: `apps/desktop/src/preload.ts` expone `window.desktop` con `contextBridge`:
  `isDesktop`, `getServerUrl()`, `checkServer()`, `getRefreshToken()`, `setRefreshToken()` y
  `clearRefreshToken()`. El cliente muestra `ServerStatus` y "Cambiar servidor" solo si `window.desktop`
  existe (FR-018 y FR-019). La URL del servidor se guarda en `userData/config.json` con `fs`, sin
  dependencias. `checkServer()` llama a `GET /api/health`.
- **Rationale**: la decisión se toma en tiempo de ejecución con una sola comprobación y la misma build del
  cliente sirve para web y escritorio.

## R11. Dependencias nuevas (aprobadas el 2026-10-14)

| Paquete | Workspace | Motivo |
|---|---|---|
| `cookie-parser` 1.4.x | `apps/server` | Leer la cookie del refresh token en web (R2). Parsear `Cookie` a mano es propenso a errores. |
| `cors` 2.8.x | `apps/server` | El escritorio llama a la API desde el origen `app://` (R2, R10). Sin CORS, el navegador de Electron bloquea las peticiones. |

Ambas MUST justificarse y añadirse a la tabla de Tecnologías de CLAUDE.md antes de instalarse
(constitución, Restricciones adicionales).
