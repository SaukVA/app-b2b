---

description: "Task list for feature 006-products-placeholder"
---

# Tasks: Pantalla provisional de Productos

**Input**: Design documents from `/specs/006-products-placeholder/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/products-api.openapi.yaml,
contracts/products-ui.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige:
- tests de servicio y de rutas del módulo `products` (supertest + mongodb-memory-server);
- tests unitarios en `packages/shared` y `apps/client`;
- tests propios de los genéricos nuevos (`EmptyState`, `useDebouncedValue`).

El E2E de Playwright (ADR 0004) cubre la pantalla de principio a fin. En cada fase los tests se escriben
primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de cada fase se
muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución por
prioridad: US1 → US2 (P1) → US3 (P2).

**Reglas transversales** (aplican a todas las tareas):
- **Sin base de datos** (FR-010, research R3): el módulo `products` NEVER importa Mongoose ni crea
  `product.model.ts`. `listProducts` devuelve `{ items: [], total: 0, page, pageSize: PRODUCTS_PAGE_SIZE }`.
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40, anidamiento
  ≤2 y early returns.
- **Genéricos sin negocio** (principio VIII): `EmptyState` y `useDebouncedValue` no importan `@app/shared`, ni
  el store, ni textos de productos; todo les llega por props o argumentos.
- **Sin llamadas a la API desde componentes**: solo `productsApi.ts`, invocado desde los thunks de
  `productsSlice.ts` (ADR 0001).
- **Criterios en la dirección** (FR-008a, research R6): la fuente de verdad de los criterios es la query de
  `/productos`. El slice NEVER los guarda.
- **Importes y cantidades** (CLAUDE.md): el precio con `<UserMoney>`; stock y mínimo como cifras Mono, nunca
  con `UserMoney`.
- **Estilos**: tokens de `apps/client/src/styles/tokens.css`; corte `@media (max-width: 759px)`; objetivo
  táctil de 44 px.
- **Dependencias**: ninguna nueva (research R12).
- **Columna del código**: se rotula «Código», no «CIF» como en el lienzo (plan › Notas de diseño).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: entorno de trabajo

- [X] T001 Comprobar que la rama activa es `006-products-placeholder`, que `.specify/feature.json` apunta a
  `specs/006-products-placeholder` y que `npm test --workspaces` y `npm run lint` están en verde antes de
  empezar (línea base).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos y reglas compartidos del listado (data-model.md), que usan servidor y cliente en todas las
historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Tests de Foundational (primero, deben fallar) ⚠️

- [X] T002 [P] Crear `packages/shared/src/constants/products.test.ts`:
  - `productStatus(0, 10)` → `'Sin stock'`; `productStatus(0, 0)` → `'Sin stock'`;
    `productStatus(3, 10)` → `'Stock bajo'`; `productStatus(10, 10)` → `'Disponible'`;
    `productStatus(140, 80)` → `'Disponible'` (FR-011a: «Sin stock si el stock es 0; Stock bajo si el stock es
    mayor que 0 y menor que el mínimo; Disponible en el resto»).
  - `PRODUCT_SEARCH_MAX_LENGTH === 100`, `PRODUCTS_PAGE_SIZE === 10`.
  - `PRODUCT_FILTER_ID_PATTERN` (`/^[A-Za-z0-9_-]{1,64}$/`) acepta `alimentacion`, `prov-12`, `A_1` y rechaza
    `''`, `'a b'`, `'ñ'` y un texto de 65 caracteres.
  - `PRODUCT_STATUSES` es `['Disponible', 'Stock bajo', 'Sin stock']`.

### Implementación de Foundational

- [X] T003 [P] Añadir a `packages/shared/src/types/api.ts` el genérico
  `ListPage<T> { items: T[]; total: number; page: number; pageSize: number }` con un comentario que lo
  describa como página de cualquier listado (lo reutilizará 007).
- [X] T004 [P] Crear `packages/shared/src/types/product.ts` con:
  - `ProductStatus = 'Disponible' | 'Stock bajo' | 'Sin stock'`;
  - `ProductListItem` con `id`, `code`, `name`, `supplierName: string | null`, `category`,
    `subcategory: string | null`, `stock` (entero ≥ 0, cantidad), `minStock` (entero ≥ 0, cantidad),
    `price` (euros con 2 decimales) y `status: ProductStatus`;
  - `ProductListQuery` con `q?`, `category?`, `subcategory?`, `supplier?`, `lowStock: boolean`, `page: number`.
- [X] T005 Crear `packages/shared/src/constants/products.ts` con `PRODUCT_SEARCH_MAX_LENGTH = 100`,
  `PRODUCTS_PAGE_SIZE = 10`, `PRODUCT_FILTER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/`, `PRODUCT_STATUSES` y
  `productStatus(stock, minStock): ProductStatus` según FR-011a. Depende de T004.
- [X] T006 Exportar desde `packages/shared/src/index.ts` `ListPage`, `ProductStatus`, `ProductListItem`,
  `ProductListQuery` y `export * from './constants/products'`. Ejecutar `npm test --workspace=packages/shared`
  y comprobar que T002 pasa. Depende de T003–T005.

**Checkpoint**: tipos y regla de estado disponibles en `@app/shared`.

---

## Phase 3: User Story 1 - Abrir Productos y ver su estructura (Priority: P1) 🎯 MVP

**Goal**: Productos es un módulo implementado. Los roles con acceso lo abren desde el menú y ven el título, el
número de referencias, la búsqueda, los filtros y las cabeceras del listado. La pantalla pide el listado al
servidor, que exige sesión y permiso, valida los criterios y responde vacío.

**Independent Test**: con Almacén (editar) y Comercial (solo ver), pulsar Productos en el menú: se abre
`/productos` con su estructura y se hace `GET /api/products`. Un rol sin acceso no ve Productos y recibe 403 del
servidor (quickstart §3.1, §3.2, §3.10, §3.12, §3.13).

### Tests de US1 (primero, deben fallar) ⚠️

- [ ] T007 [P] [US1] Crear `apps/server/src/modules/products/product.service.test.ts`: `listProducts` con
  `{ lowStock: false, page: 1 }` y con todos los criterios rellenos devuelve
  `{ items: [], total: 0, page, pageSize: 10 }` (la `page` pedida, p. ej. 3). Comprobar que el servicio no
  importa Mongoose (p. ej. `jest.isolateModules` + `jest.doMock('mongoose', () => { throw … })`).
- [ ] T008 [P] [US1] Crear `apps/server/src/modules/products/product.routes.test.ts` con `startTestDb`,
  `clearTestDb` y `stopTestDb` (`apps/server/src/utils/testDb.ts`) y los helpers de login de
  `apps/server/src/modules/users/user.routes.test.ts` como referencia:
  - 200 `{ success: true, data: { items: [], total: 0, page: 1, pageSize: 10 } }` para Administrador, Almacén,
    Comercial y Administración;
  - 401 `AUTH_UNAUTHENTICATED` sin token;
  - 403 `AUTH_FORBIDDEN` con un rol creado en la prueba con `productos: 'none'` (los cuatro roles sembrados
    ven Productos);
  - 400 `VALIDATION_ERROR` con `q` de 101 caracteres, `page=0`, `page=abc`, `category=a%20b`,
    `supplier=` + 65 caracteres y `lowStock=yes`;
  - 200 vacío con `category=no-existe` (bien formado e inexistente, FR-009), con `q=%20%20aceite%20` y con
    `q=%20%20%20` (solo espacios = sin búsqueda), con `page=3` (devuelve `page: 3`) y con un parámetro
    desconocido `foo=bar` (se ignora).
- [ ] T009 [P] [US1] Ajustar `packages/shared/src/constants/modules.test.ts`: `IMPLEMENTED_MODULES` es
  `['ajustes', 'productos']`; `isModuleImplemented('productos')` es `true`; la lista de pendientes pasa a
  `['ventas', 'clientes', 'proveedores', 'cobros']`.
- [ ] T010 [P] [US1] Ajustar los tests que dependen de que Productos esté pendiente:
  - `apps/server/src/modules/preferences/preferences.pendingModules.test.ts` y
    `apps/client/src/features/preferences/components/AppearanceForm.pendingModules.test.tsx`: usar
    Proveedores como módulo pendiente de ejemplo. Si alguno deja de tener sentido porque ya hay una pantalla
    implementada, adaptar la aserción (p. ej. «Pantalla de inicio» ofrece solo Productos);
  - `apps/client/src/features/navigation/navItems.test.ts` («con la lista real…»): Productos pasa a
    `pending: false`;
  - `apps/client/src/routes/homeRoute.test.ts` (bloque «lista real, 005»): un rol que ve Productos aterriza
    en `/productos`; un rol sin Productos sigue yendo a Ajustes › Apariencia;
  - solo título o comentario desfasados: `packages/shared/src/constants/preferences.test.ts` («todas están
    pendientes») y `apps/client/src/features/navigation/components/AppNav.test.tsx` (comentario de la
    línea de «Pendiente»).
  Tras T021, ejecutar `npm test --workspaces` y ajustar cualquier otro caso que use la lista real.
- [ ] T011 [P] [US1] Crear `apps/client/src/features/products/productsSlice.test.ts` (casos de US1):
  - estado inicial `{ items: [], total: 0, status: 'idle', error: null, requestId: null }`;
  - `loadProducts.pending` → `status: 'loading'`;
  - `loadProducts.fulfilled` con `{ items: [], total: 0, … }` → `status: 'succeeded'`, `total: 0`.
- [ ] T011a [P] [US1] Crear `apps/client/src/features/products/productsApi.test.ts` con `httpClient` simulado:
  - `{ lowStock: false, page: 1 }` → `GET /products` con `params` vacío;
  - `{ q: 'aceite', lowStock: true, page: 2 }` → `params` con los tres valores;
  - devuelve el `data` del envelope.
- [ ] T012 [P] [US1] Crear `apps/client/src/features/products/components/ProductsTable.test.tsx`:
  - con `rows=[]`: tabla con `caption` «Productos» y cabeceras Código, Producto, Categoría, Stock, Precio y
    Estado; sin cabecera de acciones; sin filas;
  - con una fila de ejemplo: nombre y proveedor, `Alimentación › Aceites`, `12 / mín. 40`, precio formateado
    por `UserMoney` y sello «Stock bajo» con tono `warning` (`data-tone`);
  - una fila `Sin stock` tiene tono `danger` y una `Disponible`, `ok`.
- [ ] T013 [P] [US1] Crear `apps/client/src/features/products/components/ProductFilters.test.tsx` (estructura):
  - región `role="search"` con nombre «Filtrar productos»;
  - campo «Buscar» de tipo `search` con `maxLength` 100;
  - `Select` Categoría y Subcategoría con una sola opción «Todas»; Proveedor con una sola opción «Todos»;
  - casilla «Solo stock bajo».
- [ ] T014 [P] [US1] Crear `apps/client/src/pages/ProductsPage.test.tsx` (casos de US1), con la store de
  `setupStore` y `fetchProducts` simulado (`jest.mock('../features/products/productsApi')`):
  - h1 «Productos» y «0 referencias» tras resolver la petición;
  - sin botones «Importar CSV» ni «Nuevo producto»;
  - al montar llama a `fetchProducts` una vez con `{ lowStock: false, page: 1 }`.
- [ ] T015 [P] [US1] Crear `e2e/products.spec.ts` (US1), con un helper `loginAsAdmin` como el de
  `e2e/navigation.spec.ts`:
  - tras el login aterriza en `/productos`;
  - en el menú «Productos» es un enlace sin «Pendiente» y con `aria-current="page"`;
  - se ven el h1, «0 referencias», los filtros y las cabeceras del listado (en móvil, las tarjetas no tienen
    filas; comprobar solo filtros y título);
  - en Ajustes › Apariencia, «Pantalla de inicio» ofrece «Productos»;
  - un usuario Comercial (solo ver), creado con `seedUsers` de `e2e/support/db.ts` como en
    `e2e/appearance.spec.ts`, ve la misma pantalla que el Administrador (FR-003).

### Implementación de US1

- [ ] T016 [US1] Crear `apps/server/src/modules/products/product.validation.ts` con `productListQuerySchema`
  (zod, research R2):
  - `q`: `z.string().trim().max(PRODUCT_SEARCH_MAX_LENGTH)` y vacío → `undefined`;
  - `category`, `subcategory`, `supplier`: `z.string().regex(PRODUCT_FILTER_ID_PATTERN).optional()`;
  - `lowStock`: `z.enum(['true', 'false']).default('false')` transformado a booleano;
  - `page`: `z.coerce.number().int().min(1).default(1)`;
  - objeto sin `.strict()` (los parámetros desconocidos se descartan).
  Exportar `type ProductListQueryInput`.
- [ ] T017 [US1] Crear `apps/server/src/modules/products/product.service.ts` con
  `listProducts(criteria: ProductListQuery): Promise<ListPage<ProductListItem>>`, que devuelve
  `{ items: [], total: 0, page: criteria.page, pageSize: PRODUCTS_PAGE_SIZE }`, sin importar Mongoose. Añadir
  un comentario que explique que es provisional hasta la migración del catálogo (FR-010). Depende de T016.
- [ ] T018 [US1] Crear `apps/server/src/modules/products/product.controller.ts` con
  `productController.list`, que lee `req.query as ProductListQueryInput`, llama a `listProducts` y responde con
  `sendSuccess<ListPage<ProductListItem>>`. Depende de T017.
- [ ] T019 [US1] Crear `apps/server/src/modules/products/product.routes.ts`:
  - `productRouter.use(requireAuth, requirePermission('productos', 'view'))`;
  - `productRouter.get('/', validate({ query: productListQuerySchema }), productController.list)`;
  - bloque JSDoc `@openapi` equivalente a `contracts/products-api.openapi.yaml`: tag `Products`, parámetros,
    esquemas `ProductStatus`, `ProductListItem`, `ProductListPage` y `FilterId`, y respuestas 200/400/401/403.
    Reutilizar `SuccessEnvelope`, `ErrorEnvelope`, `Unauthenticated`, `Forbidden` y `ValidationError` si ya
    existen en otros bloques.
  Depende de T018.
- [ ] T020 [US1] Montar la ruta en `apps/server/src/app.ts`:
  `app.use('/api/products', productRouter)`, después de `/api/preferences`. Ejecutar
  `npm test --workspace=apps/server -- products` y comprobar que T007 y T008 pasan. Depende de T019.
- [ ] T021 [US1] Añadir `'productos'` a `IMPLEMENTED_MODULES` en `packages/shared/src/constants/modules.ts`
  (convención de CLAUDE.md). Comprobar que T009 y T010 pasan.
- [ ] T022 [P] [US1] Crear `apps/client/src/features/products/productsApi.ts` con
  `fetchProducts(query: ProductListQuery): Promise<ListPage<ProductListItem>>`
  (`httpClient.get('/products', { params })`). En `params` se omiten los valores por defecto
  (`lowStock: false`, `page: 1`) y los criterios ausentes. Comprobar que T011a pasa.
- [ ] T023 [US1] Crear `apps/client/src/features/products/productsSlice.ts` con el estado de data-model.md
  (`items`, `total`, `status`, `error`, `requestId`) y el thunk `loadProducts(query)` sobre `fetchProducts`.
  Registrar `products: productsReducer` en `apps/client/src/store/store.ts`. Comprobar que T011 pasa.
  Depende de T022.
- [ ] T024 [P] [US1] Crear `apps/client/src/features/products/components/ProductsTable.tsx`, que compone
  `Table` con las columnas de contracts/products-ui.md §Estructura:
  - Producto: nombre con el proveedor debajo;
  - Categoría: `categoría › subcategoría`;
  - Stock: `stock / mín. minStock` en Mono, alineado a la derecha;
  - Precio: `UserMoney`, alineado a la derecha;
  - Estado: `StatusStamp`, con el tono por estado (Disponible `ok`, Stock bajo `warning`, Sin stock
    `danger`).
  Añadir `renderCard` para móvil según `ProductosMovil.dc.html`. Comprobar que T012 pasa.
- [ ] T025 [P] [US1] Crear `apps/client/src/features/products/components/ProductFilters.tsx` y
  `ProductFilters.module.css`:
  - componente controlado con props `search`, `lowStock`, `onSearchChange` y `onLowStockChange`;
  - compone `TextField` (`type="search"`, `maxLength={PRODUCT_SEARCH_MAX_LENGTH}`, placeholder «Código o
    nombre»), tres `Select` con solo la opción por defecto (valor `''`) y `Checkbox`, dentro de
    `<div role="search" aria-label="Filtrar productos">`;
  - en estrecho, filtros apilados.
  Comprobar que T013 pasa.
- [ ] T026 [US1] Crear `apps/client/src/pages/ProductsPage.tsx` y `ProductsPage.module.css`:
  - cabecera con h1 «Productos» y «{total} referencias» (Mono);
  - `ProductFilters` y, dentro de un panel, `ProductsTable` con `items`;
  - al montar, despacha `loadProducts({ lowStock: false, page: 1 })`. US2 sustituye esta llamada por los
    criterios de la dirección.
  Comprobar que T014 pasa. Depende de T023–T025.
- [ ] T027 [US1] Añadir la ruta en `apps/client/src/routes/AppRouter.tsx`, dentro de los hijos de
  `AppLayout`:
  `{ path: 'productos', element: <RequireAuth module="productos"><ProductsPage /></RequireAuth> }`. Actualizar
  el comentario de la lista de rutas si hace falta. El bloqueo por rol sin acceso (menú y dirección) ya lo
  cubren `RequireAuth.test.tsx` y `navItems.test.ts` (005); no se duplica. Depende de T026.
- [ ] T028 [US1] Ajustar `e2e/navigation.spec.ts` y `e2e/smoke.spec.ts` a Productos implementado:
  - el menú muestra Productos sin «Pendiente»;
  - el módulo pendiente de ejemplo de «Módulos pendientes» pasa a ser otro (p. ej. Proveedores);
  - tras el login, el Administrador aterriza en `/productos` y no en Apariencia.
  Ejecutar `npm run test:e2e -- products navigation smoke` y comprobar que T015 pasa.

**Checkpoint**: US1 funcional. Productos se abre desde el menú y por dirección, el servidor responde vacío con
validación y permisos, y Productos se puede elegir como pantalla de inicio.

---

## Phase 4: User Story 2 - Entender que el catálogo aún no está cargado (Priority: P1)

**Goal**: con el listado vacío se ve el aviso «Todavía no hay productos · El catálogo se cargará desde el
sistema anterior.». La búsqueda y los filtros viven en la dirección de la pantalla y piden el listado de
nuevo:
- la búsqueda, 300 ms después de la última tecla;
- solo se muestra la última respuesta.

Mientras carga, se indica sin mostrar todavía el aviso.

**Independent Test**: abrir Productos y ver el aviso. Buscar «aceite» genera una sola petición con `q=aceite`
y la dirección `/productos?q=aceite`. Marcar «Solo stock bajo» y recargar conserva los criterios. «Atrás»
vuelve a los anteriores (quickstart §3.3–§3.7).

**Depende de**: US1 (pantalla, slice y ruta).

### Tests de US2 (primero, deben fallar) ⚠️

- [ ] T029 [P] [US2] Crear `apps/client/src/hooks/useDebouncedValue.test.ts` con temporizadores falsos de
  Jest:
  - devuelve el valor inicial al momento;
  - tras cambios seguidos, solo devuelve el último cuando pasan `delay` ms (300) sin cambios;
  - limpia el temporizador al desmontar.
- [ ] T030 [P] [US2] Crear `apps/client/src/components/EmptyState.test.tsx`:
  - muestra el título y el texto;
  - el contenedor tiene `role="status"`;
  - no importa nada de `@app/shared` (comprobación por revisión, no por test).
- [ ] T031 [P] [US2] Crear `apps/client/src/features/products/productCriteria.test.ts`:
  - `parseProductCriteria(new URLSearchParams(''))` → `{ lowStock: false, page: 1 }`;
  - con `q=%20aceite%20&lowStock=true&page=2` → `q: 'aceite'`, `lowStock: true`, `page: 2`;
  - `category`, `subcategory` y `supplier` se ignoran aunque sean válidos (`category=alimentacion` →
    `{ lowStock: false, page: 1 }`, sin `category`), FR-008a;
  - valores no válidos se ignoran y quedan por defecto: `q` de 101 caracteres, `q=%20%20`, `lowStock=yes`,
    `page=0`, `page=-1` y `page=abc`;
  - `serializeProductCriteria` omite los valores por defecto (`{ lowStock: false, page: 1 }` → `''`) y es la
    inversa de `parseProductCriteria` para criterios válidos.
- [ ] T032 [P] [US2] Ampliar `apps/client/src/features/products/productsSlice.test.ts`:
  - un `fulfilled` cuyo `meta.requestId` no es el último `requestId` se ignora;
  - un `pending` posterior sustituye `requestId`.
- [ ] T033 [P] [US2] Crear `apps/client/src/features/products/components/ProductsListStatus.test.tsx` (casos
  de US2):
  - con `status: 'loading'` muestra «Cargando productos…» con `role="status"` y no muestra el aviso ni el
    error;
  - con `status: 'succeeded'` y `total: 0` muestra el `EmptyState` «Todavía no hay productos» / «El catálogo
    se cargará desde el sistema anterior.»;
  - con `succeeded` y elementos no muestra nada.
- [ ] T034 [P] [US2] Ampliar `apps/client/src/pages/ProductsPage.test.tsx` (con `createMemoryRouter` o
  `MemoryRouter` e `initialEntries`):
  - con `/productos` se ve el aviso y no se ve paginación;
  - con `/productos?q=aceite&lowStock=true` el campo y la casilla muestran esos valores y `fetchProducts`
    recibe `{ q: 'aceite', lowStock: true, page: 1 }`;
  - teclear «café» con temporizadores falsos llama a `fetchProducts` una sola vez, 300 ms después de la
    última tecla, y la dirección pasa a `?q=caf%C3%A9`;
  - marcar «Solo stock bajo» pide el listado con `lowStock: true` y `page: 1`;
  - con `/productos?page=0&q=` la dirección se normaliza a `/productos`;
  - con `/productos?category=alimentacion&q=aceite` la dirección se normaliza a `/productos?q=aceite` y
    `fetchProducts` no recibe `category`;
  - con `/productos?q=aceite&page=2` la dirección conserva `page=2` y `fetchProducts` recibe `page: 2`
    (montar no reescribe la dirección);
  - buscar «aceite», después «café» y volver «Atrás»: el campo muestra «aceite», `fetchProducts` recibe
    `q: 'aceite'` y la dirección no vuelve a `café` al pasar los 300 ms.
- [ ] T035 [P] [US2] Ampliar `e2e/products.spec.ts` (US2):
  - se ve el aviso de catálogo pendiente;
  - al escribir «aceite» se hace una petición `GET /api/products?q=aceite` (`page.waitForRequest`) y la
    dirección cambia;
  - marcar «Solo stock bajo» y recargar mantiene la casilla y la búsqueda;
  - `page.goBack()` vuelve a los criterios anteriores;
  - buscar «aceite», después «café» y `page.goBack()`: el campo muestra «aceite» y la dirección sigue en
    `q=aceite` pasados 300 ms.

### Implementación de US2

- [ ] T036 [P] [US2] Crear `apps/client/src/hooks/useDebouncedValue.ts`:
  `useDebouncedValue<T>(value: T, delay: number): T` con `useEffect` y `setTimeout`/`clearTimeout`. Comprobar
  que T029 pasa.
- [ ] T037 [P] [US2] Crear `apps/client/src/components/EmptyState.tsx` y `EmptyState.module.css` (contracts/
  products-ui.md §EmptyState):
  - props `title` y `children`, contenedor con `role="status"`;
  - estilo: Sans 18/600 en `--ink` para el título, 14/400 en `--ink2` para el texto, padding 32 y centrado;
  - sin color de estado.
  Comprobar que T030 pasa.
- [ ] T038 [P] [US2] Crear `apps/client/src/features/products/productCriteria.ts` con
  `parseProductCriteria(params: URLSearchParams): ProductListQuery` (valida `q` con
  `PRODUCT_SEARCH_MAX_LENGTH`, recorta `q`, descarta los valores no válidos y no lee `category`,
  `subcategory` ni `supplier` mientras no haya catálogo, FR-008a) y
  `serializeProductCriteria(query): URLSearchParams` (omite los valores por defecto). Funciones pequeñas, con
  una auxiliar por campo si hace falta. Comprobar que T031 pasa.
- [ ] T039 [US2] En `apps/client/src/features/products/productsSlice.ts`, guardar `requestId` en `pending` e
  ignorar `fulfilled` y `rejected` de peticiones que no son la última (research R7). Comprobar que T032 pasa.
- [ ] T040 [US2] Crear `apps/client/src/features/products/components/ProductsListStatus.tsx`, que según
  `status` y `total` muestra el estado de carga («Cargando productos…», `role="status"`) o el `EmptyState`
  con los textos del aviso. El caso `failed` llega en US3. Comprobar que T033 pasa. Depende de T037.
- [ ] T041 [US2] Conectar `apps/client/src/pages/ProductsPage.tsx` con la dirección (research R6, R7):
  - leer los criterios con `useSearchParams` + `parseProductCriteria` y normalizar la dirección con
    `replace` si no coincide con `serializeProductCriteria`;
  - estado local del campo de búsqueda + `useDebouncedValue(…, 300)`; al estabilizarse, escribir `q` en la
    dirección con `replace` y volver a la página 1, **solo si el valor con debounce ≠ `criteria.q`** (montar
    la pantalla no reescribe la dirección ni pierde la página);
  - resincronizar el campo local con `criteria.q` cuando la dirección cambie desde fuera («Atrás», enlace),
    para que el valor con debounce desfasado no deshaga la navegación;
  - «Solo stock bajo» escribe en la dirección con una entrada de historial nueva y vuelve a la página 1;
  - un efecto despacha `loadProducts(criteria)` cuando cambian los criterios y llama a `abort()` sobre la
    promesa anterior;
  - `ProductsListStatus` bajo las cabeceras, dentro del panel; tabla con `aria-busy` mientras carga; sin
    paginación con 0 elementos;
  - extraer a hooks auxiliares (`useProductCriteria`, `useLoadProducts`) para no pasar de 40 líneas.
  Comprobar que T034 pasa. Depende de T036, T038–T040.
- [ ] T042 [US2] Documentar `EmptyState` en `docs/design/README.md` › Componentes (anatomía, tokens y
  `role="status"`), indicando que aún no está en el lienzo publicado (FR-018). Ejecutar
  `npm run test:e2e -- products` y comprobar que T035 pasa.

**Checkpoint**: US1 y US2 funcionan. Aviso de catálogo pendiente, criterios en la dirección y una petición
por pausa al teclear.

---

## Phase 5: User Story 3 - Distinguir un error del catálogo vacío (Priority: P2)

**Goal**: si el servidor no responde o devuelve un error, se ve «No se ha podido cargar el listado de
productos.» con «Reintentar», distinto del aviso y sin detalles técnicos. «Reintentar» vuelve a pedir el
listado con los mismos criterios.

**Independent Test**: con el servidor detenido o con `/api/products` interceptado para devolver un error, se
ve el mensaje de error (no el aviso). «Reintentar» con el servidor disponible muestra el aviso (quickstart
§3.8).

**Depende de**: US2 (`ProductsListStatus` y la página conectada a la dirección).

### Tests de US3 (primero, deben fallar) ⚠️

- [ ] T043 [P] [US3] Ampliar `apps/client/src/features/products/productsSlice.test.ts`: `loadProducts.rejected`
  (sin respuesta y con un envelope de error del servidor) → `status: 'failed'` y
  `error === PRODUCTS_LOAD_ERROR_MESSAGE` («No se ha podido cargar el listado de productos.»), nunca el
  mensaje del servidor; un `pending` posterior limpia `error`.
- [ ] T044 [P] [US3] Ampliar `apps/client/src/features/products/components/ProductsListStatus.test.tsx`:
  - con `status: 'failed'` muestra `role="alert"` con el mensaje y un botón «Reintentar», y no muestra el
    aviso;
  - pulsar «Reintentar» llama a `onRetry` una vez.
- [ ] T045 [P] [US3] Ampliar `apps/client/src/pages/ProductsPage.test.tsx`:
  - con `fetchProducts` rechazado se ve el error;
  - «Reintentar» llama de nuevo a `fetchProducts` con los mismos criterios de la dirección y, si resuelve, se
    ve el aviso.
- [ ] T046 [P] [US3] Ampliar `e2e/products.spec.ts` (US3): con `page.route('**/api/products**', …)`
  respondiendo 500 se ve el error y no el aviso; tras quitar la intercepción (`page.unroute`), «Reintentar»
  muestra el aviso.

### Implementación de US3

- [ ] T047 [US3] En `apps/client/src/features/products/productsSlice.ts`, definir y exportar
  `PRODUCTS_LOAD_ERROR_MESSAGE`. En `rejected` (solo de la última petición, sin contar los `abort`), guardar
  `status: 'failed'` y ese mensaje; en `pending`, limpiar `error`. Comprobar que T043 pasa.
- [ ] T048 [US3] Añadir el caso `failed` a `apps/client/src/features/products/components/ProductsListStatus.tsx`:
  `Alert variant="error"` con el mensaje y un `Button` secundario «Reintentar» (prop `onRetry`). Comprobar
  que T044 pasa.
- [ ] T049 [US3] En `apps/client/src/pages/ProductsPage.tsx`, pasar `onRetry`, que vuelve a despachar
  `loadProducts` con los criterios actuales. Comprobar que T045 pasa. Depende de T047–T048.
- [ ] T050 [US3] Documentar en `docs/design/README.md` el estado de error de un listado (`Alert` de error +
  botón secundario «Reintentar» dentro del panel). Ejecutar `npm run test:e2e -- products` y comprobar que
  T046 pasa.

**Checkpoint**: las tres historias funcionan; un error nunca se confunde con el catálogo vacío.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T051 [P] Revisar la pantalla con `playwright-cli` a 390 px y 1440 px, en claro y en oscuro, y con
  densidad Cómoda y Compacta (FR-015, FR-016):
  - orden del teclado y foco visible;
  - avisos anunciados (`status` / `alert`);
  - objetivos de 44 px y contraste de 4.5:1;
  - sin scroll horizontal de la página.
- [ ] T052 [P] Comprobar que `/api-docs` muestra `GET /products` con sus parámetros, `ProductListPage` y las
  respuestas 400/401/403, comparando el spec de `buildSwaggerSpec()` con
  `contracts/products-api.openapi.yaml`.
- [ ] T053 [P] Revisar que ningún fichero del módulo `apps/server/src/modules/products/` importa Mongoose y que
  ninguna función nueva pasa de 40 líneas efectivas (principio IV).
- [ ] T054 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde. Validar a mano
  quickstart.md completo en web (§3) y en escritorio (§4: `npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de T001. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2 (Phase 4)**: depende de US1 (`ProductsPage`, `productsSlice` y la ruta).
- **US3 (Phase 5)**: depende de US2 (`ProductsListStatus` y la página conectada a la dirección).
- **Polish (Phase 6)**: después de las historias que se vayan a entregar.

### Within Each User Story

- Tests primero (deben fallar), después la implementación.
- Servidor: validation → service → controller → routes → app.ts.
- Cliente: api → slice → componentes → página → ruta.

### Parallel Opportunities

- Foundational: T002, T003 y T004 en paralelo; T005 → T006.
- US1: tests T007–T015 en paralelo. Servidor (T016 → T020) en paralelo con el cliente (T022 → T023;
  T024 y T025 en paralelo → T026 → T027). T021 en cualquier momento tras T009/T010.
- US2: tests T029–T035 en paralelo; T036, T037 y T038 en paralelo; T039 y T040 después; T041 al final.
- US3: tests T043–T046 en paralelo; T047 y T048 en paralelo → T049.
- Polish: T051–T053 en paralelo.

---

## Parallel Example: User Story 1

```text
Tests a la vez:
  T007 product.service.test   T008 product.routes.test   T009 modules.test   T010 pendingModules (x2)
  T011 productsSlice.test     T011a productsApi.test     T012 ProductsTable.test    T013 ProductFilters.test
  T014 ProductsPage.test      T015 e2e/products.spec
Implementación:
  Servidor: T016 validation → T017 service → T018 controller → T019 routes → T020 app.ts
  Cliente:  T022 api → T023 slice │ T024 ProductsTable │ T025 ProductFilters → T026 página → T027 ruta
  T021 modules.ts → T028 e2e ajustados
```

## Parallel Example: User Story 2

```text
Tests:          T029 useDebouncedValue | T030 EmptyState | T031 productCriteria | T032 slice
                T033 ProductsListStatus | T034 ProductsPage | T035 e2e
Implementación: T036 hook | T037 EmptyState | T038 productCriteria  →  T039 slice, T040 ListStatus
                →  T041 ProductsPage  →  T042 README + e2e
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 (tipos y regla de estado en shared).
2. Phase 3 (US1): endpoint con permisos y validación, pantalla con su estructura, módulo implementado.
3. **Parar y validar**: quickstart §3.1, §3.2, §3.10, §3.12 y §3.13.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → pantalla accesible y contrato del listado fijado (MVP).
3. US2 → aviso de catálogo pendiente, criterios en la dirección y debounce.
4. US3 → error distinguible con «Reintentar».
5. Polish → accesibilidad, Swagger y validación completa.

### Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Hacer commit al terminar cada fase (Conventional Commits en español, prefijo `(006)`).
- Al lanzar `/speckit-implement`, pasar a «En curso» en Jira la fase y las subtareas que se vayan a
  implementar (CLAUDE.md › Flujos habituales), si ya existe `specs/006-products-placeholder/jira-mapping.json`.
