# Research: Gestión de usuarios (003-user-management)

Fase 0 del plan. Cada decisión resuelve una incógnita del Technical Context de `plan.md` y parte de lo que
ya existe tras 001-user-login y 002-desktop-local-backend.

## R1. Cómo llegan los cambios a las sesiones abiertas (FR-014, FR-015, FR-019)

- **Decision**: se reutiliza la comprobación por petición de 001 (`requireAuth` → `resolveAuthContext`), que
  ya lee el usuario en cada petición y rechaza a quien no está `Activo`.
  - **Bloqueo**: además de cambiar el estado, se revocan (`revokedAt`) todas sus sesiones. Así, al
    desbloquearlo no "resucitan" sesiones antiguas.
  - **Restablecimiento de contraseña**: se revocan todas sus sesiones y se borra su `loginAttempts`
    (FR-019: reinicia el bloqueo temporal). Si el Administrador se restablece a sí mismo, su sesión actual
    también cae y el cliente le lleva al login.
  - **Cambio de rol**: no se revoca nada. El servidor aplica el rol nuevo en la siguiente petición (lo lee
    del usuario, no del JWT). El cliente lo recoge en la siguiente renovación de sesión (`/auth/refresh`
    devuelve el `AuthUser`), como mucho a los 15 min del access token. Si el Administrador cambia su propio
    rol, el cliente hace `loadMe` al momento.
- **Rationale**: cumple la aclaración del 2026-10-16 ("15 minutos como máximo") sin mecanismos nuevos. En
  la práctica el servidor corta el bloqueo y el restablecimiento en la siguiente petición.
- **Alternatives considered**: notificar a los clientes por WebSocket o SSE (infraestructura nueva sin
  necesidad); revocar también en el cambio de rol (obligaría a volver a iniciar sesión, en contra de US4-1).

## R2. Garantizar al menos un Administrador activo con concurrencia (FR-016, SC-004)

- **Decision**: actualización optimista con compensación, en `user.service.ts`:
  1. Se aplica el cambio (bloqueo o cambio de rol) con `findOneAndUpdate` y se guarda el valor anterior.
  2. Si el usuario afectado era un Administrador activo (rol con `isAdmin`, R11), se cuentan los
     Administradores activos reales.
  3. Si la cuenta da 0, se restaura el valor anterior y se lanza `USER_LAST_ADMIN` (409).
  Dos acciones simultáneas que dejarían la aplicación sin Administrador pueden fallar las dos; nunca tienen
  éxito las dos.
- **Rationale**: la MongoDB de desarrollo (`docker-compose.yml`) y las que configura el escritorio (002)
  pueden ser standalone, y en ellas no hay transacciones multi-documento. La compensación funciona en
  cualquier despliegue. La ventana intermedia dura milisegundos y no da acceso a nadie: solo puede hacer
  fallar una petición del Administrador afectado.
- **Alternatives considered**: transacciones (exigen replica set en todos los despliegues, también en el
  escritorio); un documento de bloqueo o *lease* global (más código y tiempos de espera que gestionar para
  decenas de usuarios); comprobar antes y actualizar después (deja pasar la carrera de dos bloqueos
  cruzados).

## R3. Unicidad del email sin distinguir mayúsculas (FR-007, FR-024, SC-006)

- **Decision**: el email se guarda en el campo `login` existente, que ya es `unique`, `lowercase` y `trim`.
  zod normaliza con `trim().toLowerCase()` y valida el formato con `email()`, que rechaza "admin". Un error
  de clave duplicada de MongoDB (E11000) se traduce a `USER_EMAIL_TAKEN` (409), también al editar.
- **Rationale**: el índice único resuelve la carrera de dos altas simultáneas con el mismo email sin
  comprobaciones previas.
- **Alternatives considered**: comprobar si existe antes de insertar (no evita la carrera); un índice con
  *collation* (innecesario, porque ya se guarda en minúsculas).

## R4. Primer Administrador y retirada de la cuenta inicial (US1, FR-003, FR-004)

- **Decision**: `POST /users` comprueba `countRealUsers() === 0`. Si no hay usuarios reales, el rol tiene
  que ser el rol con `isAdmin` (R11); si no, `USER_FIRST_MUST_BE_ADMIN` (409). Tras crearlo se llama a
  `retireBootstrapIfNeeded()` (001), que revoca las sesiones de `admin` y lo borra. La respuesta incluye
  `bootstrapRetired: true`. Con ese dato el cliente limpia la sesión local (`sessionCleared`) y lleva al
  login con el aviso "Entra con el usuario que acabas de crear".
- **Rationale**: la regla depende del estado de la base de datos, no de quién llama. Así no se puede
  saltar aunque se invente la petición, y se reutiliza la retirada de 001.
- **Alternatives considered**: un endpoint específico `/users/first-admin` (duplica la validación del
  alta).

## R5. Eliminar el estado "Invitado"

- **Decision**: `UserStatus` pasa a `'Activo' | 'Bloqueado'`. Se quitan la rama `AUTH_INVITATION_PENDING`
  de `assertCanSignIn`, su test y su mención en el bloque `@openapi` de `/auth/login`. La 001 queda
  anotada (FR-004 de 001 ya no aplica, según el Assumption de la spec 003).
- **Rationale**: la spec fija que solo hay dos estados. Dejar un valor que ningún flujo puede producir
  confunde y obliga a tratarlo en el listado. El cambio son unas pocas líneas en 5 archivos (principio V).
- **Alternatives considered**: mantenerlo como valor muerto (contradice la spec y el contrato).

## R6. Registro de acciones (FR-025, SC-008)

- **Decision**: colección nueva `userAuditEntries` (`modules/users/userAudit.model.ts`), de solo inserción.
  - **Cuándo**: el servicio escribe una entrada después de cada acción completada.
  - **Contenido**: autor (`actorId` y `actorLogin` copiados, porque la cuenta inicial desaparece), acción,
    usuario afectado (`targetId` y `targetLogin`), fecha y `changes` (`{ field, from, to }`). El cambio de
    contraseña no lleva valores en `changes`.
  - **Acceso**: no hay endpoint de lectura.
  - **Si falla la escritura**: la petición responde 500 (no se oculta) y queda en el log del servidor.
- **Rationale**: es suficiente para la trazabilidad pedida sin pantalla. Sin transacciones (R2), el orden
  "acción → registro" es el único que no registra acciones que no se han hecho.
- **Alternatives considered**: guardar el historial dentro del documento del usuario (crece sin límite y
  se mezcla con el DTO); registrar en el log de texto del servidor (no es consultable ni fiable).

## R7. Forma de la API

- **Decision**: un recurso `users` en `/api/users`, protegido en el router con `requireAuth` +
  `requirePermission('ajustes', 'edit')`, que hoy solo cumple el Administrador.

  | Método | Ruta | Uso |
  |---|---|---|
  | GET | `/users` | Listado (`UserSummary[]`, ordenado por nombre) |
  | POST | `/users` | Alta (incluido el primer Administrador) |
  | PATCH | `/users/:id` | Editar nombre, email y/o rol |
  | PATCH | `/users/:id/status` | Bloquear o desbloquear |
  | PUT | `/users/:id/password` | Restablecer contraseña |

  - La matriz de permisos y los roles se leen de `GET /roles` (módulo `roles`, R11), con la misma
    protección. Es la misma definición que aplica `requirePermission` (FR-021).
  - En la API el campo es `email`; en el modelo sigue siendo `login`, y el mapper lo traduce.
- **Rationale**: un endpoint por acción mantiene los controladores mínimos, deja reglas distintas en cada
  servicio y facilita el registro de acciones (R6).
- **Alternatives considered**: un único `PATCH /users/:id` con estado y contraseña (mezcla reglas y
  efectos sobre las sesiones en un mismo servicio).

## R8. Cliente: estado, rutas y componentes

- **Decision**:
  - **Estado**: `features/users/` con `usersSlice.ts` y `usersApi.ts`, usando axios + thunks (ADR 0001).
  - **Rutas**: `/ajustes` pasa de placeholder a `SettingsPage`, un layout con pestañas. Por ahora solo
    existe la pestaña Usuarios (`/ajustes/usuarios`); Apariencia y Base de datos llegan con 004 y 005.
    `/ajustes` redirige a la primera pestaña disponible.
  - **Componentes genéricos nuevos** en `components/` (principio VIII), cada uno con su test: `Select`,
    `Table` (con variante de tarjetas por debajo de 760 px), `StatusStamp`, `Dialog` (modal accesible con
    foco atrapado y confirmación) y `Tabs`.
  - **Componentes de dominio**: `UsersTable`, `UserForm` (alta y edición, con los roles de `GET /roles`),
    `ResetPasswordDialog` y `PermissionsMatrix` (pinta los roles guardados; columnas en el orden `order`).
  - **Roles en el cliente**: un slice `features/roles/` (`rolesSlice.ts`, `rolesApi.ts`) carga la lista una
    vez por visita a la pestaña.
- **Rationale**: sigue los patrones de 001 y 002 (slice por dominio, sin llamadas a la API desde
  componentes) y deja el layout de Ajustes listo para 004 y 005.
- **Alternatives considered**: RTK Query (descartado en ADR 0001); un `<dialog>` nativo sin envoltorio (se
  repetiría el marcado en cada diálogo).

## R9. Diseño «Albarán»

- **Decision**: el tablero de Ajustes › Usuarios muestra "Invitar por email" y el estado Invitado. Antes
  de implementar la UI hay que actualizar el lienzo publicado:
  - formulario de alta (nombre, email, rol y contraseña);
  - diálogos de edición, confirmación y restablecimiento;
  - sin Invitado.
  En el mismo cambio se refrescan `docs/design/canvas/Ajustes.dc.html` y `docs/design/README.md` (CLAUDE.md
  › Diseño visual).
- **Rationale**: el lienzo es la fuente de verdad visual, y la constitución exige actualizar su copia en el
  mismo cambio.
- **Alternatives considered**: implementar sin actualizar el diseño (deja la fuente de verdad
  desincronizada).
- **Estado**: hecho el 2026-10-16. Se publicó en el lienzo y en `docs/design/` junto con la pestaña Base de
  datos de 005.

## R10. Dependencias

- **Decision**: ninguna dependencia nueva. Todo se cubre con Express, Mongoose, zod, bcryptjs y lo que ya
  tiene el cliente.

## R11. Roles y matriz de permisos en la base de datos (aclaración 2026-10-16, FR-020 y FR-026 a FR-028)

- **Decision**:
  - **Colección `roles`**: un documento por rol con `key`, `name`, `isAdmin`, `order` y `permissions` (un
    nivel por módulo). La matriz son las filas `permissions` de todos los roles; no hay colección aparte.
  - **Claves de los roles iniciales**: son los valores que ya se guardan en `users.role` (`Administrador`,
    `Comercial`, `Almacén`, `Administración`). Así los usuarios existentes (bases de datos de desarrollo y
    escritorios ya configurados) siguen siendo válidos sin migración. `name` es lo que se muestra y podrá
    cambiar sin tocar `key`.
  - **Siembra**: `ensureDefaultRoles()` se ejecuta al arrancar, junto a `ensureBootstrapAccount()` (en
    `server.ts` y en el backend embebido).
    - Inserta los roles por defecto que falten con `$setOnInsert`, así que nunca sobrescribe valores
      guardados (FR-020).
    - Fuerza `edit` en todos los módulos del rol `isAdmin` (FR-027).
    - Los valores por defecto viven en `modules/roles/role.defaults.ts` y son los de FR-020.
  - **Módulos**: siguen en código (`APP_MODULES` en `@app/shared`). Un módulo sin valor en un rol cuenta
    como `none` (FR-026).
  - **Aplicación de permisos**:
    - `resolveAuthContext` (001) carga, además del usuario, su rol en cada petición y deja
      `permissions` en `req.auth`.
    - `requirePermission` pasa a usar `can(req.auth.permissions, module, level)`.
    - Sin caché: la colección es diminuta, se consulta por `key` indexada y así un cambio hecho en la base de
      datos se aplica en la siguiente petición, también entre varios escritorios (FR-028).
  - **Cliente**:
    - `AuthUser` añade `roleName` y `permissions`, que llegan con el login, `/auth/me` y `/auth/refresh`.
      Por eso la interfaz recoge los cambios en 15 minutos como máximo.
    - `can()` de `@app/shared` pasa de `(role, module, level)` a `(permissions, module, level)`, y la usan
      `homeRoute`, `RequireAuth` y `selectCan`.
  - **Tipos**: `Role` pasa a ser `string` (la clave del rol). Se eliminan de `@app/shared` `ROLES` y
    `PERMISSIONS`. Se añaden `APP_MODULES`, `PermissionSet`, `RoleSummary` y `ADMIN_ROLE_KEY`, que es la
    clave del rol `isAdmin`, usada en los tests y en la siembra.
  - **Validación del rol**: `users.role` deja de ser un enum en Mongoose. El servicio comprueba que la
    clave existe en `roles` y, si no, responde `USER_ROLE_NOT_FOUND` (400).
  - **Reglas del Administrador** (primer usuario, último Administrador activo, R2 y R4): se aplican a los
    usuarios cuyo rol tiene `isAdmin: true`.
  - **Registro**: ADR 0003 "Roles y matriz de permisos en base de datos". Cambia dónde vive una definición
    central que usan todas las features.
- **Rationale**: es lo que ha pedido el usuario, con el menor cambio que lo permite. Guardar los niveles
  junto al rol evita incoherencias entre colecciones, y las claves actuales evitan una migración. Los
  módulos se quedan en código porque cada uno necesita pantallas y endpoints propios.
- **Alternatives considered**:
  - Colección `permissions` separada (rol × módulo): más documentos y consultas sin ganar nada mientras
    no se edite.
  - Claves nuevas tipo *slug* con migración de `users.role`: obliga a migrar las bases de datos de los
    escritorios ya instalados.
  - Caché en memoria con TTL: con varios escritorios contra la misma base de datos complica la coherencia
    y no hace falta con este volumen.
  - Mantener `PERMISSIONS` en código como respaldo: serían dos fuentes de verdad, en contra de FR-021.
