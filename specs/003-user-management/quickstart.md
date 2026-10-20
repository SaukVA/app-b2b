# Quickstart: validar la gestión de usuarios (003-user-management)

Guía de validación de extremo a extremo. Los endpoints y los datos están en
[contracts/users-api.openapi.yaml](contracts/users-api.openapi.yaml) y [data-model.md](data-model.md).

## Requisitos previos

Los de [001-user-login/quickstart.md](../001-user-login/quickstart.md): Node.js ≥ 22.12, Docker y `.env`
creado a partir de `.env.example`.

```powershell
npm install
docker compose up -d
```

## 1. Tests automáticos

```powershell
npm run lint
npm test --workspaces
```

Resultado esperado: todo en verde, incluidos `user.service.test.ts` y `user.routes.test.ts` (servidor), los
tests de los componentes genéricos nuevos (`Select`, `Table`, `StatusStamp`, `Dialog`, `Tabs`) y los de
`features/users`.

## 2. Primer Administrador (US1)

1. Vacía la base de datos (`docker compose down -v; docker compose up -d`) y arranca server y client.
2. Entra con `admin` / `admin` y abre **Ajustes › Usuarios**.
   **Esperado**: formulario de alta con el rol fijado en Administrador y el aviso de primer usuario.
3. Con Swagger (`/api-docs`) y el token de `admin`, haz `POST /users` con `role: "Comercial"`.
   **Esperado**: 409 `USER_FIRST_MUST_BE_ADMIN`.
4. Crea el Administrador desde la interfaz.
   **Esperado**: vuelves al login con el aviso de entrar con el nuevo usuario. `admin` / `admin` responde
   "Email o contraseña incorrectos" y el nuevo usuario entra.

## 3. Alta, listado y edición (US2, US3)

1. Da de alta a `ana@empresa.es` como Comercial con una contraseña de 8 caracteres.
   **Esperado**: aparece Activa, con último acceso "Nunca", y entra a la primera sin cambiar la contraseña.
2. Intenta dar de alta a ` Ana@Empresa.ES `.
   **Esperado**: "Ya existe un usuario con ese email".
3. Corrige el email de Ana a `ana.pons@empresa.es`.
   **Esperado**: entra con el nuevo email y el anterior ya no sirve.
4. Entra como Ana y abre `/ajustes/usuarios`.
   **Esperado**: no ve la pestaña, se le redirige, y `GET /api/users` con su token responde 403
   `AUTH_FORBIDDEN`.
5. Reduce la ventana a menos de 760 px.
   **Esperado**: el listado se muestra como tarjetas, sin scroll horizontal.

## 4. Rol, bloqueo y último Administrador (US4)

1. Con Ana con la sesión abierta en otro navegador, cámbiale el rol a Almacén.
   **Esperado**: en 15 minutos como máximo (o al recargar) ve los módulos de Almacén sin volver a entrar.
2. Bloquea a Ana.
   **Esperado**: su siguiente acción la lleva al login, y al intentar entrar ve "Tu cuenta está bloqueada".
3. Desbloquéala.
   **Esperado**: entra con su contraseña de siempre.
4. Siendo el único Administrador activo, cámbiate el rol a Comercial.
   **Esperado**: 409 `USER_LAST_ADMIN`. En tu propia fila no aparece "Bloquear", y si se fuerza por la API
   responde 409 `USER_SELF_BLOCK`.
5. Crea un segundo Administrador y, con dos sesiones a la vez, haz que cada uno bloquee al otro al mismo
   tiempo (por ejemplo, dos peticiones simultáneas desde Swagger o un script).
   **Esperado**: como mucho una de las dos acciones tiene éxito; siempre queda un Administrador activo.

## 5. Restablecer contraseña (US5)

1. Restablece la contraseña de Ana mientras tiene la sesión abierta.
   **Esperado**: su sesión cae, la contraseña anterior no sirve y la nueva sí.
2. Provoca 5 fallos de login de Ana y restablécele la contraseña.
   **Esperado**: entra al momento con la nueva.

## 6. Roles y matriz de permisos en base de datos (US6)

1. Con la base de datos recién creada, revisa la colección `roles`.
   **Esperado**: 4 documentos con los valores de FR-020 ([data-model.md](data-model.md)).
2. Abre "Permisos por rol".
   **Esperado**: coincide celda a celda con la colección, incluye la leyenda y no tiene controles editables.
3. Cambia en MongoDB `permissions.clientes` del rol Almacén a `view`, reinicia el servidor y comprueba que la
   colección conserva el cambio (la siembra no lo sobrescribe).
   **Esperado**: la matriz muestra V, y un usuario de Almacén ve Clientes en 15 minutos como máximo (o al
   recargar).
4. Inserta en `roles` un rol nuevo (por ejemplo `{ key: "Repartidor", name: "Repartidor", isAdmin: false,
   order: 5, permissions: { ventas: "view" } }`).
   **Esperado**: aparece como columna en la matriz (con "—" en los módulos sin valor) y en el selector de
   rol, y se puede dar de alta un usuario con él.
5. Pon `ajustes: "none"` al rol Administrador y reinicia.
   **Esperado**: la siembra lo devuelve a `edit` (FR-027).
6. Haz `POST /users` con `role: "Inexistente"`.
   **Esperado**: 400 `USER_ROLE_NOT_FOUND`.

## 7. Registro de acciones (FR-025)

Revisa la colección `userAuditEntries` en MongoDB.
**Esperado**: hay una entrada por cada acción de los pasos anteriores, con autor, acción, afectado, fecha y
cambios, y ninguna contiene contraseñas.
