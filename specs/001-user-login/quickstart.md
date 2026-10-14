# Quickstart: validar el inicio de sesión (001-user-login)

Guía de validación de extremo a extremo. Los detalles de endpoints y datos están en
[contracts/auth-api.openapi.yaml](contracts/auth-api.openapi.yaml), [contracts/desktop-bridge.md](contracts/desktop-bridge.md)
y [data-model.md](data-model.md).

## Requisitos previos

- Node.js ≥ 22.12 y npm 10.
- Docker (MongoDB local).
- `.env` creado a partir de `.env.example` con `MONGODB_URI`, `JWT_ACCESS_SECRET` y `CORS_ORIGINS`.

```powershell
npm install
docker compose up -d
```

## 1. Tests automáticos

```powershell
npm run lint
npm test --workspaces
```

Resultado esperado: todo en verde. Los tests de integración de `apps/server` usan `mongodb-memory-server` y
no necesitan Docker.

## 2. Cuenta inicial (instalación vacía)

1. Arranca el backend con la base de datos vacía: `npm run dev --workspace=apps/server`.
2. Abre `http://localhost:<PUERTO_SERVER>/api-docs` y comprueba que aparecen `/auth/*` y `/health`.
3. Arranca el cliente con `npm run dev --workspace=apps/client` y entra con `admin` / `admin`.
   **Esperado**: acceso con rol Administrador y llegada a Productos (pantalla de inicio provisional).
4. Inserta un usuario real `Activo` en la colección `users` (mientras no exista el módulo de usuarios) y
   recarga.
   **Esperado**: la sesión de `admin` caduca y `admin` / `admin` responde "Email o contraseña
   incorrectos" (FR-022, SC-007).

## 3. Escenarios de la web

| # | Acción | Resultado esperado | Requisitos |
|---|---|---|---|
| 1 | Login correcto sin "Mantener la sesión" | Llega a su pantalla de inicio con los módulos de su rol | FR-001, FR-005, FR-006 |
| 2 | Contraseña errónea (con un email existente y con uno inexistente) | Mismo mensaje y mismo contador de intentos restantes | FR-003 |
| 3 | 5 fallos seguidos y después la contraseña correcta | Rechazado con la hora de reintento; tras 15 min, entra | FR-015, FR-016 |
| 4 | Abrir `/clientes` sin sesión | Redirige al login y, tras entrar, vuelve a `/clientes` | FR-006, FR-007 |
| 5 | Cerrar sesión y pulsar "atrás" | No muestra datos y pide identificarse | FR-013 |
| 6 | Login sin "Mantener la sesión", cerrar y reabrir el navegador | Pide identificarse | FR-011 |
| 7 | Login con "Mantener la sesión", cerrar y reabrir el navegador | Entra sin identificarse | FR-012 |
| 8 | Bloquear el usuario en la BD con su sesión abierta | Su siguiente acción le devuelve al login | FR-014 |
| 9 | Pulsar "¿La has olvidado?" | Indica que contacte con un administrador; no se envía ningún correo | FR-026 |
| 10 | Revisar la pantalla de login en web | No aparece el indicador de servidor ni "Cambiar servidor" | FR-019, SC-004 |
| 11 | Login con ancho de 390 px | Panel oscuro reducido a franja; objetivos táctiles ≥ 44 px | FR-025 |

Comprobación rápida de la API (debe responder `401` con `success: false`):

```powershell
curl.exe -i http://localhost:<PUERTO_SERVER>/api/auth/me
```

## 4. Escenarios del escritorio

```powershell
npm run dev --workspace=apps/desktop
```

| # | Acción | Resultado esperado | Requisitos |
|---|---|---|---|
| 1 | Abrir el login con el servidor arrancado | Dirección del servidor + "Conectado" + "Cambiar servidor" | FR-018 |
| 2 | Parar el servidor y reabrir el login | Indicador "Sin conexión" en texto; "Entrar" da un error de conexión que no cuenta como intento | FR-017, FR-018 |
| 3 | Pulsar "Cambiar servidor" sin sesión | Navega a `/ajustes/servidor` | FR-018 |
| 4 | Login con "Mantener la sesión", cerrar y reabrir la aplicación | Entra sin identificarse | FR-012 |
| 5 | Cerrar sesión y reabrir la aplicación | Pide identificarse | FR-013 |
