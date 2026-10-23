---

description: "Task list for feature 009-suppliers-placeholder"
---

# Tasks: Pantalla provisional de Proveedores

**Input**: Design documents from `/specs/009-suppliers-placeholder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/suppliers-api.openapi.yaml,
contracts/suppliers-ui.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige:
- tests de servicio y de rutas del módulo `suppliers` (supertest + mongodb-memory-server);
- tests unitarios en `packages/shared` y `apps/client`.

El E2E de Playwright (ADR 0004) cubre la pantalla de principio a fin. En cada fase los tests se escriben
primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de cada fase se
muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución por
prioridad: US1 → US2 (P1) → US3 (P2).

**Reglas transversales** (aplican a todas las tareas):
- **Patrón de 006 y 007**: cada pieza de `suppliers` tiene su equivalente en `customers` (misma forma, mismos
  nombres con el dominio cambiado) y el filtro booleano sigue a `lowStock` de `products`. Se toman como
  referencia, pero NEVER se modifica el código de 006 ni de 007 salvo los tests que dependían de que Proveedores
  estuviera pendiente (plan › Complexity Tracking).
- **Sin base de datos** (FR-009, research R3): el módulo `suppliers` NEVER importa Mongoose ni crea
  `supplier.model.ts`. `listSuppliers` devuelve `{ items: [], total: 0, page, pageSize: SUPPLIERS_PAGE_SIZE }`.
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40, anidamiento
  ≤2 y early returns.
- **Sin componentes genéricos nuevos** (research R7): se componen `Table`, `TextField`, `Checkbox`,
  `StatusStamp`, `Alert`, `Button`, `EmptyState` y `UserMoney`.
- **Sin llamadas a la API desde componentes**: solo `suppliersApi.ts`, invocado desde los thunks de
  `suppliersSlice.ts` (ADR 0001).
- **Criterios en la dirección** (FR-007a, research R8): la fuente de verdad de los criterios es la query de
  `/proveedores`. El slice NEVER los guarda.
- **Importes y plazos** (CLAUDE.md, FR-016): las compras del año con `<UserMoney>`; el plazo con
  `formatLeadTime`, en Mono, nunca con `UserMoney`.
- **Estilos**: tokens de `apps/client/src/styles/tokens.css`; corte `@media (max-width: 759px)`; objetivo
  táctil de 44 px.
- **Dependencias**: ninguna nueva (research R12).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: entorno de trabajo

- [X] T001 Comprobar que la rama activa es `009-suppliers-placeholder`, que `.specify/feature.json` apunta a
  `specs/009-suppliers-placeholder` y que `npm test --workspaces` y `npm run lint` están en verde antes de
  empezar (línea base).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos y constantes compartidos del listado (data-model.md), que usan servidor y cliente en todas las
historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

No hay reglas de negocio en shared (research R5): los tipos se comprueban al compilar y las constantes, en los
tests de servidor y cliente que las usan.

- [X] T002 [P] Crear `packages/shared/src/types/supplier.ts` con, cada campo con su comentario:
  - `SupplierListItem` con `id: string`, `name: string`, `leadTimeDays: number | null` («Plazo de entrega en días
    naturales, entero ≥ 0; `null` si no se conoce («—»)»), `yearPurchases: number` («Euros sin IVA con 2
    decimales, del 1 de enero del año en curso hasta hoy; se muestra con `UserMoney`») y `active: boolean`
    («`false` = dado de baja → sello «Baja»»). Sin CIF: solo se usa para buscar (research R6);
  - `SupplierListQuery` con `q?: string` (busca en nombre y CIF), `includeInactive: boolean` y `page: number`.
- [X] T003 [P] Crear `packages/shared/src/constants/suppliers.ts` con `SUPPLIER_SEARCH_MAX_LENGTH = 100`
  (FR-008, sin contar los espacios del principio y del final) y `SUPPLIERS_PAGE_SIZE = 10` (igual que Productos
  y Clientes), con sus comentarios.
- [X] T004 Exportar desde `packages/shared/src/index.ts` `SupplierListItem`, `SupplierListQuery` y
  `export * from './constants/suppliers'`. Ejecutar `npm run build --workspace=packages/shared` sin errores. Depende de T002–T003.

**Checkpoint**: tipos y constantes del listado disponibles en `@app/shared`.

---

## Phase 3: User Story 1 - Abrir Proveedores y ver su estructura (Priority: P1) 🎯 MVP

**Goal**: Proveedores es un módulo implementado. Los roles con acceso (Administrador y Administración editan;
Almacén solo ve) lo abren desde el menú y ven el título, el contador, la búsqueda, la casilla «Mostrar dados de
baja» y las cabeceras del listado. La pantalla pide el listado al servidor, que exige sesión y permiso, valida
los criterios y responde vacío. Comercial no ve Proveedores.

**Independent Test**: con Administración (editar) y Almacén (solo ver), pulsar Proveedores en el menú: se abre
`/proveedores` con su estructura y se hace `GET /api/suppliers`. Comercial no ve Proveedores y recibe 403 del
servidor (quickstart §3.1, §3.2, §3.10–§3.12, §3.14, §3.15).

### Tests de US1 (primero, deben fallar) ⚠️

- [X] T005 [P] [US1] Crear `apps/server/src/modules/suppliers/supplier.service.test.ts`: `listSuppliers` con
  `{ includeInactive: false, page: 1 }` y con `{ q: 'levante', includeInactive: true, page: 3 }` devuelve
  `{ items: [], total: 0, page, pageSize: 10 }` (la `page` pedida). Comprobar que el servicio no importa
  Mongoose, como en `apps/server/src/modules/customers/customer.service.test.ts`.
- [X] T006 [P] [US1] Crear `apps/server/src/modules/suppliers/supplier.routes.test.ts` con `startTestDb`,
  `clearTestDb` y `stopTestDb` y los helpers de `apps/server/src/modules/customers/customer.routes.test.ts` como
  referencia:
  - 200 `{ success: true, data: { items: [], total: 0, page: 1, pageSize: 10 } }` para Administrador,
    Administración y Almacén;
  - 401 `AUTH_UNAUTHENTICATED` sin token;
  - 403 `AUTH_FORBIDDEN` con Comercial (sin acceso a Proveedores en la matriz de 003);
  - 400 `VALIDATION_ERROR` con `q` de 101 caracteres, `page=0`, `page=-1`, `page=abc`, `includeInactive=si` e
    `includeInactive=1`;
  - 200 vacío con `q=%20%20levante%20` (se recorta), con 100 caracteres rodeados de espacios (FR-008), con
    `q=%20%20%20` (solo espacios = sin búsqueda), con `includeInactive=true`, con `includeInactive=false`, con
    `page=3` (devuelve `page: 3`) y con un parámetro desconocido `foo=bar` (se ignora).
- [X] T007 [P] [US1] Ajustar `packages/shared/src/constants/modules.test.ts`: `IMPLEMENTED_MODULES` es
  `['ajustes', 'productos', 'clientes', 'proveedores']`; `isModuleImplemented('proveedores')` es `true`; los
  pendientes pasan a `['ventas', 'cobros']`.
- [X] T008 [P] [US1] Ajustar los tests que usan Proveedores como módulo pendiente (research R11):
  - `apps/client/src/features/navigation/navItems.test.ts` («con la lista real…»): `['Proveedores', false]` y
    título con Proveedores (009); el caso «al implementar Clientes…» no cambia (usa su propia lista);
  - `apps/client/src/features/preferences/components/AppearanceForm.pendingModules.test.tsx`: el usuario
    `PROVEEDORES_ONLY` pasa a `COBROS_ONLY` (`cobros: 'edit'`, `proveedores: 'none'`) y su comentario a «Solo ve
    Cobros, que sigue pendiente»; el caso de `COMERCIAL` sigue ofreciendo `['Clientes', 'Productos']` (Comercial
    no ve Proveedores); añadir un caso con un usuario Administración que ofrece Clientes, Productos y
    Proveedores;
  - `apps/client/src/routes/homeRoute.test.ts` (bloque «con módulos pendientes (lista real, 005)»): en «un rol
    sin Productos ni otra pantalla implementada…» cambiar `proveedores: 'edit'` por `cobros: 'edit'`; añadir
    «un origen en Proveedores (009) se respeta» (`/proveedores` con un rol que lo ve → `/proveedores`) y «una
    pantalla de inicio Proveedores guardada de antes de 005 vuelve a funcionar (009)»;
  - `apps/server/src/modules/preferences/preferences.pendingModules.test.ts`: añadir un caso 200 de
    `PATCH /api/preferences` con `homeScreen: 'proveedores'` para un usuario Administración (FR-001); el caso
    400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED` con un módulo pendiente sigue usando `'ventas'`.
  Tras T019, ejecutar `npm test --workspaces` y ajustar cualquier otro caso que use la lista real.
- [X] T009 [P] [US1] Crear `apps/client/src/features/suppliers/suppliersSlice.test.ts` (casos de US1):
  - estado inicial `{ items: [], total: 0, status: 'idle', error: null, requestId: null }`;
  - `loadSuppliers.pending` → `status: 'loading'`;
  - `loadSuppliers.fulfilled` con `{ items: [], total: 0, … }` → `status: 'succeeded'`, `total: 0`.
- [X] T010 [P] [US1] Crear `apps/client/src/features/suppliers/suppliersApi.test.ts` con `httpClient` simulado:
  - `{ includeInactive: false, page: 1 }` → `GET /suppliers` con `params` vacío;
  - `{ q: 'levante', includeInactive: true, page: 2 }` → `params` `{ q: 'levante', includeInactive: 'true',
    page: 2 }`;
  - devuelve el `data` del envelope.
- [X] T011 [P] [US1] Crear `apps/client/src/features/suppliers/formatLeadTime.test.ts` (data-model.md › Plazo en
  pantalla): `null` → `'—'`; `1` → `'1 día'`; `0` → `'0 días'`; `3` → `'3 días'`.
- [X] T012 [P] [US1] Crear `apps/client/src/features/suppliers/components/SuppliersTable.test.tsx`, con la store
  de `setupStore` y las preferencias del usuario (formato de importes) como en `CustomersTable.test.tsx`, para que
  `UserMoney` formatee:
  - con `rows=[]`: tabla con `caption` «Proveedores» y cabeceras Proveedor, Plazo y Compras año; sin cabecera de
    acciones; sin filas;
  - con una fila activa de ejemplo (`leadTimeDays: 3`, `yearPurchases: 48210`): nombre sin subtítulo, «3 días»
    y las compras formateadas por `UserMoney`; sin sello «Baja»;
  - con `active: false`: sello «Baja» (`data-tone="neutral"`) junto al nombre;
  - con `leadTimeDays: null`: «—»;
  - tarjeta móvil (`renderCard`, FR-015): nombre, sello si está de baja y compras del año; sin plazo.
- [X] T013 [P] [US1] Crear `apps/client/src/features/suppliers/components/SupplierFilters.test.tsx`:
  - región `role="search"` con nombre «Buscar proveedores»;
  - campo «Buscar» de tipo `search` con `maxLength` 100 y placeholder «Nombre o CIF»;
  - casilla «Mostrar dados de baja» que refleja `includeInactive`;
  - escribir llama a `onSearchChange` con el texto; marcar la casilla llama a `onIncludeInactiveChange(true)`.
- [X] T014 [P] [US1] Crear `apps/client/src/pages/SuppliersPage.test.tsx` (casos de US1), con la store de
  `setupStore` y `fetchSuppliers` simulado (`jest.mock('../features/suppliers/suppliersApi')`):
  - h1 «Proveedores» y «0 activos» tras resolver la petición;
  - casilla «Mostrar dados de baja» desmarcada;
  - sin botón «Nuevo proveedor» ni «Editar proveedor», «Generar pedido de compra» ni «Productos asociados»
    (FR-005);
  - al montar llama a `fetchSuppliers` una vez con `{ includeInactive: false, page: 1 }`.
- [X] T015 [P] [US1] Crear `e2e/suppliers.spec.ts` (US1), con los helpers de `e2e/customers.spec.ts`:
  - el Administrador pulsa Proveedores en el menú: enlace sin «Pendiente» que abre `/proveedores` y queda con
    `aria-current="page"`;
  - se ven el h1, «0 activos», la búsqueda, la casilla y las cabeceras del listado (en móvil, sin «Plazo»);
  - en Ajustes › Apariencia, «Pantalla de inicio» ofrece «Proveedores»;
  - un usuario Almacén (solo ver), creado con `seedUsers` de `e2e/support/db.ts`, ve la misma pantalla (FR-003);
  - un usuario Comercial no ve Proveedores en el menú y `/proveedores` lo lleva a su pantalla de inicio.

### Implementación de US1

- [X] T016 [US1] Crear la API en `apps/server/src/modules/suppliers/` siguiendo `customers/` (research R1–R4):
  - `supplier.validation.ts`: `supplierListQuerySchema` con `q`:
    `z.string().trim().max(SUPPLIER_SEARCH_MAX_LENGTH)` y vacío → `undefined`; `includeInactive`:
    `z.enum(['true', 'false']).default('false').transform((value) => value === 'true')` (como `lowStock` en
    `product.validation.ts`); `page`: `z.coerce.number().int().min(1).default(1)`; sin `.strict()`. Exportar
    `type SupplierListQueryInput`;
  - `supplier.service.ts`: `listSuppliers(criteria: SupplierListQuery): Promise<ListPage<SupplierListItem>>`,
    que devuelve `{ items: [], total: 0, page: criteria.page, pageSize: SUPPLIERS_PAGE_SIZE }` sin importar
    Mongoose, con un comentario de que es provisional hasta la migración de proveedores (FR-009);
  - `supplier.controller.ts`: `supplierController.list`, que lee `req.query as SupplierListQueryInput`, llama a
    `listSuppliers` y responde con `sendSuccess<ListPage<SupplierListItem>>`.
  Comprobar que T005 pasa.
- [X] T017 [US1] Crear `apps/server/src/modules/suppliers/supplier.routes.ts`:
  - `supplierRouter.use(requireAuth, requirePermission('proveedores', 'view'))`;
  - `supplierRouter.get('/', validate({ query: supplierListQuerySchema }), supplierController.list)`;
  - bloque JSDoc `@openapi` equivalente a `contracts/suppliers-api.openapi.yaml`: tag `Suppliers`, parámetros
    `q`, `includeInactive` y `page`, esquemas `SupplierListItem` y `SupplierListPage`, y respuestas
    200/400/401/403. Reutilizar los esquemas y respuestas comunes ya definidos en `customer.routes.ts` y otros
    bloques.
  Montar en `apps/server/src/app.ts` con `app.use('/api/suppliers', supplierRouter)`, después de
  `/api/customers`. Ejecutar `npm test --workspace=apps/server -- suppliers` y comprobar que T006 pasa.
  Depende de T016.
- [X] T018 [P] [US1] Crear `apps/client/src/features/suppliers/suppliersApi.ts` con
  `fetchSuppliers(query: SupplierListQuery): Promise<ListPage<SupplierListItem>>`
  (`httpClient.get('/suppliers', { params })`), omitiendo `page: 1`, `q` ausente e `includeInactive: false`, y
  enviando `includeInactive: 'true'` cuando está activo. Comprobar que T010 pasa.
- [X] T019 [US1] Añadir `'proveedores'` a `IMPLEMENTED_MODULES` en `packages/shared/src/constants/modules.ts`
  (convención de CLAUDE.md). Comprobar que T007 y T008 pasan.
- [X] T020 [US1] Crear `apps/client/src/features/suppliers/suppliersSlice.ts` con el estado de data-model.md
  (`items`, `total`, `status`, `error`, `requestId`) y el thunk `loadSuppliers(query)` sobre `fetchSuppliers`.
  Registrar `suppliers: suppliersReducer` en `apps/client/src/store/store.ts`. Comprobar que T009 pasa.
  Depende de T018.
- [X] T021 [P] [US1] Crear `apps/client/src/features/suppliers/formatLeadTime.ts`:
  `formatLeadTime(days: number | null): string` según data-model.md › Plazo en pantalla («—», «1 día»,
  «N días»). Comprobar que T011 pasa.
- [X] T022 [US1] Crear `apps/client/src/features/suppliers/components/SuppliersTable.tsx` y
  `SuppliersTable.module.css`, que componen `Table` con las columnas de contracts/suppliers-ui.md §Estructura:
  - Proveedor: nombre y, si `active` es `false`, `StatusStamp tone="neutral"` «Baja»; sin subtítulo;
  - Plazo: `formatLeadTime` en Mono, alineado a la derecha;
  - Compras año: `UserMoney`, alineado a la derecha.
  Añadir `renderCard` para móvil según `ProveedoresMovil.dc.html` (sin plazo) y prop `status`/`busy` como
  `CustomersTable`. Comprobar que T012 pasa. Depende de T021.
- [X] T023 [P] [US1] Crear `apps/client/src/features/suppliers/components/SupplierFilters.tsx` y
  `SupplierFilters.module.css`: componente controlado con props `search`, `onSearchChange`, `includeInactive` y
  `onIncludeInactiveChange`, que compone dentro de `<div role="search" aria-label="Buscar proveedores">` un
  `TextField` (`type="search"`, `maxLength={SUPPLIER_SEARCH_MAX_LENGTH}`, placeholder «Nombre o CIF») y un
  `Checkbox` «Mostrar dados de baja», como `ProductFilters`. Comprobar que T013 pasa.
- [X] T024 [US1] Crear `apps/client/src/pages/SuppliersPage.tsx` y `SuppliersPage.module.css`:
  - cabecera con h1 «Proveedores» y el contador en Mono: «N activos» / «1 activo» (el texto «N proveedores» con
    el filtro llega en US2);
  - `SupplierFilters` y, dentro de un panel, `SuppliersTable` con `items`;
  - al montar, despacha `loadSuppliers({ includeInactive: false, page: 1 })`. US2 sustituye esta llamada por
    los criterios de la dirección.
  Comprobar que T014 pasa. Depende de T020, T022–T023.
- [X] T025 [US1] Añadir la ruta en `apps/client/src/routes/AppRouter.tsx`, dentro de los hijos de `AppLayout`:
  `{ path: 'proveedores', element: <RequireAuth module="proveedores"><SuppliersPage /></RequireAuth> }`.
  Depende de T024.
- [X] T026 [US1] Ajustar `e2e/navigation.spec.ts` a Proveedores implementado:
  - «Menú de navegación»: `'Proveedores'` sin «Pendiente» en la lista de enlaces y comentario actualizado;
  - «Módulos pendientes»: el pendiente de ejemplo pasa a ser Cobros (`/cobros`), con el comentario actualizado.
  Ejecutar `npm run test:e2e -- suppliers navigation` y comprobar que T015 pasa.

**Checkpoint**: US1 funcional. Proveedores se abre desde el menú y por dirección, el servidor responde vacío con
validación y permisos, y Proveedores se puede elegir como pantalla de inicio.

---

## Phase 4: User Story 2 - Entender que los proveedores aún no están cargados (Priority: P1)

**Goal**: con el listado vacío se ve el aviso «Todavía no hay proveedores · Los proveedores se cargarán desde el
sistema anterior.». La búsqueda, el filtro de bajas y la página viven en la dirección de la pantalla y piden el
listado de nuevo:
- la búsqueda, 300 ms después de la última tecla (dirección con `replace`);
- el filtro, al momento (dirección con `push`) y con el contador «N proveedores»;
- solo se muestra la última respuesta;
- un valor no válido en la dirección se sustituye por el de por defecto, sin error.

Mientras carga, se indica sin mostrar todavía el aviso.

**Independent Test**: abrir Proveedores y ver el aviso. Buscar «levante» genera una sola petición con
`q=levante` y la dirección cambia. Marcar el filtro pide el listado con `includeInactive=true`, el contador pasa
a «0 proveedores» y «Atrás» lo desmarca. `/proveedores?page=abc&q=&includeInactive=si` se normaliza a
`/proveedores` (quickstart §3.3–§3.7).

**Depende de**: US1 (pantalla, slice y ruta).

### Tests de US2 (primero, deben fallar) ⚠️

- [X] T027 [P] [US2] Crear `apps/client/src/features/suppliers/supplierCriteria.test.ts`:
  - `parseSupplierCriteria(new URLSearchParams(''))` → `{ includeInactive: false, page: 1 }`;
  - con `q=%20levante%20&includeInactive=true&page=2` → `{ q: 'levante', includeInactive: true, page: 2 }`;
  - valores no válidos se ignoran y quedan por defecto: `q` de 101 caracteres, `q=%20%20`, `page=0`,
    `page=-1`, `page=abc`, `includeInactive=si` e `includeInactive=1`;
  - parámetros ajenos (`lowStock=true`) se ignoran;
  - `serializeSupplierCriteria` omite los valores por defecto (`{ includeInactive: false, page: 1 }` → `''`) y
    es la inversa de `parseSupplierCriteria` para criterios válidos.
- [X] T028 [P] [US2] Ampliar `apps/client/src/features/suppliers/suppliersSlice.test.ts`:
  - un `fulfilled` cuyo `meta.requestId` no es el último `requestId` se ignora;
  - un `pending` posterior sustituye `requestId`.
- [X] T029 [P] [US2] Crear `apps/client/src/features/suppliers/components/SuppliersListStatus.test.tsx` (casos
  de US2):
  - con `status: 'loading'` muestra «Cargando proveedores…» con `role="status"` y no muestra el aviso ni el
    error;
  - con `status: 'succeeded'` y `total: 0` muestra el `EmptyState` «Todavía no hay proveedores» / «Los
    proveedores se cargarán desde el sistema anterior.»;
  - con `succeeded` y elementos no muestra nada.
- [X] T030 [P] [US2] Ampliar `apps/client/src/pages/SuppliersPage.test.tsx` (con `createMemoryRouter` e
  `initialEntries`):
  - con `/proveedores` se ve el aviso y no se ve paginación;
  - con `/proveedores?q=levante` el campo muestra el valor y `fetchSuppliers` recibe
    `{ q: 'levante', includeInactive: false, page: 1 }`;
  - teclear «café» con temporizadores falsos llama a `fetchSuppliers` una sola vez, 300 ms después de la última
    tecla, y la dirección pasa a `?q=caf%C3%A9`;
  - marcar «Mostrar dados de baja» llama al momento a `fetchSuppliers` con `includeInactive: true` y `page: 1`,
    la dirección pasa a `?includeInactive=true` como entrada nueva del historial (volver atrás la desmarca), el
    contador dice «0 proveedores» y el aviso no cambia;
  - con `/proveedores?page=abc&q=&includeInactive=si` la dirección se normaliza a `/proveedores`, sin error;
  - con `/proveedores?q=levante&page=2` la dirección conserva `page=2` y `fetchSuppliers` recibe `page: 2`
    (montar no reescribe la dirección); teclear otra búsqueda o marcar el filtro vuelve a `page: 1`;
  - con la dirección cambiada desde fuera (navegar a `/proveedores?q=bar&includeInactive=true`), el campo y la
    casilla se resincronizan y el valor con debounce anterior no deshace la navegación.
- [X] T031 [P] [US2] Ampliar `e2e/suppliers.spec.ts` (US2):
  - se ve el aviso de proveedores pendientes;
  - al escribir «levante» se hace una petición `GET /api/suppliers?q=levante` (`page.waitForRequest`) y la
    dirección cambia;
  - al marcar «Mostrar dados de baja» se hace la petición con `includeInactive=true`, se ve «0 proveedores» y
    `page.goBack()` desmarca la casilla;
  - recargar mantiene la búsqueda y la casilla;
  - `/proveedores?page=abc&includeInactive=si` se normaliza a `/proveedores` y muestra el aviso.

### Implementación de US2

- [X] T032 [P] [US2] Crear `apps/client/src/features/suppliers/supplierCriteria.ts` con
  `DEFAULT_SUPPLIER_CRITERIA = { includeInactive: false, page: 1 }`,
  `parseSupplierCriteria(params: URLSearchParams): SupplierListQuery` (recorta `q`, lo descarta si queda vacío o
  pasa de `SUPPLIER_SEARCH_MAX_LENGTH`; `includeInactive` solo si es exactamente `'true'`; `page` entero ≥ 1 o
  1) y `serializeSupplierCriteria(query): URLSearchParams` (omite los valores por defecto), con la forma de
  `features/products/productCriteria.ts`. Comprobar que T027 pasa.
- [X] T033 [P] [US2] En `apps/client/src/features/suppliers/suppliersSlice.ts`, guardar `requestId` en `pending`
  e ignorar `fulfilled` y `rejected` de peticiones que no son la última (research R9). Comprobar que T028 pasa.
- [X] T034 [P] [US2] Crear `apps/client/src/features/suppliers/components/SuppliersListStatus.tsx` y
  `SuppliersListStatus.module.css`, que según `status` y `total` muestran el estado de carga («Cargando
  proveedores…», `role="status"`) o el `EmptyState` con los textos del aviso. El caso `failed` llega en US3.
  Comprobar que T029 pasa.
- [X] T035 [US2] Conectar `apps/client/src/pages/SuppliersPage.tsx` con la dirección (research R8, R9), como
  `ProductsPage.tsx`:
  - leer los criterios con `useSearchParams` + `parseSupplierCriteria` y normalizar la dirección con `replace`
    si no coincide con `serializeSupplierCriteria`;
  - estado local del campo + `useDebouncedValue(…, 300)`; al estabilizarse, escribir `q` con `replace` y volver
    a la página 1, **solo si el valor con debounce ≠ `criteria.q`**;
  - la casilla escribe `includeInactive` con `replace: false` (entrada nueva del historial) y vuelve a la
    página 1, como `onLowStockChange` en `ProductsPage`;
  - resincronizar el campo con `criteria.q` cuando la dirección cambie desde fuera;
  - contador: «N activos» / «1 activo» sin el filtro y «N proveedores» / «1 proveedor» con él (FR-004a);
  - un efecto despacha `loadSuppliers(criteria)` cuando cambian los criterios y llama a `abort()` sobre la
    promesa anterior;
  - `SuppliersListStatus` bajo las cabeceras, dentro del panel; tabla con `aria-busy` mientras carga; sin
    paginación con 0 elementos;
  - extraer a hooks o funciones auxiliares (`useSupplierCriteria`, `useLoadSuppliers`, `supplierCountLabel`)
    para no pasar de 40 líneas.
  Comprobar que T030 pasa. Depende de T032–T034.
- [X] T036 [US2] En `docs/design/README.md` › Componentes (FR-017, FR-018):
  - añadir a `EmptyState` su uso en Proveedores («Todavía no hay proveedores · Los proveedores se cargarán desde
    el sistema anterior.», 009);
  - documentar el filtro «Mostrar dados de baja» (mismo `Checkbox` que «Solo stock bajo», desmarcado por
    defecto), el sello «Baja» (sello `neutral`) y el placeholder «Nombre o CIF», con la nota *Aún no está en el
    lienzo publicado*;
  - en la tabla de Pantallas, añadir a Proveedores la nota de qué está implementado (listado provisional).
  Ejecutar `npm run test:e2e -- suppliers` y comprobar que T031 pasa.

**Checkpoint**: US1 y US2 funcionan. Aviso de proveedores pendientes, criterios en la dirección, filtro de
bajas y una petición por pausa al teclear.

---

## Phase 5: User Story 3 - Distinguir un error del listado vacío (Priority: P2)

**Goal**: si el servidor no responde o devuelve un error, se ve «No se ha podido cargar el listado de
proveedores.» con «Reintentar», distinto del aviso y sin detalles técnicos. «Reintentar» vuelve a pedir el
listado con los mismos criterios.

**Independent Test**: con el servidor detenido o con `/api/suppliers` interceptado para devolver un error, se
ve el mensaje de error (no el aviso). «Reintentar» con el servidor disponible muestra el aviso (quickstart
§3.8).

**Depende de**: US2 (`SuppliersListStatus` y la página conectada a la dirección).

### Tests de US3 (primero, deben fallar) ⚠️

- [X] T037 [P] [US3] Ampliar `apps/client/src/features/suppliers/suppliersSlice.test.ts`:
  `loadSuppliers.rejected` (sin respuesta y con un envelope de error del servidor) → `status: 'failed'` y
  `error === SUPPLIERS_LOAD_ERROR_MESSAGE` («No se ha podido cargar el listado de proveedores.»), nunca el
  mensaje del servidor; un `pending` posterior limpia `error`; un `rejected` por `abort` no cambia el estado.
- [X] T038 [P] [US3] Ampliar `apps/client/src/features/suppliers/components/SuppliersListStatus.test.tsx`:
  - con `status: 'failed'` muestra `role="alert"` con el mensaje y un botón «Reintentar», y no muestra el aviso;
  - pulsar «Reintentar» llama a `onRetry` una vez.
- [X] T039 [P] [US3] Ampliar `apps/client/src/pages/SuppliersPage.test.tsx`:
  - con `fetchSuppliers` rechazado se ve el error;
  - «Reintentar» llama de nuevo a `fetchSuppliers` con los mismos criterios de la dirección (incluido
    `includeInactive`) y, si resuelve, se ve el aviso.
- [X] T040 [P] [US3] Ampliar `e2e/suppliers.spec.ts` (US3): con `page.route('**/api/suppliers**', …)`
  respondiendo 500 se ve el error y no el aviso; tras `page.unroute`, «Reintentar» muestra el aviso.

### Implementación de US3

- [X] T041 [P] [US3] En `apps/client/src/features/suppliers/suppliersSlice.ts`, definir y exportar
  `SUPPLIERS_LOAD_ERROR_MESSAGE`. En `rejected` (solo de la última petición, sin contar los `abort`), guardar
  `status: 'failed'` y ese mensaje; en `pending`, limpiar `error`. Comprobar que T037 pasa.
- [X] T042 [P] [US3] Añadir el caso `failed` a
  `apps/client/src/features/suppliers/components/SuppliersListStatus.tsx`: `Alert variant="error"` con el
  mensaje y un `Button` secundario «Reintentar» (prop `onRetry`). Comprobar que T038 pasa.
- [X] T043 [US3] En `apps/client/src/pages/SuppliersPage.tsx`, pasar `onRetry`, que vuelve a despachar
  `loadSuppliers` con los criterios actuales. Comprobar que T039 pasa. Depende de T041–T042.
- [X] T044 [US3] En `docs/design/README.md`, añadir a «Error de un listado» su uso en Proveedores («No se ha
  podido cargar el listado de proveedores.», 009). Ejecutar `npm run test:e2e -- suppliers` y comprobar que
  T040 pasa.

**Checkpoint**: las tres historias funcionan; un error nunca se confunde con el listado vacío.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T045 [P] Revisar la pantalla con `playwright-cli` a 390 px y 1440 px, en claro y en oscuro, y con
  densidad Cómoda y Compacta (FR-015):
  - orden del teclado (búsqueda → casilla → «Reintentar») y foco visible;
  - avisos anunciados (`status` / `alert`);
  - objetivos de 44 px (incluida la etiqueta de la casilla) y contraste de 4.5:1;
  - «Plazo» oculta en móvil y sin scroll horizontal de la página.
- [X] T046 [P] Comprobar que `/api-docs` muestra `GET /suppliers` con `q`, `includeInactive` y `page`,
  `SupplierListPage` y las respuestas 400/401/403, comparando el spec de `buildSwaggerSpec()` con
  `contracts/suppliers-api.openapi.yaml`.
- [X] T047 [P] Revisar que ningún fichero de `apps/server/src/modules/suppliers/` importa Mongoose, que no se ha
  modificado código de producción de 006 ni de 007 y que ninguna función nueva pasa de 40 líneas efectivas
  (principios IV y V).
- [ ] T048 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde. Validar a mano
  quickstart.md completo en web (§3) y en escritorio (§4: `npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de US1 (`SuppliersPage`, `suppliersSlice` y la ruta).
- **US3 (Phase 5)**: depende de US2 (`SuppliersListStatus` y la página conectada a la dirección).
- **Polish (Phase 6)**: después de las historias que se vayan a entregar.

### Within Each User Story

- Tests primero (deben fallar), después la implementación.
- Servidor: validation → service → controller → routes → app.ts.
- Cliente: api → slice → componentes → página → ruta.

### Parallel Opportunities

- Foundational: T002 y T003 en paralelo → T004.
- US1: tests T005–T015 en paralelo. Servidor (T016 → T017) en paralelo con el cliente (T018 → T020; T021 y T023
  en paralelo; T022 tras T021 → T024 → T025). T019 en cualquier momento tras T007/T008.
- US2: tests T027–T031 en paralelo; T032, T033 y T034 en paralelo → T035 → T036.
- US3: tests T037–T040 en paralelo; T041 y T042 en paralelo → T043 → T044.
- Polish: T045–T047 en paralelo.

---

## Parallel Example: User Story 1

```text
Tests a la vez:
  T005 supplier.service.test   T006 supplier.routes.test   T007 modules.test   T008 tests pendientes (x4)
  T009 suppliersSlice.test     T010 suppliersApi.test      T011 formatLeadTime.test
  T012 SuppliersTable.test     T013 SupplierFilters.test   T014 SuppliersPage.test   T015 e2e/suppliers.spec
Implementación:
  Servidor: T016 validation + service + controller → T017 routes + app.ts
  Cliente:  T018 api → T020 slice │ T021 formatLeadTime → T022 SuppliersTable │ T023 SupplierFilters
            T024 página → T025 ruta
  T019 modules.ts → T026 e2e ajustado
```

## Parallel Example: User Story 2

```text
Tests:          T027 supplierCriteria | T028 slice | T029 SuppliersListStatus | T030 SuppliersPage | T031 e2e
Implementación: T032 supplierCriteria | T033 slice | T034 SuppliersListStatus  →  T035 SuppliersPage
                →  T036 README + e2e
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (tipos y constantes en shared).
2. Phase 3 (US1): endpoint con permisos y validación, pantalla con su estructura, módulo implementado.
3. **Parar y validar**: quickstart §3.1, §3.2, §3.10–§3.12, §3.14 y §3.15.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → pantalla accesible y contrato del listado fijado (MVP).
3. US2 → aviso de proveedores pendientes, criterios y filtro de bajas en la dirección, y debounce.
4. US3 → error distinguible con «Reintentar».
5. Polish → accesibilidad, Swagger y validación completa.

### Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Hacer commit al terminar cada fase (Conventional Commits en español, prefijo `(009)`).
- Al lanzar `/speckit-implement`, pasar a «En curso» en Jira la fase y las subtareas que se vayan a
  implementar (CLAUDE.md › Flujos habituales), si ya existe `specs/009-suppliers-placeholder/jira-mapping.json`.
- Deuda anotada (plan › Complexity Tracking): tercer listado con `ListStatus`, criterios y slice duplicados; se
  propone una spec técnica aparte para generalizarlos.
