# Research: Pantalla provisional de Productos

**Feature**: `006-products-placeholder` · **Fecha**: 2026-10-21 · **Spec**: [spec.md](spec.md)

No queda ningún `NEEDS CLARIFICATION` en el contexto técnico: el stack es el del monorepo y las dudas de
producto se cerraron en `/speckit-clarify` (sesión 2026-10-21). Este documento fija las decisiones de diseño.

## R1 · Endpoint del listado

- **Decision**: `GET /api/products` con los criterios en la query (`q`, `category`, `subcategory`, `supplier`,
  `lowStock`, `page`). Responde `{ success: true, data: ListPage<ProductListItem> }`.
- **Rationale**: es una lectura idempotente y cacheable; los criterios en la query encajan con que también
  vivan en la dirección de la pantalla (FR-008a) y con el patrón REST del resto de la API (`GET /users`).
- **Alternatives considered**: `POST /api/products/search` con los criterios en el cuerpo (innecesario con
  seis criterios simples y rompe la semántica de lectura).

## R2 · Validación de los criterios

- **Decision**: esquema zod `productListQuerySchema` en `product.validation.ts`, aplicado con el middleware
  `validate({ query })` existente:
  - `q`: texto recortado, máximo `PRODUCT_SEARCH_MAX_LENGTH` (100); vacío tras recortar equivale a ausente.
  - `category`, `subcategory`, `supplier`: identificador opaco `^[A-Za-z0-9_-]{1,64}$`. Un identificador bien
    formado pero inexistente no es error (FR-009).
  - `lowStock`: `'true' | 'false'`, convertido a booleano; por defecto `false`.
  - `page`: entero ≥ 1, por defecto 1.
  - Parámetros desconocidos: se descartan (comportamiento por defecto de `z.object`), no se rechazan.
- **Rationale**: el formato de los identificadores de la base antigua todavía no se conoce; un patrón opaco
  y acotado protege el borde (constitución III) sin atarse a `ObjectId`. Descartar parámetros desconocidos
  evita romper enlaces compartidos si un día se retira un criterio.
- **Alternatives considered**: `ObjectId` de Mongo (presupone el origen de los datos); `.strict()` con
  rechazo de parámetros desconocidos (frágil para enlaces guardados).

## R3 · Servicio sin base de datos

- **Decision**: `listProducts(criteria)` en `product.service.ts` devuelve
  `{ items: [], total: 0, page: criteria.page, pageSize: PRODUCTS_PAGE_SIZE }` sin importar Mongoose. No se
  crea `product.model.ts` en esta entrega.
- **Rationale**: FR-010 prohíbe leer o escribir productos. El modelo se definirá en la spec de migración,
  cuando se conozca el origen; crear ahora un esquema vacío sería especular. La capa `model` simplemente
  todavía no existe, sin romper `routes → controller → service`.
- **Alternatives considered**: modelo Mongoose con una colección vacía (lee la base de datos y fija un
  esquema prematuro); datos de ejemplo fijos (descartado en `/speckit-detect`, D3).

## R4 · Permisos

- **Decision**: `productRouter.use(requireAuth, requirePermission('productos', 'view'))`, igual que
  `userRouter`. En el cliente, la ruta `/productos` va envuelta en `<RequireAuth module="productos">`.
- **Rationale**: reutiliza la matriz guardada en `roles` (ADR 0003) y el mismo 401/403 del resto de la API.
  `view` incluye `edit` (`can`).
- **Alternatives considered**: ninguna razonable.

## R5 · Tipos y reglas compartidas

- **Decision**: en `packages/shared`:
  - `types/api.ts`: `ListPage<T>` genérico (`items`, `total`, `page`, `pageSize`), reutilizable por 007.
  - `types/product.ts`: `ProductStatus`, `ProductListItem`, `ProductListQuery`.
  - `constants/products.ts`: `PRODUCT_SEARCH_MAX_LENGTH = 100`, `PRODUCTS_PAGE_SIZE = 10`,
    `PRODUCT_FILTER_ID_PATTERN` y `productStatus(stock, minStock)` (FR-011a), con sus tests.
- **Rationale**: constitución VI; la regla de estado la necesitarán el servidor (cuando haya datos y para el
  filtro `lowStock`) y el cliente (tono del sello), así que vive una sola vez.
- **Alternatives considered**: calcular el estado solo en el servidor y enviarlo (se envía igualmente en
  `status`, pero la regla tiene que estar definida y probada en un único sitio).

## R6 · Criterios en la dirección de la pantalla

- **Decision**: la dirección (`/productos?q=…&category=…&lowStock=true&page=2`) es la fuente de verdad de los
  criterios (FR-008a). La página los lee con `useSearchParams` y una función pura `parseProductCriteria`
  (en `features/products/productCriteria.ts`) que descarta los valores no válidos y aplica los valores por
  defecto. Cambiar un criterio reescribe la dirección (`replace` al teclear, entrada nueva de historial al
  cambiar un filtro) y vuelve a la página 1. `serializeProductCriteria` omite los valores por defecto.
- **Rationale**: recargar, «Atrás» y compartir el enlace funcionan sin estado extra; el slice no duplica los
  criterios.
- **Alternatives considered**: criterios en el slice de Redux sincronizados con la URL (dos fuentes de
  verdad).

## R7 · Debounce de la búsqueda y peticiones obsoletas

- **Decision**: el campo de búsqueda guarda su texto en estado local y lo pasa a la dirección tras 300 ms sin
  teclear, con un hook genérico `useDebouncedValue` en `apps/client/src/hooks/` (reutilizable por 007). El
  thunk `loadProducts` se despacha al cambiar los criterios de la dirección. El efecto llama a `abort()` sobre
  la promesa anterior, y el reducer ignora cualquier respuesta cuyo `requestId` no sea el último.
- **Rationale**: FR-008 exige esperar a que el usuario deje de teclear y mostrar solo la última respuesta.
  RTK ya trae `requestId` y `abort` en `createAsyncThunk` (ADR 0001), sin dependencias nuevas.
- **Alternatives considered**: RTK Query (cambia el patrón fijado en ADR 0001); lodash `debounce`
  (dependencia nueva para cuatro líneas).

## R8 · Estados de la pantalla y componentes

- **Decision**:
  - Estado del slice `products`: `status: 'idle' | 'loading' | 'succeeded' | 'failed'`, `items`, `total`,
    `error`, `requestId`.
  - **Cargando**: texto «Cargando productos…» con `role="status"`; la tabla con `aria-busy`.
  - **Vacío**: nuevo componente genérico `EmptyState` en `components/` (panel con título y texto,
    `role="status"`), que reutilizará 007. Texto: «Todavía no hay productos» / «El catálogo se cargará desde
    el sistema anterior.».
  - **Error**: `Alert variant="error"` existente con «No se ha podido cargar el listado de productos.» y un
    `Button` secundario «Reintentar» que vuelve a despachar `loadProducts` con los mismos criterios. No se
    muestra el mensaje del servidor (FR-014, sin detalles técnicos).
  - La tabla (`Table` existente) se pinta siempre con sus cabeceras; con 0 filas, el `EmptyState` va debajo,
    dentro del mismo panel. Sin paginación con el listado vacío (FR-007).
- **Rationale**: constitución VIII (reutilizar `Table`, `Alert`, `Button`, `Select`, `Checkbox`,
  `TextField`, `StatusStamp`, `UserMoney`); el estado vacío es una pieza genérica que necesitarán todos los
  listados.
- **Alternatives considered**: `Alert variant="info"` para el vacío (visualmente es un aviso, no el hueco de
  un listado; el diseño pide un estado de panel).

## R9 · Módulo implementado y pantalla de inicio

- **Decision**: `IMPLEMENTED_MODULES = ['ajustes', 'productos']` y ruta `productos` dentro de `AppLayout`
  en `AppRouter`. Al implementarse, `DEFAULT_HOME_SCREEN` (`'productos'`, 001) vuelve a ser efectiva: los
  roles que ven Productos aterrizan en `/productos` tras el login.
- **Rationale**: es la regla de 005 (FR-010) y la clarificación de 001 (Productos como inicio provisional).
- **Impacto en tests existentes** (se ajustan en el mismo cambio):
  - `packages/shared/src/constants/modules.test.ts` (hoy espera solo `ajustes`).
  - `apps/server/src/modules/preferences/preferences.pendingModules.test.ts` y
    `apps/client/src/features/preferences/components/AppearanceForm.pendingModules.test.tsx` (usan
    Productos como ejemplo de módulo pendiente: pasan a usar otro, p. ej. Proveedores).
  - `e2e/navigation.spec.ts` y `e2e/smoke.spec.ts` (destino tras el login y módulo pendiente de ejemplo).
- **Alternatives considered**: ninguna; es la convención documentada en CLAUDE.md.

## R10 · Opciones de los filtros

- **Decision**: los `Select` de categoría, subcategoría y proveedor solo tienen la opción por defecto
  («Todas»/«Todos», valor vacío). No hay endpoint de opciones en esta entrega.
- **Rationale**: clarificación del 2026-10-21 (FR-006): las opciones saldrán de los datos migrados.
- **Alternatives considered**: `GET /api/products/filters` devolviendo listas vacías (endpoint sin valor hasta
  la migración; se añadirá entonces).

## R11 · Diseño del aviso y del error

- **Decision**: `EmptyState` usa los tokens existentes (panel `surface`, borde `border`, radio 10, título
  Sans 18/600 en `ink`, texto 14/400 en `ink2`, padding 32, centrado). Se documenta en
  `docs/design/README.md` › Componentes en el mismo cambio; el lienzo se actualiza más adelante (FR-018).
- **Rationale**: clarificación del 2026-10-21.

## R12 · Escritorio, dependencias y observabilidad

- **Decision**:
  - Escritorio: sin cambios en `apps/desktop`; el backend embebido monta la misma app y la ruta nueva.
  - Sin dependencias nuevas.
  - Sin registro específico de las peticiones del listado: el servidor no registra hoy las lecturas, y no
    hay datos que auditar.
- **Rationale**: constitución V (cambios mínimos).
