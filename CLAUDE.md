# CLAUDE.md

> Redactado: 2026-10

Este archivo guía a Claude Code en este repositorio. El proyecto está en fase inicial (greenfield): estas instrucciones fijan las decisiones de arquitectura tomadas antes de escribir la primera línea de código.

## Contexto

Aplicación de **venta a mayoristas** (B2B). Gestiona el ciclo completo de venta de un mayorista a sus clientes:

- **Productos**: catálogo, stock, precios por tipo de cliente/tarifa.
- **Clientes**: fichas de cliente mayorista, condiciones comerciales, historial.
- **Proveedores**: altas de proveedor, productos asociados, compras.
- **Ventas**: pedidos, líneas de venta, estados (pendiente/servido/facturado).
- **Cobros**: registro de cobros asociados a ventas, métodos de pago, saldo pendiente por cliente.

Se distribuye en dos formas:
1. **Web** (React + Express + MongoDB) para uso remoto/multiusuario.
2. **Escritorio** (Electron, empaquetando el mismo frontend React) para el puesto del almacén/tienda. Arranca su propio backend local (el mismo `apps/server`, embebido) y se conecta directamente a MongoDB, local o remoto con TLS, según la base de datos configurada en el propio escritorio (spec 002-desktop-local-backend, ADR 0002).

La API REST la consumen ambos frontends (web y Electron) y se documenta con **Swagger** para que sirva de contrato entre backend y frontend.

## Tecnologías

Monorepo gestionado con **npm workspaces** (`apps/*`, `packages/*`). Todo el código en **TypeScript**.

### Transversal / raíz del repo

| Herramienta | Versión | Uso |
|---|---|---|
| Node.js | 22.x LTS (≥22.12.0) | Runtime, fijado en `engines` del `package.json` raíz |
| npm | 10.x (bundlado con Node 22) | Gestor de paquetes y workspaces |
| TypeScript | 5.7.x | Tipado en los 3 apps y en `packages/shared` |
| ESLint | 9.x (flat config) + `@eslint/js` 9.x + `typescript-eslint` 8.x | Linting |
| Prettier | 3.4.x | Formateo |
| Jest | 30.x + `ts-jest` 29.4.x | Tests unitarios e integración en todos los workspaces (`ts-jest` ≥29.4 es la primera versión compatible con Jest 30) |
| concurrently | 9.x | Levantar client+server+desktop en paralelo en dev |
| @playwright/test | 1.64.x | Tests E2E en navegador (`e2e/`, `playwright.config.ts`), ADR 0004. Misma versión que la `playwright-core` de `@playwright/cli`, instalada globalmente |

### `apps/server` (Express + MongoDB)

| Librería | Versión | Uso |
|---|---|---|
| Express | 5.1.x | Framework HTTP |
| Mongoose | 8.24.x | ODM sobre MongoDB |
| MongoDB Server | 8.0.x (Community) | Base de datos. En Docker de dev, temporalmente `mongo:7.0` (volumen `mongo-data-7`): la 8.0 no arranca con kernels Linux ≥ 6.19 (SERVER-121912) |
| zod | 3.24.x | Validación de payloads de entrada |
| jsonwebtoken | 9.0.x | Autenticación con access/refresh token |
| bcryptjs | 2.4.x | Hash de contraseñas (JS puro, sin binarios nativos que compliquen el empaquetado de Electron) |
| swagger-jsdoc | 6.2.x | Genera el spec OpenAPI desde comentarios JSDoc en las rutas |
| swagger-ui-express | 5.0.x | Sirve la UI de Swagger en `/api-docs` |
| dotenv | 16.x | Carga de variables de entorno |
| cookie-parser | 1.4.x | Lee la cookie `httpOnly` del refresh token en la web (ADR/plan 001-user-login, R2) |
| cors | 2.8.x | Permite las peticiones del cliente de escritorio (origen `app://`) y del cliente en dev |
| tsx | 4.x | Ejecuta el servidor TypeScript en modo watch (`npm run dev`) |
| supertest | 7.0.x | Tests de integración sobre los endpoints Express |
| mongodb-memory-server | 10.x | MongoDB en memoria para tests, sin depender de una instancia real |

### `apps/client` (React)

| Librería | Versión | Uso |
|---|---|---|
| React / React DOM | 19.0.x | UI |
| Vite | 6.0.x | Dev server y build |
| React Router | 7.18.x | Enrutado |
| Redux Toolkit | 2.5.x | Estado global (productos, clientes, proveedores, ventas, cobros) |
| React Redux | 9.2.x | Bindings de Redux con React |
| axios | 1.20.x | Cliente HTTP contra `apps/server` |
| @vitejs/plugin-react | 4.x | Plugin de React para Vite (JSX, Fast Refresh) |
| @testing-library/react + @testing-library/dom | 16.x / 10.x | Tests de componentes centrados en accesibilidad |
| @testing-library/user-event | 14.x | Simular la interacción del usuario en los tests de componentes |
| jest-environment-jsdom | 30.x | Entorno DOM para Jest en `apps/client` |

### `apps/desktop` (Electron)

| Librería | Versión | Uso |
|---|---|---|
| Electron | 34.x | Shell de escritorio, empaqueta `apps/client` y `apps/server` (backend local en un `utilityProcess`) |
| electron-builder | 25.x | Generación de instaladores (Windows/Mac/Linux) |

> **Nota de versiones**: estas son las versiones de referencia en el momento de crear el proyecto. El `package-lock.json` de cada workspace es la fuente de verdad una vez instaladas las dependencias; actualiza esta tabla si se hace un bump deliberado de versión mayor.

## Estructura de Carpetas

```
app-wholesale-sales/
├── apps/
│   ├── client/                 # Frontend React (web + base para Electron)
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/     # Componentes de UI reutilizables
│   │   │   ├── features/       # Un subdirectorio por dominio: products, customers, suppliers, sales, payments
│   │   │   │   └── products/
│   │   │   │       ├── productsSlice.ts
│   │   │   │       ├── productsApi.ts
│   │   │   │       └── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   ├── routes/
│   │   │   ├── store/           # Configuración de la store de Redux
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── server/                  # Backend Express + MongoDB
│   │   ├── src/
│   │   │   ├── config/          # Conexión a Mongo, variables de entorno
│   │   │   ├── modules/         # Un subdirectorio por dominio (organización por feature, no por capa)
│   │   │   │   └── products/
│   │   │   │       ├── product.model.ts
│   │   │   │       ├── product.routes.ts
│   │   │   │       ├── product.controller.ts
│   │   │   │       ├── product.service.ts
│   │   │   │       ├── product.validation.ts     # esquemas zod
│   │   │   │       └── product.test.ts
│   │   │   ├── middlewares/     # auth, manejo de errores, validación
│   │   │   ├── docs/            # configuración de swagger-jsdoc
│   │   │   ├── utils/
│   │   │   ├── app.ts           # construcción de la app Express (sin levantar el server)
│   │   │   └── server.ts        # arranque (listen)
│   │   └── package.json
│   │
│   └── desktop/                 # Shell de Electron
│       ├── src/
│       │   ├── main.ts          # Proceso principal
│       │   ├── preload.ts       # Puente contextBridge
│       │   └── ipc/             # Handlers de ipcMain por dominio
│       └── package.json
│
├── packages/
│   └── shared/                  # Tipos y constantes compartidos entre client/server/desktop
│       └── src/
│           ├── types/           # Product, Customer, Supplier, Sale, Payment...
│           └── constants/
│
├── e2e/                         # Tests E2E con Playwright (*.spec.ts), ADR 0004
│   └── support/                 # startServer.ts: API contra MongoDB en memoria
│
├── docs/
│   ├── adr/                     # Architecture Decision Records
│   └── design/                  # Diseño visual «Albarán»: README (tokens, reglas) + canvas/ (tableros .dc.html)
│
├── .env.example
├── docker-compose.yml           # MongoDB local para desarrollo
├── playwright.config.ts         # Configuración de los tests E2E
├── package.json                 # raíz, define los workspaces
└── CLAUDE.md
```

## Diseño visual

El diseño de la interfaz («Albarán») está documentado en `docs/design/`:

- `docs/design/README.md`: tokens de color (claro/oscuro), tipografía, espaciado, estados, reglas responsive y lista de pantallas. Es la referencia para estilos en `apps/client`.
- `docs/design/canvas/`: copia de los tableros (`*.dc.html`, índice `canvas.json`). Son especificación visual, no código ejecutable: no se abren sueltos en el navegador.
- Fuente de verdad: el lienzo publicado https://claude.ai/artifact/X2XQnZS79ic8pV4rvk1crS. Si se modifica, MUST refrescar la copia de `docs/design/canvas/` y actualizar el README en el mismo cambio.
- Pantallas diseñadas: Productos, Clientes, Proveedores, Ajustes y Login (escritorio y móvil). Panel, Ventas, Nueva venta y Cobros están pendientes de diseño.

## Convenciones

- MUST organizar por dominio (feature-first), no por tipo técnico: todo lo de "productos" vive junto (modelo, rutas, controlador, servicio, tests), tanto en `apps/server/src/modules/` como en `apps/client/src/features/`.
- MUST nombrar archivos así: `kebab-case` para carpetas, `camelCase.ts` para módulos TS genéricos, `PascalCase.tsx` para componentes React, sufijo `.test.ts`/`.test.tsx` para tests ubicados junto al archivo que prueban.
- MUST mantener los tipos compartidos (`Product`, `Customer`, `Sale`, `Payment`, etc.) en `packages/shared`, importados desde `apps/server` y `apps/client`/`apps/desktop`. NEVER dupliques un tipo de dominio en dos apps.
- MUST validar `req.body`/`req.params`/`req.query` con un esquema `zod` en `*.validation.ts` antes de llegar al controlador, en toda ruta de `apps/server`. NEVER confíes en el tipado de TypeScript en tiempo de ejecución.
- MUST responder con un envelope consistente en todos los endpoints. Éxito:
  ```json
  { "success": true, "data": {} }
  ```
  Error:
  ```json
  { "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "..." } }
  ```
- MUST lanzar una clase `AppError` (código + status + mensaje) desde servicios/controladores y dejar que el middleware de error en `apps/server/src/middlewares/errorHandler.ts` la traduzca al envelope anterior. NEVER expongas el `stack` en producción.
- MUST respetar las capas del backend: `routes` → `controller` (HTTP in/out) → `service` (lógica de negocio) → `model` (Mongoose). NEVER accedas a Mongoose directamente desde un controlador.
- MUST mantener un slice de Redux Toolkit por dominio en `features/<dominio>/`, con las llamadas a la API en `*Api.ts` (RTK Query o funciones axios, a decidir al implementar la primera feature). NEVER llames a la API directamente desde un componente.
- MUST documentar cada ruta de `apps/server` con su bloque JSDoc `@openapi` junto a la definición de la ruta, y mantener el spec de `/api-docs` sincronizado en el mismo commit que el cambio de endpoint.
- MUST cubrir con Jest: tests unitarios junto al código (`*.test.ts`) sin tocar base de datos real, y tests de integración de API con `supertest` + `mongodb-memory-server` sin depender de un Mongo externo.
- MUST incluir tests de servicio y de rutas antes de considerar completo un módulo de dominio.
- SHOULD seguir el formato Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`...), en español o inglés pero consistente dentro de un mismo PR.
- MUST mantener controladores y servicios en ≤40 líneas efectivas y con una única responsabilidad; MUST extraer a funciones auxiliares en lugar de anidar lógica.
- MUST mostrar los importes con `<UserMoney>` y pedirlos con `<UserMoneyField>` (`apps/client/src/features/preferences/components/UserMoney.tsx`, sobre los genéricos `Money` y `MoneyField`); NEVER formatear importes a mano ni usarlos para cantidades no monetarias como unidades o stock (004, FR-011, FR-013).
- Al implementar un módulo de dominio MUST añadirlo a `IMPLEMENTED_MODULES` (`packages/shared/src/constants/modules.ts`) en el mismo cambio: activa su entrada del menú y lo permite como pantalla de inicio (005, FR-010).

## Estilo de trabajo

- MUST proponer cambios localizados; NEVER refactorices módulos completos sin pedir confirmación explícita.
- MUST leer los archivos afectados antes de proponer cambios.
- SHOULD proponer un plan corto (3–5 pasos) antes de tocar más de un archivo.
- NEVER elimines código comentado sin preguntar.
- MUST respetar el estilo y las convenciones existentes del proyecto, aunque no coincidan con tus preferencias.

## Herramientas siempre presentes

- `rtk` como proxy de comandos de dev ops en sesiones de Claude Code.
- `caveman` para comprimir la salida en sesiones largas de refactor.
- `codegraph` para navegar repositorios grandes con `.codegraph/`.
- `playwright-cli` (instalado globalmente, skill en `.claude/skills/playwright-cli/`) para explorar la app
  en el navegador, verificar cambios de UI y generar o depurar los tests E2E (ADR 0004).

## Preferencias de tono y formato

- SHOULD responder en español profesional-directo (sin argot).
- Longitud MUST ≤ 20 líneas por turno cuando la respuesta sea operativa; excepción: cuando redactes código o documentación completa.
- MUST usar bloques de código con marca de lenguaje explícita.
- SHOULD citar rutas de archivo relativas al repo, no absolutas.

## Flujos habituales

- Antes de escribir tests, MUST mostrar el plan y esperar confirmación.
- Antes de crear archivos nuevos, MUST anunciarlo y esperar OK.
- Antes de instalar dependencias nuevas, MUST justificar la necesidad y esperar OK.
- Al terminar un cambio, SHOULD indicar cómo verificarlo (comando o test concreto).
- Al lanzar `/speckit-implement`, antes de escribir código MUST pasar a **"En curso"** en Jira la fase
  (Tarea) y las subtareas que se van a implementar en esa ejecución, usando las claves de
  `specs/<feature>/jira-mapping.json` (proyecto y `cloud_id` en `.specify/extensions/jira/jira-config.yml`).
  Las que ya estén en "En curso" o "Listo" no se tocan. Al terminar, las completadas pasan a **"Listo"**
  con `/speckit-jira-sync-status`.

## Comandos Habituales

Ejecutar siempre desde la raíz del repo (workspaces de npm):

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias de todos los workspaces |
| `docker compose up -d` | Levanta MongoDB local y carga los datos de demo (`docker/mongo-seed/seed.js`, base `wholesale`). Usuarios `admin@`, `comercial@`, `almacen@`, `administracion@` y `bloqueado@demo.local`, contraseña `Demo1234!` |
| `docker compose run --rm mongo-seed` | Vuelve a cargar los datos de demo (idempotente; no borra lo que no sea de la demo) |
| `npm run dev --workspace=apps/server` | Backend en modo watch (ts-node-dev / tsx) |
| `npm run dev --workspace=apps/client` | Frontend con Vite en modo dev |
| `npm run dev --workspace=apps/desktop` | Electron apuntando al client en modo dev |
| `npm run dev` (raíz) | `concurrently`: server + client + desktop a la vez |
| `npm test --workspaces` | Ejecuta la suite de Jest en todos los workspaces |
| `npm test --workspace=apps/server -- --watch` | Tests del backend en modo watch |
| `npx playwright install chromium` | Instala Chromium para los E2E (una vez por equipo) |
| `npm run test:e2e` | Tests E2E con Playwright; levanta la API (MongoDB en memoria, puerto 4100) y Vite (5180) |
| `npm run test:e2e:ui` | Tests E2E en el modo UI de Playwright |
| `npm run lint` | ESLint en todo el repo |
| `npm run format` | Prettier sobre todo el repo |
| `npm run build --workspaces` | Build de producción de client, server y desktop |
| `npm run package --workspace=apps/desktop` | Genera el instalador de escritorio con electron-builder |

La UI de Swagger, en desarrollo, está disponible en `http://localhost:<PUERTO_SERVER>/api-docs`.

## Restricciones

- NEVER commitees `.env`, credenciales o cadenas de conexión reales; usa `.env.example` como plantilla.
- NEVER expongas documentos de Mongoose directamente en una respuesta HTTP: mapea siempre a un DTO/tipo de `packages/shared`.
- NEVER añadas una dependencia nueva a un workspace sin actualizar la tabla de Tecnologías de este archivo.
- MUST pasar `npm run lint`, `npm test --workspaces` y tener el bloque `@openapi` correspondiente antes de dar por terminado un endpoint nuevo o modificado.
- MUST registrar como ADR en `docs/adr/` los cambios de arquitectura relevantes (p. ej. cambiar de Redux Toolkit a otra solución, cambiar el ODM).
