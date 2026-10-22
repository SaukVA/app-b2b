# Research: Pantalla provisional de Clientes

**Feature**: `007-customers-placeholder` · **Fecha**: 2026-10-22 · **Spec**: [spec.md](spec.md)

No queda ningún `NEEDS CLARIFICATION` en el contexto técnico: el stack es el del monorepo, las dudas de producto
se cerraron en `/speckit-clarify` (sesión 2026-10-22) y 006-products-placeholder, ya en `develop`, fija el patrón
de pantalla provisional. Este documento recoge las decisiones de diseño y qué se reutiliza de 006.

## R1 · Endpoint del listado

- **Decision**: `GET /api/customers` con los criterios en la query (`q`, `page`). Responde
  `{ success: true, data: ListPage<CustomerListItem> }`.
- **Rationale**: lectura idempotente, mismo patrón que `GET /api/products` (006, R1) y `GET /api/users`; los
  criterios en la query encajan con que también vivan en la dirección de la pantalla (FR-007a).
- **Alternatives considered**: `POST /api/customers/search` (rompe la semántica de lectura con dos criterios).

## R2 · Validación de los criterios

- **Decision**: esquema zod `customerListQuerySchema` en `customer.validation.ts`, aplicado con
  `validate({ query })`:
  - `q`: texto recortado, máximo `CUSTOMER_SEARCH_MAX_LENGTH` (100); vacío tras recortar equivale a ausente.
  - `page`: entero ≥ 1, por defecto 1.
  - Parámetros desconocidos: se descartan (sin `.strict()`), igual que en 006.
- **Rationale**: FR-008 y constitución III. Copia la forma de `productListQuerySchema` sin los filtros.
- **Alternatives considered**: reutilizar `productListQuerySchema` con `.pick()` (acopla dos dominios que
  evolucionarán por separado cuando se migren los datos).

## R3 · Servicio sin base de datos

- **Decision**: `listCustomers(criteria)` en `customer.service.ts` devuelve
  `{ items: [], total: 0, page: criteria.page, pageSize: CUSTOMERS_PAGE_SIZE }` sin importar Mongoose. No se
  crea `customer.model.ts` en esta entrega.
- **Rationale**: FR-009. El modelo llegará con la spec de migración de la cartera, como en 006 (R3).
- **Alternatives considered**: modelo con colección vacía (lee la base de datos y fija un esquema prematuro).

## R4 · Permisos

- **Decision**: `customerRouter.use(requireAuth, requirePermission('clientes', 'view'))`. En el cliente, la
  ruta `/clientes` va envuelta en `<RequireAuth module="clientes">`.
- **Rationale**: matriz de 003 (Administrador y Comercial editan; Administración solo ve; Almacén sin acceso).
  `view` incluye `edit`, así que FR-003 (misma pantalla para los dos) sale gratis.
- **Alternatives considered**: ninguna razonable.

## R5 · Tipos y reglas compartidas

- **Decision**: en `packages/shared`:
  - `types/customer.ts`: `CustomerListItem`, `CustomerListQuery` y `CustomerRiskLevel`.
  - `constants/customers.ts`: `CUSTOMER_SEARCH_MAX_LENGTH = 100`, `CUSTOMERS_PAGE_SIZE = 10` (clarificación
    del 2026-10-22), `customerRiskUsed(balance, maxRisk)` y `customerRiskLevel(riskUsed)`, con sus tests.
  - Se reutiliza `ListPage<T>` de `types/api.ts` (006).
- **Rationale**: constitución VI. La regla del riesgo usado (incluido el caso sin límite) la necesitarán el
  servidor, que la calculará al migrar, y el cliente, que elige el color; vive una sola vez y probada.
- **Alternatives considered**: calcular el porcentaje solo en el cliente (el contrato FR-010 lo incluye).

## R6 · Riesgo usado y semáforo

- **Decision**:
  - `customerRiskUsed(balance, maxRisk)`: `null` si `maxRisk` es `null` o ≤ 0 (cliente sin límite,
    clarificación del 2026-10-22); si no, `Math.round(balance / maxRisk * 100)`, con mínimo 0 (un saldo a
    favor no es riesgo negativo). Puede pasar de 100 cuando el saldo supera el riesgo máximo.
  - `customerRiskLevel(riskUsed)`: `'low'` por debajo de 50, `'medium'` de 50 a menos de 80 y `'high'` desde 80
    (semáforo del README de diseño).
  - Pantalla: porcentaje en Mono más una barra de progreso del color del umbral, con el relleno limitado al
    100 %. Sin límite: texto «Sin límite», sin barra ni color.
- **Rationale**: FR-016. Los umbrales están en `docs/design/README.md` › Sellos de estado.
- **Alternatives considered**: guardar el nivel en la respuesta (redundante con la regla compartida).

## R7 · Barra de progreso genérica

- **Decision**: nuevo componente `ProgressBar` en `apps/client/src/components/` (`value` de 0 a 100, que se
  limita a ese rango; `tone` `'ok' | 'warning' | 'danger'`; `label` accesible), con `role="meter"` y
  `aria-valuenow`. El dominio traduce `CustomerRiskLevel` a `tone`.
- **Rationale**: constitución VIII. El README de diseño ya lista la «Barra de progreso (stock / riesgo)» como
  componente; no existe todavía en el código y la necesitarán Productos y Panel.
- **Alternatives considered**: barra dentro de `CustomersTable` (pieza visual genérica escondida en un dominio).

## R8 · Criterios en la dirección de la pantalla

- **Decision**: la dirección (`/clientes?q=…&page=2`) es la fuente de verdad (FR-007a). Funciones puras
  `parseCustomerCriteria` y `serializeCustomerCriteria` en `features/customers/customerCriteria.ts`, con la
  misma forma que `productCriteria.ts`: un valor no válido se ignora, se usa el de por defecto y la dirección se
  normaliza con `replace`. Teclear actualiza la dirección con `replace` tras el debounce y vuelve a la página 1.
- **Rationale**: clarificaciones del 2026-10-22 y mismo comportamiento que Productos.
- **Alternatives considered**: extraer un `listCriteria` genérico compartido con Productos (refactor de 006 que
  no pide esta spec; se puede proponer cuando haya un tercer listado).

## R9 · Debounce y peticiones obsoletas

- **Decision**: se reutiliza `useDebouncedValue` (300 ms, 006). El thunk `loadCustomers` se despacha al cambiar
  los criterios de la dirección; el efecto aborta la petición anterior y el reducer ignora las respuestas cuyo
  `requestId` no es el último, como `productsSlice`.
- **Rationale**: FR-007; sin dependencias nuevas (ADR 0001).

## R10 · Estados de la pantalla y componentes

- **Decision**:
  - Slice `customers`: `status: 'idle' | 'loading' | 'succeeded' | 'failed'`, `items`, `total`, `error`,
    `requestId`.
  - `CustomersListStatus` (dominio) con la misma lógica que `ProductsListStatus`: «Cargando clientes…»
    (`role="status"`); `EmptyState` «Todavía no hay clientes» / «La cartera se cargará desde el sistema
    anterior.»; `Alert` de error «No se ha podido cargar el listado de clientes.» con «Reintentar».
  - `CustomersTable` sobre `Table` (con `renderCard` para móvil y `status` en el panel), sin columna de acciones.
  - `CustomerSearch`: `role="search"` con un único `TextField` «Buscar».
- **Rationale**: FR-011 a FR-015 y FR-017 (reutilizar `EmptyState` y el error de listado de 006).
- **Alternatives considered**: generalizar `ProductsListStatus` a un `ListStatus` con textos por props (refactor
  de 006 fuera de alcance; anotado para cuando llegue el tercer listado).

## R11 · Módulo implementado e impacto en tests existentes

- **Decision**: `IMPLEMENTED_MODULES = ['ajustes', 'productos', 'clientes']` y ruta `clientes` dentro de
  `AppLayout` en `AppRouter`. Tests que se ajustan en el mismo cambio:
  - `packages/shared/src/constants/modules.test.ts` (espera `ajustes` y `productos`).
  - `apps/server/src/modules/preferences/preferences.pendingModules.test.ts` (usa `clientes` como pendiente con
    Comercial: pasa a `ventas`).
  - `apps/client/src/features/preferences/components/AppearanceForm.pendingModules.test.tsx` («ofrece solo
    Productos» pasa a Productos y Clientes).
  - `e2e/navigation.spec.ts` (lista de módulos y ejemplo de pendiente).
- **Rationale**: regla de 005 (FR-010) y convención de CLAUDE.md.

## R12 · Fecha del último pedido

- **Decision**: `lastOrderDate` es una fecha sin hora (`YYYY-MM-DD`) o `null`. Se muestra `DD/MM/AAAA` (como el
  lienzo) y «—» si no hay pedidos, con una función pura `formatOrderDate` en `features/customers/`.
- **Rationale**: un día de pedido no depende de la zona horaria; evita el desfase de convertir a `Date`.
- **Alternatives considered**: marca de tiempo ISO con `APP_TIME_ZONE` (como el último acceso de 003);
  innecesario para una fecha de calendario.

## R13 · Diseño, escritorio, dependencias y observabilidad

- **Decision**:
  - `docs/design/README.md`: añade a `EmptyState` y al error de listado su uso en Clientes y documenta el texto
    «Sin límite» de la columna de riesgo (FR-017). El lienzo no cambia.
  - Escritorio: sin cambios en `apps/desktop`; el backend embebido monta la misma ruta.
  - Sin dependencias nuevas y sin registro específico de las lecturas del listado.
- **Rationale**: constitución V (cambios mínimos).
