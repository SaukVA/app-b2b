# Research: Pantalla provisional de Proveedores

**Feature**: `009-suppliers-placeholder` · **Fecha**: 2026-10-23 · **Spec**: [spec.md](spec.md)

No queda ningún `NEEDS CLARIFICATION` en el contexto técnico: el stack es el del monorepo, las dudas de producto
se cerraron en `/speckit-clarify` (sesión 2026-10-23) y 006 y 007, ya en `develop`, fijan el patrón de pantalla
provisional. Este documento recoge las decisiones de diseño y qué se reutiliza.

## R1 · Endpoint del listado

- **Decision**: `GET /api/suppliers` con los criterios en la query (`q`, `includeInactive`, `page`). Responde
  `{ success: true, data: ListPage<SupplierListItem> }`.
- **Rationale**: lectura idempotente, mismo patrón que `GET /api/products` y `GET /api/customers`; los criterios
  en la query encajan con que también vivan en la dirección de la pantalla (FR-007a).
- **Alternatives considered**: `POST /api/suppliers/search` (rompe la semántica de lectura).

## R2 · Validación de los criterios

- **Decision**: esquema zod `supplierListQuerySchema` en `supplier.validation.ts`, aplicado con
  `validate({ query })`:
  - `q`: texto recortado, máximo `SUPPLIER_SEARCH_MAX_LENGTH` (100); vacío tras recortar equivale a ausente.
  - `includeInactive`: `'true' | 'false'`, por defecto `'false'`, transformado a booleano. Mismo tratamiento que
    `lowStock` en `productListQuerySchema`. Otro valor → 400.
  - `page`: entero ≥ 1, por defecto 1.
  - Parámetros desconocidos: se descartan (sin `.strict()`), igual que en 006 y 007.
- **Rationale**: FR-008 y constitución III.
- **Alternatives considered**: `status=active|all` (un enum para dos valores; el booleano casa con la casilla y
  con el precedente de `lowStock`).

## R3 · Servicio sin base de datos

- **Decision**: `listSuppliers(criteria)` en `supplier.service.ts` devuelve
  `{ items: [], total: 0, page: criteria.page, pageSize: SUPPLIERS_PAGE_SIZE }` sin importar Mongoose. No se
  crea `supplier.model.ts` en esta entrega.
- **Rationale**: FR-009. El modelo llegará con la spec de migración, como en 006 (R3) y 007 (R3).

## R4 · Permisos

- **Decision**: `supplierRouter.use(requireAuth, requirePermission('proveedores', 'view'))`. En el cliente, la
  ruta `/proveedores` va envuelta en `<RequireAuth module="proveedores">`.
- **Rationale**: matriz inicial de 003 (`role.defaults.ts`): Administrador y Administración editan, Almacén solo
  ve, Comercial sin acceso. `view` incluye `edit`, así que FR-003 sale gratis.

## R5 · Tipos y constantes compartidos

- **Decision**: en `packages/shared`:
  - `types/supplier.ts`: `SupplierListItem` y `SupplierListQuery`.
  - `constants/suppliers.ts`: `SUPPLIER_SEARCH_MAX_LENGTH = 100` y `SUPPLIERS_PAGE_SIZE = 10`.
  - Se reutiliza `ListPage<T>` de `types/api.ts`.
- **Rationale**: constitución VI. No hay reglas de negocio que compartir (a diferencia del riesgo de 007), así
  que no hace falta test en shared más allá de `modules.test.ts`.

## R6 · Forma de cada proveedor

- **Decision**: `SupplierListItem = { id, name, leadTimeDays, yearPurchases, active }`:
  - `leadTimeDays`: entero ≥ 0 o `null` (plazo de entrega en días naturales; clarificación del 2026-10-23).
  - `yearPurchases`: euros sin IVA con 2 decimales, del 1 de enero del año en curso hasta hoy (clarificación
    del 2026-10-23). Se muestra con `UserMoney`.
  - `active`: booleano. `false` → sello «Baja».
  - El CIF **no** viaja en el listado: solo se usa para buscar (clarificación del 2026-10-23).
- **Rationale**: FR-010 y FR-016. Un booleano basta para dos estados; si aparecen más (p. ej. «bloqueado»),
  se cambiará con la spec de alta y edición.
- **Alternatives considered**: `status: 'active' | 'inactive'` (más verboso sin ganar nada hoy); incluir los
  productos asociados (descartado en la clarificación del 2026-10-23).

## R7 · Componentes reutilizados

- **Decision**: no se crea ningún componente genérico.
  - Filtro: `Checkbox` «Mostrar dados de baja», como «Solo stock bajo» en `ProductFilters` (FR-018).
  - Marca «Baja»: `StatusStamp` con `tone="neutral"`. Un proveedor dado de baja no es un error ni una alerta, y el
    texto del sello ya transmite el estado.
  - Contador: «N activos» sin el filtro y «N proveedores» con él; en singular, «1 activo» y «1 proveedor».
- **Rationale**: constitución VIII y FR-018.
- **Alternatives considered**: `tone="danger"` para «Baja» (lo reserva el diseño para bloqueos y errores).

## R8 · Criterios en la dirección de la pantalla

- **Decision**: la dirección (`/proveedores?q=…&includeInactive=true&page=2`) es la fuente de verdad (FR-007a).
  Funciones puras `parseSupplierCriteria` y `serializeSupplierCriteria` en
  `features/suppliers/supplierCriteria.ts`, con la misma forma que `productCriteria.ts`:
  - Un valor no válido se ignora y se usa el de por defecto; `includeInactive` solo cuenta si es exactamente
    `true`.
  - La dirección se normaliza con `replace`.
  - Teclear actualiza la dirección con `replace` tras el debounce y vuelve a la página 1.
  - Marcar o desmarcar el filtro actualiza la dirección con `push` (es una decisión del usuario que «Atrás» debe
    poder deshacer) y vuelve a la página 1.
- **Rationale**: clarificaciones del 2026-10-23 y mismo comportamiento que Productos con «Solo stock bajo».
- **Alternatives considered**: extraer ya un `listCriteria` genérico (ver R10).

## R9 · Debounce y peticiones obsoletas

- **Decision**: se reutiliza `useDebouncedValue` (300 ms) para la búsqueda; el filtro no espera. El thunk
  `loadSuppliers` se despacha al cambiar los criterios de la dirección; el efecto aborta la petición anterior y
  el reducer ignora las respuestas cuyo `requestId` no es el último, como `customersSlice`.
- **Rationale**: FR-007; sin dependencias nuevas (ADR 0001).

## R10 · Estados de la pantalla y deuda de duplicación

- **Decision**:
  - Slice `suppliers`: `status: 'idle' | 'loading' | 'succeeded' | 'failed'`, `items`, `total`, `error`,
    `requestId`.
  - `SuppliersListStatus` (dominio) con la misma lógica que `CustomersListStatus`: «Cargando proveedores…»
    (`role="status"`); `EmptyState` «Todavía no hay proveedores» / «Los proveedores se cargarán desde el sistema
    anterior.»; `Alert` de error «No se ha podido cargar el listado de proveedores.» con «Reintentar».
  - `SuppliersTable` sobre `Table` (con `renderCard` para móvil y `status` en el panel), sin columna de acciones.
  - `SupplierFilters`: `role="search"` con `TextField` «Buscar» y `Checkbox` «Mostrar dados de baja».
- **Rationale**: FR-011 a FR-015, FR-017 y FR-018.
- **Deuda**: 007 dejó escrito que la generalización de `ListStatus`, de los criterios y del slice de listado se
  propondría con el tercer listado, que es este. Por la constitución V no se hace aquí. Se propone una spec
  técnica aparte (`list-screens-refactor`) para después de 009.

## R11 · Módulo implementado e impacto en tests existentes

- **Decision**: `IMPLEMENTED_MODULES = ['ajustes', 'productos', 'clientes', 'proveedores']` y ruta `proveedores`
  dentro de `AppLayout` en `AppRouter`. Tests que se ajustan en el mismo cambio (Proveedores era el pendiente de
  ejemplo; pasa a serlo Cobros o Ventas):
  - `packages/shared/src/constants/modules.test.ts` (`it.each(['ventas', 'proveedores', 'cobros'])`).
  - `apps/client/src/features/navigation/navItems.test.ts` (lista de pendientes y recuento de 4 → 3).
  - `apps/client/src/features/preferences/components/AppearanceForm.pendingModules.test.tsx` (usuario
    `PROVEEDORES_ONLY` → solo Cobros).
  - `apps/client/src/routes/homeRoute.test.ts` (casos «módulos pendientes» con la lista real).
  - `apps/server/src/modules/preferences/preferences.pendingModules.test.ts` (caso 200 con
    `homeScreen: 'proveedores'`, FR-001).
  - `e2e/navigation.spec.ts` (lista de módulos y ejemplo de pendiente).
- **Rationale**: regla de 005 (FR-010) y convención de CLAUDE.md.
- **Comprobación al implementar**: los tests que solo citan `proveedores` en un `PermissionSet` (p. ej.
  `AppNav.test`, `role.service.test`) no dependen de que esté pendiente y no se tocan, salvo que fallen.

## R12 · Diseño, escritorio, dependencias y observabilidad

- **Decision**:
  - `docs/design/README.md`: añade a `EmptyState` y al error de listado su uso en Proveedores; documenta el
    filtro «Mostrar dados de baja» (mismo control que «Solo stock bajo»), el sello «Baja» (`neutral`) y el
    placeholder «Nombre o CIF» (FR-017, FR-018). El lienzo no cambia.
  - Escritorio: sin cambios en `apps/desktop`; el backend embebido monta la misma ruta.
  - Sin dependencias nuevas y sin registro específico de las lecturas del listado.
- **Rationale**: constitución V (cambios mínimos).
