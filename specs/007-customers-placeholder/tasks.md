---

description: "Task list for feature 007-customers-placeholder"
---

# Tasks: Pantalla provisional de Clientes

**Input**: Design documents from `/specs/007-customers-placeholder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/customers-api.openapi.yaml,
contracts/customers-ui.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige:
- tests de servicio y de rutas del módulo `customers` (supertest + mongodb-memory-server);
- tests unitarios en `packages/shared` y `apps/client`;
- test propio del genérico nuevo (`ProgressBar`).

El E2E de Playwright (ADR 0004) cubre la pantalla de principio a fin. En cada fase los tests se escriben
primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de cada fase se
muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución por
prioridad: US1 → US2 (P1) → US3 (P2).

**Reglas transversales** (aplican a todas las tareas):
- **Patrón de 006**: cada pieza de `customers` tiene su equivalente en `products` (misma forma, mismos nombres
  con el dominio cambiado). Se toma como referencia, pero NEVER se modifica el código de 006 salvo los tests
  que dependían de que Clientes estuviera pendiente (plan › Complexity Tracking).
- **Sin base de datos** (FR-009, research R3): el módulo `customers` NEVER importa Mongoose ni crea
  `customer.model.ts`. `listCustomers` devuelve `{ items: [], total: 0, page, pageSize: CUSTOMERS_PAGE_SIZE }`.
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40, anidamiento
  ≤2 y early returns.
- **Genéricos sin negocio** (principio VIII): `ProgressBar` no importa `@app/shared`, ni el store, ni textos de
  clientes; todo le llega por props.
- **Sin llamadas a la API desde componentes**: solo `customersApi.ts`, invocado desde los thunks de
  `customersSlice.ts` (ADR 0001).
- **Criterios en la dirección** (FR-007a, research R8): la fuente de verdad de los criterios es la query de
  `/clientes`. El slice NEVER los guarda.
- **Importes y porcentajes** (CLAUDE.md, FR-016): el saldo con `<UserMoney>`; el riesgo usado como porcentaje
  en Mono, nunca con `UserMoney`.
- **Estilos**: tokens de `apps/client/src/styles/tokens.css`; corte `@media (max-width: 759px)`; objetivo
  táctil de 44 px.
- **Dependencias**: ninguna nueva (research R13).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: entorno de trabajo

- [X] T001 Comprobar que la rama activa es `007-customers-placeholder`, que `.specify/feature.json` apunta a
  `specs/007-customers-placeholder` y que `npm test --workspaces` y `npm run lint` están en verde antes de
  empezar (línea base).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos y reglas compartidos del listado (data-model.md), que usan servidor y cliente en todas las
historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Tests de Foundational (primero, deben fallar) ⚠️

- [X] T002 [P] Crear `packages/shared/src/constants/customers.test.ts`:
  - `customerRiskUsed(1000, null)` → `null` y `customerRiskUsed(1000, 0)` → `null` («`maxRisk` es `null` o ≤ 0
    → `null`, Sin límite»);
  - `customerRiskUsed(0, 5000)` → `0` y `customerRiskUsed(-200, 5000)` → `0` («`balance` ≤ 0 → 0»);
  - `customerRiskUsed(2500, 5000)` → `50`, `customerRiskUsed(1234.56, 5000)` → `25` (redondeo) y
    `customerRiskUsed(5600, 5000)` → `112` («puede pasar de 100»);
  - `customerRiskLevel(0)` y `customerRiskLevel(49)` → `'low'`; `customerRiskLevel(50)` y
    `customerRiskLevel(79)` → `'medium'`; `customerRiskLevel(80)` y `customerRiskLevel(112)` → `'high'`;
  - `CUSTOMER_SEARCH_MAX_LENGTH === 100`, `CUSTOMERS_PAGE_SIZE === 10` y
    `CUSTOMER_RISK_THRESHOLDS` es `{ medium: 50, high: 80 }`.

### Implementación de Foundational

- [X] T003 [P] Crear `packages/shared/src/types/customer.ts` con:
  - `CustomerRiskLevel = 'low' | 'medium' | 'high'`;
  - `CustomerListItem` con `id`, `name`, `city: string | null` (población), `maxRisk: number | null` (euros
    con 2 decimales; `null` o 0 = sin límite), `balance: number` (saldo pendiente en euros con 2 decimales),
    `riskUsed: number | null` (porcentaje entero ≥ 0; `null` sin límite) y `lastOrderDate: string | null`
    (`YYYY-MM-DD`; `null` si no hay pedidos), cada campo con su comentario;
  - `CustomerListQuery` con `q?: string` y `page: number`.
- [X] T004 Crear `packages/shared/src/constants/customers.ts` con `CUSTOMER_SEARCH_MAX_LENGTH = 100`,
  `CUSTOMERS_PAGE_SIZE = 10` (clarificación del 2026-10-22: igual que Productos; el lienzo muestra 8),
  `CUSTOMER_RISK_THRESHOLDS = { medium: 50, high: 80 }`,
  `customerRiskUsed(balance, maxRisk): number | null` y `customerRiskLevel(riskUsed): CustomerRiskLevel` según
  data-model.md › Riesgo usado. Depende de T003.
- [X] T005 Exportar desde `packages/shared/src/index.ts` `CustomerRiskLevel`, `CustomerListItem`,
  `CustomerListQuery` y `export * from './constants/customers'`. Ejecutar
  `npm test --workspace=packages/shared` y comprobar que T002 pasa. Depende de T003–T004.

**Checkpoint**: tipos y reglas del riesgo disponibles en `@app/shared`.

---

## Phase 3: User Story 1 - Abrir Clientes y ver su estructura (Priority: P1) 🎯 MVP

**Goal**: Clientes es un módulo implementado. Los roles con acceso (Administrador, Comercial y
Administración) lo abren desde el menú y ven el título, el número de fichas, la búsqueda y las cabeceras del
listado. La pantalla pide el listado al servidor, que exige sesión y permiso, valida los criterios y responde
vacío. Almacén no ve Clientes.

**Independent Test**: con Comercial (editar) y Administración (solo ver), pulsar Clientes en el menú: se abre
`/clientes` con su estructura y se hace `GET /api/customers`. Almacén no ve Clientes y recibe 403 del servidor
(quickstart §3.1, §3.2, §3.9–§3.11, §3.13, §3.14).

### Tests de US1 (primero, deben fallar) ⚠️

- [X] T006 [P] [US1] Crear `apps/server/src/modules/customers/customer.service.test.ts`: `listCustomers` con
  `{ page: 1 }` y con `{ q: 'ferreteria', page: 3 }` devuelve `{ items: [], total: 0, page, pageSize: 10 }`
  (la `page` pedida). Comprobar que el servicio no importa Mongoose, como en
  `apps/server/src/modules/products/product.service.test.ts`.
- [X] T007 [P] [US1] Crear `apps/server/src/modules/customers/customer.routes.test.ts` con `startTestDb`,
  `clearTestDb` y `stopTestDb` y los helpers de `apps/server/src/modules/products/product.routes.test.ts` como
  referencia:
  - 200 `{ success: true, data: { items: [], total: 0, page: 1, pageSize: 10 } }` para Administrador,
    Comercial y Administración;
  - 401 `AUTH_UNAUTHENTICATED` sin token;
  - 403 `AUTH_FORBIDDEN` con Almacén (sin acceso a Clientes en la matriz de 003);
  - 400 `VALIDATION_ERROR` con `q` de 101 caracteres, `page=0`, `page=-1` y `page=abc`;
  - 200 vacío con `q=%20%20ferreteria%20` (se recorta), con 100 caracteres rodeados de espacios (los
    espacios del principio y del final no cuentan, FR-008), con
    `q=%20%20%20` (solo espacios = sin búsqueda), con `page=3` (devuelve `page: 3`) y con un parámetro
    desconocido `foo=bar` (se ignora).
- [X] T008 [P] [US1] Ajustar `packages/shared/src/constants/modules.test.ts`: `IMPLEMENTED_MODULES` es
  `['ajustes', 'productos', 'clientes']`; `isModuleImplemented('clientes')` es `true`; los pendientes pasan a
  `['ventas', 'proveedores', 'cobros']`.
- [X] T009 [P] [US1] Ajustar los tests que dependen de que Clientes esté pendiente (research R11):
  - `apps/server/src/modules/preferences/preferences.pendingModules.test.ts`: el caso 400
    `PREFERENCES_HOME_SCREEN_NOT_ALLOWED` con Comercial usa `homeScreen: 'ventas'` en lugar de `'clientes'`;
    añadir un caso 200 con `homeScreen: 'clientes'`;
  - `apps/client/src/features/preferences/components/AppearanceForm.pendingModules.test.tsx`: «Pantalla de
    inicio» ofrece Productos y Clientes al Comercial (actualizar título y aserción);
  - `apps/client/src/features/navigation/navItems.test.ts` («con la lista real…»): Clientes pasa a
    `pending: false`;
  - `apps/client/src/routes/homeRoute.test.ts` (bloque de la lista real, línea ~106): un Comercial que vuelve
    de `/clientes` aterriza en `/clientes`, no en `/productos`; y un Comercial con `homeScreen: 'clientes'`
    guardado aterriza en `/clientes` tras el login (`resolveHomeRoute(user(COMERCIAL, 'clientes'), null)`,
    caso límite «pantalla de inicio de antes de 005»).
  Tras T020, ejecutar `npm test --workspaces` y ajustar cualquier otro caso que use la lista real.
- [X] T010 [P] [US1] Crear `apps/client/src/features/customers/customersSlice.test.ts` (casos de US1):
  - estado inicial `{ items: [], total: 0, status: 'idle', error: null, requestId: null }`;
  - `loadCustomers.pending` → `status: 'loading'`;
  - `loadCustomers.fulfilled` con `{ items: [], total: 0, … }` → `status: 'succeeded'`, `total: 0`.
- [X] T011 [P] [US1] Crear `apps/client/src/features/customers/customersApi.test.ts` con `httpClient` simulado:
  - `{ page: 1 }` → `GET /customers` con `params` vacío;
  - `{ q: 'ferreteria', page: 2 }` → `params` con los dos valores;
  - devuelve el `data` del envelope.
- [X] T012 [P] [US1] Crear `apps/client/src/components/ProgressBar.test.tsx`:
  - `role="meter"` con nombre accesible `label`, `aria-valuemin` 0 y `aria-valuemax` 100;
  - `value={45}` → `aria-valuenow` 45; `value={112}` → `aria-valuenow` 100 y `aria-valuetext` «112 %»;
    `value={-5}` → `aria-valuenow` 0;
  - `tone` se refleja en `data-tone` (`ok`, `warning`, `danger`).
- [X] T013 [P] [US1] Crear `apps/client/src/features/customers/formatOrderDate.test.ts`:
  `'2026-10-07'` → `'07/10/2026'`; `null` → `'—'`.
- [X] T014 [P] [US1] Crear `apps/client/src/features/customers/components/CustomersTable.test.tsx`:
  - con `rows=[]`: tabla con `caption` «Clientes» y cabeceras Cliente, Riesgo usado, Saldo y Último pedido;
    sin cabecera de acciones; sin filas;
  - con una fila de ejemplo (`riskUsed: 62`): nombre y población, «62 %» con un `meter` de tono `warning`,
    saldo formateado por `UserMoney` y `07/10/2026`;
  - `riskUsed: 30` → tono `ok`; `riskUsed: 112` → tono `danger` y texto «112 %»;
  - `riskUsed: null` → texto «Sin límite» y ningún `meter`;
  - `lastOrderDate: null` → «—»; `city: null` → solo el nombre, sin línea de población;
  - tarjeta móvil (`renderCard`, FR-015): con la fila de ejemplo muestra nombre, población, «62 %» con su
    `meter`, saldo y `07/10/2026`; con `riskUsed: null`, «Sin límite».
- [X] T015 [P] [US1] Crear `apps/client/src/features/customers/components/CustomerSearch.test.tsx`:
  - región `role="search"` con nombre «Buscar clientes»;
  - campo «Buscar» de tipo `search` con `maxLength` 100 y placeholder «Buscar cliente»;
  - escribir llama a `onSearchChange` con el texto.
- [X] T016 [P] [US1] Crear `apps/client/src/pages/CustomersPage.test.tsx` (casos de US1), con la store de
  `setupStore` y `fetchCustomers` simulado (`jest.mock('../features/customers/customersApi')`):
  - h1 «Clientes» y «0 fichas» tras resolver la petición;
  - sin botón «Nuevo cliente» ni acciones «Nueva venta», «Editar ficha» o «Ver ventas» (FR-005);
  - al montar llama a `fetchCustomers` una vez con `{ page: 1 }`.
- [X] T017 [P] [US1] Crear `e2e/customers.spec.ts` (US1), con los helpers de `e2e/products.spec.ts`:
  - el Administrador pulsa Clientes en el menú: enlace sin «Pendiente» que abre `/clientes` y queda con
    `aria-current="page"`;
  - se ven el h1, «0 fichas», la búsqueda y las cabeceras del listado (en móvil, solo título y búsqueda);
  - en Ajustes › Apariencia, «Pantalla de inicio» ofrece «Clientes»;
  - un usuario Administración (solo ver), creado con `seedUsers` de `e2e/support/db.ts`, ve la misma pantalla
    (FR-003);
  - un usuario Almacén no ve Clientes en el menú y `/clientes` lo lleva a su pantalla de inicio.

### Implementación de US1

- [X] T018 [US1] Crear la API en `apps/server/src/modules/customers/` siguiendo `products/` (research R1–R4):
  - `customer.validation.ts`: `customerListQuerySchema` con `q`:
    `z.string().trim().max(CUSTOMER_SEARCH_MAX_LENGTH)` y vacío → `undefined`; `page`:
    `z.coerce.number().int().min(1).default(1)`; sin `.strict()`. Exportar `type CustomerListQueryInput`;
  - `customer.service.ts`: `listCustomers(criteria: CustomerListQuery): Promise<ListPage<CustomerListItem>>`,
    que devuelve `{ items: [], total: 0, page: criteria.page, pageSize: CUSTOMERS_PAGE_SIZE }` sin importar
    Mongoose, con un comentario de que es provisional hasta la migración de la cartera (FR-009);
  - `customer.controller.ts`: `customerController.list`, que lee `req.query as CustomerListQueryInput`,
    llama a `listCustomers` y responde con `sendSuccess<ListPage<CustomerListItem>>`.
  Comprobar que T006 pasa.
- [X] T019 [US1] Crear `apps/server/src/modules/customers/customer.routes.ts`:
  - `customerRouter.use(requireAuth, requirePermission('clientes', 'view'))`;
  - `customerRouter.get('/', validate({ query: customerListQuerySchema }), customerController.list)`;
  - bloque JSDoc `@openapi` equivalente a `contracts/customers-api.openapi.yaml`: tag `Customers`, parámetros
    `q` y `page`, esquemas `CustomerListItem` y `CustomerListPage`, y respuestas 200/400/401/403. Reutilizar
    los esquemas y respuestas comunes ya definidos en `product.routes.ts` y otros bloques.
  Montar en `apps/server/src/app.ts` con `app.use('/api/customers', customerRouter)`, después de
  `/api/products`. Ejecutar `npm test --workspace=apps/server -- customers` y comprobar que T007 pasa.
  Depende de T018.
- [X] T020 [US1] Añadir `'clientes'` a `IMPLEMENTED_MODULES` en `packages/shared/src/constants/modules.ts`
  (convención de CLAUDE.md). Comprobar que T008 y T009 pasan.
- [X] T021 [P] [US1] Crear `apps/client/src/features/customers/customersApi.ts` con
  `fetchCustomers(query: CustomerListQuery): Promise<ListPage<CustomerListItem>>`
  (`httpClient.get('/customers', { params })`), omitiendo `page: 1` y `q` ausente. Comprobar que T011 pasa.
- [X] T022 [US1] Crear `apps/client/src/features/customers/customersSlice.ts` con el estado de data-model.md
  (`items`, `total`, `status`, `error`, `requestId`) y el thunk `loadCustomers(query)` sobre `fetchCustomers`.
  Registrar `customers: customersReducer` en `apps/client/src/store/store.ts`. Comprobar que T010 pasa.
  Depende de T021.
- [X] T023 [P] [US1] Crear `apps/client/src/components/ProgressBar.tsx` y `ProgressBar.module.css`
  (contracts/customers-ui.md › ProgressBar): props `value`, `tone: 'ok' | 'warning' | 'danger'` y `label`;
  `role="meter"`, `aria-valuenow` limitado a 0–100 y `aria-valuetext` con el valor real («112 %»); 4 px de alto,
  pista `--surface2` y relleno del color del tono (semáforo de `docs/design/README.md`). Comprobar que T012
  pasa.
- [X] T024 [P] [US1] Crear `apps/client/src/features/customers/formatOrderDate.ts`:
  `formatOrderDate(date: string | null): string`, que pasa `YYYY-MM-DD` a `DD/MM/AAAA` sin convertir a `Date`
  y devuelve «—» con `null` (research R12). Comprobar que T013 pasa.
- [X] T025 [US1] Crear `apps/client/src/features/customers/components/CustomersTable.tsx` y
  `CustomersTable.module.css`, que componen `Table` con las columnas de contracts/customers-ui.md
  §Estructura:
  - Cliente: nombre con la población debajo;
  - Riesgo usado: «NN %» en Mono + `ProgressBar` (`label` «Riesgo usado», tono de `customerRiskLevel`: `low` →
    `ok`, `medium` → `warning`, `high` → `danger`); con `riskUsed: null`, «Sin límite» sin barra ni color;
  - Saldo: `UserMoney`, alineado a la derecha;
  - Último pedido: `formatOrderDate` en Mono.
  Añadir `renderCard` para móvil según `ClientesMovil.dc.html` y prop `status`/`busy` como `ProductsTable`.
  Comprobar que T014 pasa. Depende de T023–T024.
- [X] T026 [P] [US1] Crear `apps/client/src/features/customers/components/CustomerSearch.tsx` y
  `CustomerSearch.module.css`: componente controlado con props `search` y `onSearchChange` que compone
  `TextField` (`type="search"`, `maxLength={CUSTOMER_SEARCH_MAX_LENGTH}`, placeholder «Buscar cliente») dentro
  de `<div role="search" aria-label="Buscar clientes">`. Comprobar que T015 pasa.
- [X] T027 [US1] Crear `apps/client/src/pages/CustomersPage.tsx` y `CustomersPage.module.css`:
  - cabecera con h1 «Clientes» y «{total} fichas» (Mono);
  - `CustomerSearch` y, dentro de un panel, `CustomersTable` con `items`;
  - al montar, despacha `loadCustomers({ page: 1 })`. US2 sustituye esta llamada por los criterios de la
    dirección.
  Comprobar que T016 pasa. Depende de T022, T025–T026.
- [X] T028 [US1] Añadir la ruta en `apps/client/src/routes/AppRouter.tsx`, dentro de los hijos de
  `AppLayout`:
  `{ path: 'clientes', element: <RequireAuth module="clientes"><CustomersPage /></RequireAuth> }`. Depende de
  T027.
- [X] T029 [US1] Ajustar `e2e/navigation.spec.ts` a Clientes implementado (Clientes sin «Pendiente» en el
  menú; el ejemplo de módulo pendiente sigue siendo Proveedores). Ejecutar
  `npm run test:e2e -- customers navigation` y comprobar que T017 pasa.

**Checkpoint**: US1 funcional. Clientes se abre desde el menú y por dirección, el servidor responde vacío con
validación y permisos, y Clientes se puede elegir como pantalla de inicio.

---

## Phase 4: User Story 2 - Entender que la cartera aún no está cargada (Priority: P1)

**Goal**: con el listado vacío se ve el aviso «Todavía no hay clientes · La cartera se cargará desde el sistema
anterior.». La búsqueda y la página viven en la dirección de la pantalla y piden el listado de nuevo:
- la búsqueda, 300 ms después de la última tecla;
- solo se muestra la última respuesta;
- un valor no válido en la dirección se sustituye por el de por defecto, sin error.

Mientras carga, se indica sin mostrar todavía el aviso.

**Independent Test**: abrir Clientes y ver el aviso. Buscar «ferretería» genera una sola petición con
`q=ferreter%C3%ADa` y la dirección cambia. Recargar conserva la búsqueda y «Atrás» vuelve a la anterior.
`/clientes?page=abc&q=` se normaliza a `/clientes` (quickstart §3.3–§3.6).

**Depende de**: US1 (pantalla, slice y ruta).

### Tests de US2 (primero, deben fallar) ⚠️

- [X] T030 [P] [US2] Crear `apps/client/src/features/customers/customerCriteria.test.ts`:
  - `parseCustomerCriteria(new URLSearchParams(''))` → `{ page: 1 }`;
  - con `q=%20ferreteria%20&page=2` → `{ q: 'ferreteria', page: 2 }`;
  - valores no válidos se ignoran y quedan por defecto: `q` de 101 caracteres, `q=%20%20`, `page=0`,
    `page=-1` y `page=abc`;
  - parámetros ajenos (`lowStock=true`) se ignoran;
  - `serializeCustomerCriteria` omite los valores por defecto (`{ page: 1 }` → `''`) y es la inversa de
    `parseCustomerCriteria` para criterios válidos.
- [X] T031 [P] [US2] Ampliar `apps/client/src/features/customers/customersSlice.test.ts`:
  - un `fulfilled` cuyo `meta.requestId` no es el último `requestId` se ignora;
  - un `pending` posterior sustituye `requestId`.
- [X] T032 [P] [US2] Crear `apps/client/src/features/customers/components/CustomersListStatus.test.tsx` (casos
  de US2):
  - con `status: 'loading'` muestra «Cargando clientes…» con `role="status"` y no muestra el aviso ni el error;
  - con `status: 'succeeded'` y `total: 0` muestra el `EmptyState` «Todavía no hay clientes» / «La cartera se
    cargará desde el sistema anterior.»;
  - con `succeeded` y elementos no muestra nada.
- [X] T033 [P] [US2] Ampliar `apps/client/src/pages/CustomersPage.test.tsx` (con `createMemoryRouter` e
  `initialEntries`):
  - con `/clientes` se ve el aviso y no se ve paginación;
  - con `/clientes?q=ferreteria` el campo muestra el valor y `fetchCustomers` recibe
    `{ q: 'ferreteria', page: 1 }`;
  - teclear «café» con temporizadores falsos llama a `fetchCustomers` una sola vez, 300 ms después de la
    última tecla, y la dirección pasa a `?q=caf%C3%A9`;
  - con `/clientes?page=abc&q=` la dirección se normaliza a `/clientes`, sin error;
  - con `/clientes?q=ferreteria&page=2` la dirección conserva `page=2` y `fetchCustomers` recibe `page: 2`
    (montar no reescribe la dirección); teclear otra búsqueda vuelve a `page: 1`;
  - con la dirección cambiada desde fuera (navegar a `/clientes?q=bar`), el campo se resincroniza y el valor
    con debounce anterior no deshace la navegación.
- [X] T034 [P] [US2] Ampliar `e2e/customers.spec.ts` (US2):
  - se ve el aviso de cartera pendiente;
  - al escribir «ferreteria» se hace una petición `GET /api/customers?q=ferreteria` (`page.waitForRequest`) y
    la dirección cambia;
  - recargar mantiene la búsqueda;
  - `/clientes?page=abc` se normaliza a `/clientes` y muestra el aviso.

### Implementación de US2

- [X] T035 [P] [US2] Crear `apps/client/src/features/customers/customerCriteria.ts` con
  `parseCustomerCriteria(params: URLSearchParams): CustomerListQuery` (recorta `q`, lo descarta si queda vacío
  o pasa de `CUSTOMER_SEARCH_MAX_LENGTH`; `page` entero ≥ 1 o 1) y
  `serializeCustomerCriteria(query): URLSearchParams` (omite los valores por defecto), con la forma de
  `features/products/productCriteria.ts`. Comprobar que T030 pasa.
- [X] T036 [P] [US2] En `apps/client/src/features/customers/customersSlice.ts`, guardar `requestId` en
  `pending` e ignorar `fulfilled` y `rejected` de peticiones que no son la última (research R9). Comprobar que
  T031 pasa.
- [X] T037 [P] [US2] Crear `apps/client/src/features/customers/components/CustomersListStatus.tsx` y
  `CustomersListStatus.module.css`, que según `status` y `total` muestran el estado de carga («Cargando
  clientes…», `role="status"`) o el `EmptyState` con los textos del aviso. El caso `failed` llega en US3.
  Comprobar que T032 pasa.
- [X] T038 [US2] Conectar `apps/client/src/pages/CustomersPage.tsx` con la dirección (research R8, R9), como
  `ProductsPage.tsx`:
  - leer los criterios con `useSearchParams` + `parseCustomerCriteria` y normalizar la dirección con
    `replace` si no coincide con `serializeCustomerCriteria`;
  - estado local del campo + `useDebouncedValue(…, 300)`; al estabilizarse, escribir `q` con `replace` y volver
    a la página 1, **solo si el valor con debounce ≠ `criteria.q`**;
  - resincronizar el campo con `criteria.q` cuando la dirección cambie desde fuera;
  - un efecto despacha `loadCustomers(criteria)` cuando cambian los criterios y llama a `abort()` sobre la
    promesa anterior;
  - `CustomersListStatus` bajo las cabeceras, dentro del panel; tabla con `aria-busy` mientras carga; sin
    paginación con 0 elementos;
  - extraer a hooks auxiliares (`useCustomerCriteria`, `useLoadCustomers`) para no pasar de 40 líneas.
  Comprobar que T033 pasa. Depende de T035–T037.
- [X] T039 [US2] En `docs/design/README.md` › Componentes, añadir a `EmptyState` su uso en Clientes («Todavía no
  hay clientes · La cartera se cargará desde el sistema anterior.», 007) y documentar `ProgressBar` (anatomía,
  `role="meter"` y el texto «Sin límite» de la columna de riesgo) en la entrada «Barra de progreso» (FR-017).
  Ejecutar `npm run test:e2e -- customers` y comprobar que T034 pasa.

**Checkpoint**: US1 y US2 funcionan. Aviso de cartera pendiente, criterios en la dirección y una petición por
pausa al teclear.

---

## Phase 5: User Story 3 - Distinguir un error de la cartera vacía (Priority: P2)

**Goal**: si el servidor no responde o devuelve un error, se ve «No se ha podido cargar el listado de
clientes.» con «Reintentar», distinto del aviso y sin detalles técnicos. «Reintentar» vuelve a pedir el
listado con los mismos criterios.

**Independent Test**: con el servidor detenido o con `/api/customers` interceptado para devolver un error, se
ve el mensaje de error (no el aviso). «Reintentar» con el servidor disponible muestra el aviso (quickstart
§3.7).

**Depende de**: US2 (`CustomersListStatus` y la página conectada a la dirección).

### Tests de US3 (primero, deben fallar) ⚠️

- [X] T040 [P] [US3] Ampliar `apps/client/src/features/customers/customersSlice.test.ts`:
  `loadCustomers.rejected` (sin respuesta y con un envelope de error del servidor) → `status: 'failed'` y
  `error === CUSTOMERS_LOAD_ERROR_MESSAGE` («No se ha podido cargar el listado de clientes.»), nunca el
  mensaje del servidor; un `pending` posterior limpia `error`; un `rejected` por `abort` no cambia el estado.
- [X] T041 [P] [US3] Ampliar `apps/client/src/features/customers/components/CustomersListStatus.test.tsx`:
  - con `status: 'failed'` muestra `role="alert"` con el mensaje y un botón «Reintentar», y no muestra el aviso;
  - pulsar «Reintentar» llama a `onRetry` una vez.
- [X] T042 [P] [US3] Ampliar `apps/client/src/pages/CustomersPage.test.tsx`:
  - con `fetchCustomers` rechazado se ve el error;
  - «Reintentar» llama de nuevo a `fetchCustomers` con los mismos criterios de la dirección y, si resuelve, se
    ve el aviso.
- [X] T043 [P] [US3] Ampliar `e2e/customers.spec.ts` (US3): con `page.route('**/api/customers**', …)`
  respondiendo 500 se ve el error y no el aviso; tras `page.unroute`, «Reintentar» muestra el aviso.

### Implementación de US3

- [X] T044 [P] [US3] En `apps/client/src/features/customers/customersSlice.ts`, definir y exportar
  `CUSTOMERS_LOAD_ERROR_MESSAGE`. En `rejected` (solo de la última petición, sin contar los `abort`), guardar
  `status: 'failed'` y ese mensaje; en `pending`, limpiar `error`. Comprobar que T040 pasa.
- [X] T045 [P] [US3] Añadir el caso `failed` a
  `apps/client/src/features/customers/components/CustomersListStatus.tsx`: `Alert variant="error"` con el
  mensaje y un `Button` secundario «Reintentar» (prop `onRetry`). Comprobar que T041 pasa.
- [X] T046 [US3] En `apps/client/src/pages/CustomersPage.tsx`, pasar `onRetry`, que vuelve a despachar
  `loadCustomers` con los criterios actuales. Comprobar que T042 pasa. Depende de T044–T045.
- [X] T047 [US3] En `docs/design/README.md`, añadir a «Error de un listado» su uso en Clientes («No se ha podido
  cargar el listado de clientes.», 007). Ejecutar `npm run test:e2e -- customers` y comprobar que T043 pasa.

**Checkpoint**: las tres historias funcionan; un error nunca se confunde con la cartera vacía.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T048 [P] Revisar la pantalla con `playwright-cli` a 390 px y 1440 px, en claro y en oscuro, y con
  densidad Cómoda y Compacta (FR-015):
  - orden del teclado y foco visible;
  - avisos anunciados (`status` / `alert`);
  - objetivos de 44 px y contraste de 4.5:1;
  - sin scroll horizontal de la página.
- [ ] T049 [P] Comprobar que `/api-docs` muestra `GET /customers` con sus parámetros, `CustomerListPage` y las
  respuestas 400/401/403, comparando el spec de `buildSwaggerSpec()` con
  `contracts/customers-api.openapi.yaml`.
- [ ] T050 [P] Revisar que ningún fichero de `apps/server/src/modules/customers/` importa Mongoose, que
  `ProgressBar` no importa `@app/shared` y que ninguna función nueva pasa de 40 líneas efectivas
  (principios IV y VIII).
- [ ] T051 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde. Validar a mano
  quickstart.md completo en web (§3) y en escritorio (§4: `npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de US1 (`CustomersPage`, `customersSlice` y la ruta).
- **US3 (Phase 5)**: depende de US2 (`CustomersListStatus` y la página conectada a la dirección).
- **Polish (Phase 6)**: después de las historias que se vayan a entregar.

### Within Each User Story

- Tests primero (deben fallar), después la implementación.
- Servidor: validation → service → controller → routes → app.ts.
- Cliente: api → slice → componentes → página → ruta.

### Parallel Opportunities

- Foundational: T002 y T003 en paralelo; T004 → T005.
- US1: tests T006–T017 en paralelo. Servidor (T018 → T019) en paralelo con el cliente (T021 → T022; T023, T024
  y T026 en paralelo; T025 tras T023–T024 → T027 → T028). T020 en cualquier momento tras T008/T009.
- US2: tests T030–T034 en paralelo; T035, T036 y T037 en paralelo → T038 → T039.
- US3: tests T040–T043 en paralelo; T044 y T045 en paralelo → T046 → T047.
- Polish: T048–T050 en paralelo.

---

## Parallel Example: User Story 1

```text
Tests a la vez:
  T006 customer.service.test   T007 customer.routes.test   T008 modules.test   T009 tests pendientes (x4)
  T010 customersSlice.test     T011 customersApi.test      T012 ProgressBar.test   T013 formatOrderDate.test
  T014 CustomersTable.test     T015 CustomerSearch.test    T016 CustomersPage.test T017 e2e/customers.spec
Implementación:
  Servidor: T018 validation + service + controller → T019 routes + app.ts
  Cliente:  T021 api → T022 slice │ T023 ProgressBar │ T024 formatOrderDate │ T026 CustomerSearch
            T025 CustomersTable → T027 página → T028 ruta
  T020 modules.ts → T029 e2e ajustado
```

## Parallel Example: User Story 2

```text
Tests:          T030 customerCriteria | T031 slice | T032 CustomersListStatus | T033 CustomersPage | T034 e2e
Implementación: T035 customerCriteria | T036 slice | T037 CustomersListStatus  →  T038 CustomersPage
                →  T039 README + e2e
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (tipos y reglas del riesgo en shared).
2. Phase 3 (US1): endpoint con permisos y validación, pantalla con su estructura, módulo implementado.
3. **Parar y validar**: quickstart §3.1, §3.2, §3.9–§3.11, §3.13 y §3.14.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → pantalla accesible y contrato del listado fijado (MVP).
3. US2 → aviso de cartera pendiente, criterios en la dirección y debounce.
4. US3 → error distinguible con «Reintentar».
5. Polish → accesibilidad, Swagger y validación completa.

### Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Hacer commit al terminar cada fase (Conventional Commits en español, prefijo `(007)`).
- Al lanzar `/speckit-implement`, pasar a «En curso» en Jira la fase y las subtareas que se vayan a
  implementar (CLAUDE.md › Flujos habituales), si ya existe `specs/007-customers-placeholder/jira-mapping.json`.
