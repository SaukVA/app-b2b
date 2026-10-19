# ADR 0003: Roles y matriz de permisos en la base de datos

- **Estado**: Aceptada
- **Fecha**: 2026-10-19
- **Contexto de origen**: feature `003-user-management` (research.md, R11; aclaración del 2026-10-16)

## Contexto

En `001-user-login` los roles (`ROLES`) y la matriz de permisos por rol y módulo (`PERMISSIONS`) son
constantes de `@app/shared`. `can(role, module, level)` las consulta y la usan `requirePermission` en el
servidor y `homeRoute`, `RequireAuth` y `selectCan` en el cliente.

La gestión de usuarios (003) muestra esa matriz en Ajustes › Usuarios. Además, se quiere poder añadir roles
o cambiar permisos en el futuro sin tocar código. Por tanto:

- La matriz mostrada tiene que ser la que la aplicación aplica, con una sola definición (FR-021).
- Roles y permisos tienen que guardarse en la base de datos, con unos valores iniciales que se crean solos
  en una instalación nueva y que nunca se sobrescriben (FR-020).
- Un cambio hecho en la base de datos tiene que llegar a las sesiones abiertas en 15 minutos como máximo
  (FR-028), también con varios escritorios contra la misma base de datos.

## Decisión

- **Colección `roles`**: un documento por rol con `key`, `name`, `isAdmin`, `order` y `permissions`, un
  nivel (`edit`, `view` o `none`) por módulo. La matriz son las filas `permissions` de todos los roles; no
  hay colección aparte.
- **Claves de los roles iniciales**: son los valores que ya se guardan en `users.role` (`Administrador`,
  `Comercial`, `Almacén` y `Administración`). Los usuarios existentes, en las bases de datos de desarrollo y
  en los escritorios ya configurados, siguen siendo válidos **sin migración**. `name` es el nombre visible y
  puede cambiar sin tocar `key`.
- **Siembra idempotente**: `ensureDefaultRoles()` se ejecuta al arrancar, antes de
  `ensureBootstrapAccount()`, en `server.ts` y en el backend embebido.
  - Inserta los roles por defecto que falten con `upsert` + `$setOnInsert`, así que nunca sobrescribe
    valores guardados (FR-020).
  - Después fuerza `edit` en todos los módulos del rol `isAdmin` (FR-027).
  - Los valores por defecto viven en `apps/server/src/modules/roles/role.defaults.ts`.
- **Módulos fijos en código**: `APP_MODULES` en `@app/shared`. Un módulo sin valor en un rol cuenta como
  `none` (FR-026).
- **Permisos leídos en cada petición, sin caché**: `resolveAuthContext` carga el rol del usuario y deja
  `permissions` en `req.auth`. La colección es diminuta y se consulta por `key` indexada, así que un cambio en
  la base de datos se aplica en la siguiente petición.
- **`can(permissions, module, level)`**: sustituye a `can(role, module, level)`. La usan
  `requirePermission`, `homeRoute`, `RequireAuth` y `selectCan`. `AuthUser` añade `roleName` y
  `permissions`, que llegan con el login, `/auth/me` y `/auth/refresh`.
- `ROLES` y `PERMISSIONS` **se eliminan** de `@app/shared`. `Role` pasa a ser `string` (la clave del rol) y
  se añaden `PermissionSet`, `RoleSummary` y `ADMIN_ROLE_KEY`.
- En esta entrega roles y matriz son de **solo lectura** desde la aplicación (`GET /api/roles`).

## Alternativas consideradas

- **Colección `permissions` separada (rol × módulo)**: más documentos y consultas sin ganar nada mientras
  la matriz no se edite desde la aplicación.
- **Claves nuevas tipo *slug* con migración de `users.role`**: obligaría a migrar las bases de datos de los
  escritorios ya instalados.
- **Caché en memoria con TTL**: con varios escritorios contra la misma base de datos complica la coherencia
  y no hace falta con este volumen de roles.
- **Mantener `PERMISSIONS` en código como respaldo**: serían dos fuentes de verdad que pueden divergir, en
  contra de FR-021.

## Consecuencias

- Una única definición de permisos para el servidor, el cliente y la pantalla de la matriz.
- El acceso a cada módulo, también a la gestión de usuarios, depende del permiso del rol en la matriz
  (`ajustes: edit` para Ajustes › Usuarios) y no del nombre del rol (FR-001). Quien pueda editar la
  colección `roles` en la base de datos puede conceder ese acceso a otros roles.
- Las reglas del Administrador (primer usuario y último Administrador activo) se aplican a los usuarios
  cuyo rol tiene `isAdmin: true`.
- Hay que adaptar piezas de `001-user-login` que leían la matriz fija (`can()`, `AuthUser`,
  `requirePermission`, `resolveAuthContext`, `homeRoute`, `RequireAuth`, `selectCan`) y el arranque del
  servidor y del backend embebido.
- Cada petición autenticada hace una consulta más, por `key`, a `roles`.
- Editar la matriz o crear roles desde la aplicación queda para una spec futura: los datos ya están en la
  base de datos y solo faltarán la pantalla y los endpoints de escritura.
