# Research: Gestión de proveedores

**Feature**: `010-suppliers-management` · **Fecha**: 2026-10-26 · **Spec**: [spec.md](spec.md)

No queda ningún `NEEDS CLARIFICATION` en el contexto técnico: el stack es el del monorepo, las dudas de producto
se cerraron en `/speckit-clarify` y con el cliente (2026-10-26), y 009 deja el listado y su contrato. Este
documento recoge las decisiones de diseño, lo que se reutiliza y lo que falta en el código actual.

## R1 · Modelo de datos

- **Decision**: `supplier.model.ts` con `SupplierModel` (colección `suppliers`) y `{ timestamps: true }`.
  Campos en [data-model.md](data-model.md). Índices:
  - `cif` único (ya normalizado: mayúsculas, sin espacios, puntos ni guiones).
  - `name` con collation `{ locale: 'es', strength: 1 }` para ordenar y buscar sin acentos ni mayúsculas.
  - `active` para el filtro de bajas.
  - Un test de servicio comprueba los índices y que, con 1.000 proveedores sembrados, `listSuppliers` con
    búsqueda responde en menos de 500 ms en mongodb-memory-server (margen para la red y el cliente en SC-006).
- **Rationale**: FR-004, FR-005, FR-020, SC-006. Es el primer modelo del dominio; 009 lo dejaba para cuando hubiera
  datos (Complexity Tracking de 009).
- **Alternatives considered**: guardar el CIF tal cual y normalizar en cada consulta (el índice único no
  protegería contra «B-12…» frente a «B12…»).

## R2 · Unicidad del CIF

- **Decision**: el índice único es la garantía. Al recibir el error E11000, el servicio busca el proveedor que
  ya tiene ese CIF y lanza `AppError('SUPPLIER_CIF_TAKEN', 409, 'Ya existe un proveedor con este CIF: <nombre>.')`.
  Mismo patrón que `toEmailTakenError` de usuarios (003).
- **Rationale**: FR-005 y el caso límite de dos altas simultáneas: solo gana la primera, sin carreras.
- **Alternatives considered**: comprobar antes de insertar (deja una ventana de carrera; se mantiene solo como
  ayuda en el cliente, no como garantía).

## R3 · Validación de NIF/CIF, IBAN y código postal

- **Decision**: funciones puras en `packages/shared/src/utils/` (junto a `mongoUri.ts`), `taxId.ts` e `iban.ts`:
  - `normalizeTaxId(v)`: mayúsculas y sin espacios, puntos ni guiones.
  - `isValidSpanishTaxId(v)`: NIF de persona (8 cifras + letra de control), NIE (X/Y/Z + 7 cifras + letra) y
    CIF (letra de entidad + 7 cifras + control numérico o letra, según la letra inicial).
  - `normalizeIban`, `isValidIban` (formato por país y módulo 97) y `formatIban` (grupos de 4).
  - Las usan `supplierInputSchema` (servidor) y `supplierForm.ts` (cliente).
- **Rationale**: FR-004, FR-006, FR-008; constitución VI (una sola implementación). No hay validador en el
  repositorio y no hace falta una dependencia: son algoritmos cortos y bien definidos.
- **Alternatives considered**: librerías `ibantools` / `better-dni` (dependencia nueva para pocas líneas);
  validar solo el formato (no detecta erratas, que es lo que pidió el cliente en la clarificación).

## R4 · Validación de entrada (zod)

- **Decision**: en `supplier.validation.ts`:
  - `supplierIdParams`: `id` de 24 hex, como `userIdParams`.
  - `supplierInputSchema`: todos los campos de FR-004, con `trim`, límites de longitud, `phones`/`emails` como
    arrays de `{ label, value }` de 0 a 5 (las filas sin valor se descartan antes de contar), `paymentMethod`
    enum, `minOrder` número > 0 con 2 decimales o `null`, `leadTimeDays` entero 0–365 o `null`. `superRefine`
    para las reglas cruzadas: CIF español válido salvo `foreign`, código postal de 5 cifras salvo `foreign`.
  - `supplierUpdateSchema = supplierInputSchema.extend({ version: z.number().int().min(0) })`.
  - `supplierStatusSchema = { active: boolean, version }`.
  - `supplierListQuerySchema` gana `quarter` (`'1'…'4'`). El valor por defecto es el trimestre en curso calculado
    en cada petición, `.default(() => currentQuarter(new Date()))`, nunca un valor fijado al cargar el módulo.
  - El cliente traduce el `VALIDATION_ERROR` del servidor («ruta: motivo; …») a errores por campo con
    `parseValidationMessage`, para mostrarlos junto a cada campo (FR-006). Las rutas que no correspondan a un campo
    del formulario se muestran en el resumen.
- **Rationale**: constitución III, FR-006. El error es el `VALIDATION_ERROR` existente con `ruta: mensaje`; el
  cliente valida antes con las mismas reglas y, si aun así llega un 400, lo traduce a errores por campo.
- **Alternatives considered**: errores por campo estructurados en el envelope (cambiaría `validate.ts` y el
  contrato de error de todo el proyecto; fuera de alcance, constitución V).

## R5 · Endpoints

| Método y ruta | Permiso | Respuesta |
|---|---|---|
| `GET /api/suppliers` | ver | `ListPage<SupplierListItem>` (ahora con datos, `cif`, `city` y `quarterPurchases`) |
| `GET /api/suppliers/:id` | ver | `SupplierDetail` · 404 |
| `POST /api/suppliers` | editar | 201 `SupplierDetail` · 400 · 409 CIF |
| `PUT /api/suppliers/:id` | editar | `SupplierDetail` · 400 · 404 · 409 CIF · 409 versión |
| `PATCH /api/suppliers/:id/status` | editar | `SupplierDetail` · 404 · 409 versión |

- **Decision**: `supplierRouter.use(requireAuth, requirePermission('proveedores', 'view'))` como en 009, y
  `requirePermission('proveedores', 'edit')` en cada escritura. Sin `DELETE` (FR-018). `PUT` reemplaza el
  proveedor entero porque el formulario siempre envía todos los campos.
- **Rationale**: FR-002, FR-003, FR-017, FR-018; mismo reparto que usuarios (`PATCH /:id/status`).
- **Alternatives considered**: `PATCH` parcial (el formulario no lo necesita y complica la validación).

## R6 · Concurrencia optimista

- **Decision**: campo `version` (entero, empieza en 0) en el documento y en `SupplierDetail`. `PUT` y `PATCH`
  exigen la `version` que el cliente leyó. El servicio hace
  `findOneAndUpdate({ _id, version }, { …cambios, $inc: { version: 1 } }, { new: true })`; si no devuelve nada,
  comprueba si el proveedor existe: no existe → 404 `SUPPLIER_NOT_FOUND`; existe → 409
  `SUPPLIER_VERSION_CONFLICT`.
- **Rationale**: FR-011 sin bloqueos ni estado en el servidor; atómico en MongoDB.
- **Alternatives considered**: `optimisticConcurrency` de Mongoose (solo con `save()` y no expone el token al
  cliente); comparar `updatedAt` (resolución de milisegundos y problemas de serialización).

## R7 · Auditoría y compras

- **Decision**:
  - `createdBy` y `updatedBy` como `{ id, login }` en el documento, tomados de `req.auth` (`userId`, `login`),
    más `createdAt`/`updatedAt` de `timestamps`. El controlador construye un `AuditUser` (tipo de shared) a partir de `req.auth`, igual que usuarios construye su `UserRef`.
  - `supplierPurchases.ts` expone `getPurchaseTotals(ids, year)` que hoy devuelve 0 en el año y en los cuatro
    trimestres. El servicio la usa para el listado y la ficha.
- **Rationale**: FR-012b y FR-021/FR-021a. La costura evita tocar el servicio cuando llegue el módulo de compras.
- **Alternatives considered**: colección de auditoría (ver Complexity Tracking del plan); guardar los totales en
  el proveedor (se desincronizarían con las compras).

## R8 · Rutas y navegación del cliente

- **Decision**:
  - Rutas hijas de `proveedores`: índice (listado), `nuevo` (`RequireAuth level="edit"`), `:id` (ficha) y
    `:id/editar` (`level="edit"`).
  - Al abrir una ficha desde el listado se conserva la query del listado en la dirección de la ficha
    (`/proveedores/:id?q=…&includeInactive=true&quarter=2&page=2`, los mismos parámetros de 009 más `quarter`,
    que se omite cuando es el trimestre en curso). La flecha de retorno navega a `/proveedores` con esa
    misma query. El slice guarda en `detail.data.id` el último proveedor abierto; al montar el listado, si ese
    proveedor está en la página, se enfoca su fila. Así funciona igual con la flecha que con «Atrás» del navegador.
  - Un `:id` inexistente (404) redirige al listado con `state: { notFound: true }` y el listado muestra el aviso.
  - Salir del formulario con cambios (flecha, «Cancelar», menú o «Atrás») pasa por `useBlocker` y el `Dialog`
    «¿Descartar los cambios?».
- **Rationale**: FR-012, FR-013, FR-014, FR-010. `createBrowserRouter` ya es un router de datos, así que
  `useBlocker` está disponible.
- **Alternatives considered**: ficha como estado dentro de `SuppliersPage` (no tendría dirección propia ni
  «Atrás» nativo); criterios en `location.state` (se pierden al recargar o compartir el enlace).

## R9 · Componentes

- **Decision**:
  - Reutilizar `TextField`, `Select`, `Checkbox`, `Dialog`, `Alert`, `Button`, `IconButton`, `StatusStamp`,
    `Table`, `EmptyState`, `UserMoney` y `UserMoneyField`. La baja no borra datos, así que su confirmación usa el
    `Button` normal, no la variante `danger`.
  - Crear dos genéricos, con tests, en `apps/client/src/components/`:
    - `BackLink`: enlace de router con flecha, texto y `aria-label`, alto mínimo 44 px.
    - `TextArea`: mismo estilo, etiqueta y error que `TextField`, para «Observaciones».
  - La confirmación de guardado es un `Alert variant="info"` con `role="status"` en la ficha.
- **Rationale**: constitución VIII; no existen ni flecha de retorno ni área de texto, y Clientes y Productos los
  necesitarán.
- **Alternatives considered**: `TextField` con prop `multiline` (cambia un componente probado para un caso);
  un `Toast` genérico (nuevo patrón de UI que el diseño no exige).

## R10 · Estado del cliente

- **Decision**: el slice `suppliers` crece con `detail` (`status`, `data`, `error`) y `save` (`status`,
  `error`, `conflict`). Thunks `loadSupplier`, `createSupplier`, `updateSupplier`, `setSupplierActive` en
  `suppliersSlice.ts` y llamadas en `suppliersApi.ts`. Tras guardar, la ficha usa la respuesta del servidor (no
  recarga) y el listado se vuelve a pedir al volver.
- **Rationale**: constitución VIII (un slice por dominio, API solo en `*Api.ts`).
- **Alternatives considered**: slices separados por pantalla (rompe «un slice por dominio»).

## R11 · Formulario

- **Decision**: `supplierForm.ts` convierte entre `SupplierDetail`, los valores del formulario (texto) y
  `SupplierInput`; `validateSupplierForm` devuelve errores por campo con las reglas de R3/R4 y los textos del
  contrato de UI. El formulario lleva el foco al primer campo con error y muestra un resumen arriba.
  `UserMoneyField` para el pedido mínimo.
- **Rationale**: FR-007, FR-008, CLAUDE.md (importes con `UserMoneyField`).
- **Alternatives considered**: validar solo en el servidor (no hay errores por campo en el envelope, R4).

## R12 · E2E y datos de prueba

- **Decision**: `seedSuppliers` / `removeSuppliers` en `e2e/support/db.ts`, con el mismo patrón que `seedUsers`
  (importa `SupplierModel` y hace `insertMany`). `e2e/suppliers.spec.ts` se reescribe: listado con datos, alta,
  ficha a pantalla completa con flecha de retorno, edición, conflicto no (se cubre en tests de rutas), baja y
  reactivación, y permisos de Almacén.
- **Rationale**: ADR 0004; el E2E de 009 comprobaba el listado vacío, que ya no aplica.
- **Alternatives considered**: sembrar por la API (más lento y depende del propio flujo que se prueba).
