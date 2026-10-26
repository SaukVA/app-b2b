---

description: "Task list for feature 010-suppliers-management"
---

# Tasks: Gestión de proveedores

**Input**: Design documents from `/specs/010-suppliers-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/suppliers-api.openapi.yaml,
contracts/suppliers-ui.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige tests de servicio y de rutas del módulo
`suppliers` (supertest + mongodb-memory-server), tests unitarios en `packages/shared` y `apps/client`, y tests
propios de los componentes genéricos nuevos. El E2E de Playwright (ADR 0004) cubre el flujo completo. En cada fase
los tests se escriben primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de
cada fase se muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). **Orden de ejecución**:
US2 (ficha) → US1 (alta) → US3 (edición) → US4 (baja). US1 y US2 son P1 las dos; la ficha va primero porque el
alta termina abriéndola (FR-009) y porque se puede probar sola con proveedores sembrados.

**Reglas transversales** (aplican a todas las tareas):
- **Capas** (principio IV): `routes → controller → service → model`; el controlador NEVER importa Mongoose; NEVER
  se devuelve un documento: siempre `toSupplierDetail` / `toSupplierListItem` de `supplier.mapper.ts`.
- **Tamaño de las funciones**: ≤20 líneas efectivas como referencia y nunca >40, anidamiento ≤2, early returns.
- **Errores**: `AppError` con los códigos de `SUPPLIER_ERROR_CODES` (`SUPPLIER_NOT_FOUND` 404,
  `SUPPLIER_CIF_TAKEN` 409, `SUPPLIER_VERSION_CONFLICT` 409).
- **Validación compartida** (research R3): servidor y cliente usan `normalizeTaxId`, `isValidSpanishTaxId`,
  `normalizeIban`, `isValidIban` y `formatIban` de `@app/shared`. NEVER se duplican.
- **Sin borrado** (FR-018): no existe ruta `DELETE` ni función de borrado.
- **Componentes**: se componen `TextField`, `Select`, `Checkbox`, `Dialog`, `Alert`, `Button`, `IconButton`,
  `StatusStamp`, `Table`, `EmptyState`, `UserMoney`, `UserMoneyField`, `BackLink` y `TextArea`. Sin llamadas a la
  API desde componentes: solo `suppliersApi.ts`, desde los thunks de `suppliersSlice.ts`.
- **Importes** (CLAUDE.md): `<UserMoney>` para mostrar y `<UserMoneyField>` para el pedido mínimo; el plazo NEVER
  como importe.
- **Textos**: los de contracts/suppliers-ui.md, literales.
- **Estilos**: tokens de `apps/client/src/styles/tokens.css`; corte `@media (max-width: 759px)`; 44 px.
- **Dependencias**: ninguna nueva.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: entorno de trabajo

- [X] T001 Comprobar que la rama activa es `010-suppliers-management`, que `.specify/feature.json` apunta a
  `specs/010-suppliers-management` y que `npm test --workspaces` y `npm run lint` están en verde antes de empezar
  (línea base).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos, validadores, modelo, mapeo y listado real que usan todas las historias, y los dos componentes
genéricos nuevos.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

### Tests de la base (primero, deben fallar) ⚠️

- [X] T002 [P] Tests de `isValidSpanishTaxId` y `normalizeTaxId` en `packages/shared/src/utils/taxId.test.ts`:
  NIF válido (`12345678Z`) e inválido (`12345678A`); NIE válido (`X1234567L`) e inválido; CIF válidos con control numérico
  (letra inicial A, B…) y con control letra (P, Q, S…), calculados en el propio test, y los mismos con el control
  cambiado; normalización de
  `b-12.345.678` a `B12345678`; vacío y longitudes incorrectas → `false`.
- [X] T003 [P] Tests de `isValidIban`, `normalizeIban` y `formatIban` en `packages/shared/src/utils/iban.test.ts`:
  `ES91 2100 0418 4502 0005 1332` válido; el mismo con un dígito cambiado → `false`; longitud española incorrecta
  → `false`; país desconocido con 15–34 caracteres y módulo 97 correcto → `true`; `formatIban` en grupos de 4.
- [X] T004 [P] Reescribir `apps/server/src/modules/suppliers/supplier.service.test.ts` (el de 009 exige «sin
  Mongoose», que ya no aplica) con mongodb-memory-server para `listSuppliers`: orden alfabético con collation `es`
  («Ávila» junto a «Avila»); `includeInactive` false/true; búsqueda por nombre sin acentos ni mayúsculas y por CIF
  escrito con otro formato; paginación de `SUPPLIERS_PAGE_SIZE`; `quarterPurchases` y `yearPurchases` a 0;
  `cif` y `city` en cada item; el modelo tiene los índices `cif` (único), `name` (collation `es`, fuerza 1) y
  `active` (`SupplierModel.listIndexes()`); con 1.000 proveedores sembrados, `listSuppliers` con búsqueda responde
  en menos de 500 ms (SC-006, research R1).
- [X] T005 [P] Tests de `toSupplierListItem` y `toSupplierDetail` en
  `apps/server/src/modules/suppliers/supplier.mapper.test.ts`: no se filtra ningún campo interno (`_id`, `__v`),
  `id` como string, fechas ISO, `quarterPurchases` de 4 posiciones que suman `yearPurchases`.
- [X] T006 [P] Ampliar `apps/server/src/modules/suppliers/supplier.routes.test.ts` para el listado con datos
  sembrados: `quarter` válido (1–4) y no válido (`5`, `abc` → 400 `VALIDATION_ERROR`); sin `quarter` → el
  trimestre en curso de cada petición (cambiando la fecha con `jest.useFakeTimers().setSystemTime(...)` entre dos
  peticiones); respuesta con `cif`,
  `city`, `quarterPurchases`; 401 y 403 (Comercial) como en 009.
- [X] T007 [P] Tests de `BackLink` en `apps/client/src/components/BackLink.test.tsx`: enlace con flecha, texto,
  `aria-label`, `to` con query y `state`; alto mínimo 44 px por clase.
- [X] T008 [P] Tests de `TextArea` en `apps/client/src/components/TextArea.test.tsx`: etiqueta asociada, `error`
  con `aria-invalid` y `aria-describedby`, `maxLength`, `rows`.
- [X] T009 [P] Ampliar `apps/client/src/features/suppliers/supplierCriteria.test.ts`: `quarter` 1–4 leído de la
  dirección; omitido o no válido → trimestre en curso; se serializa solo si no es el en curso.
- [X] T010 [P] Ampliar `apps/client/src/features/suppliers/components/SuppliersTable.test.tsx` y
  `SupplierFilters.test.tsx`: columnas CIF, Plazo, «Gasto <T>», Compras año, población bajo el nombre, sello
  «Baja»; selector «Gasto por trimestre · <año>» con 1T–4T y `aria-pressed`; en estrecho solo Proveedor y Compras
  año.

### Implementación de la base

- [X] T011 Ampliar `packages/shared/src/types/supplier.ts` con los tipos de data-model.md: `PaymentMethod`,
  `Quarter`, `SupplierContact`, `AuditUser`, `SupplierInput`, `SupplierUpdateInput`, `SupplierStatusInput`,
  `SupplierDetail`; `SupplierListItem` gana `cif`, `city` y `quarterPurchases`; `SupplierListQuery` gana
  `quarter: Quarter`. Borrar el comentario de 009 que dice que el CIF no va en el listado.
- [X] T012 Ampliar `packages/shared/src/constants/suppliers.ts` con `SUPPLIER_LIMITS` (`name` 120, `address` 200,
  `city` 100, `contactPerson` 120, `contactLabel` 40, `notes` 2000, `maxContacts` 5, `leadTimeDaysMax` 365,
  `foreignTaxId` 3–20, `foreignPostalCode` 3–10, `phone` 6–20), `PAYMENT_METHODS` (`TRANSFER_30` «Transferencia 30
  días», `TRANSFER_60` «Transferencia 60 días», `DIRECT_DEBIT` «Domiciliación bancaria», `PROMISSORY_NOTE`
  «Pagaré», `CASH` «Contado»), `DEFAULT_PAYMENT_METHOD = 'TRANSFER_30'`, `SUPPLIER_ERROR_CODES` (`notFound`,
  `cifTaken`, `versionConflict`) y `currentQuarter(date)`.
- [X] T013 [P] Implementar `packages/shared/src/utils/taxId.ts` (`normalizeTaxId`, `isValidSpanishTaxId`: NIF,
  NIE y CIF con su control, research R3) hasta poner en verde T002.
- [X] T014 [P] Implementar `packages/shared/src/utils/iban.ts` (`normalizeIban`, `isValidIban` con longitud por
  país conocida o 15–34 y módulo 97, `formatIban`) hasta poner en verde T003.
- [X] T015 Exportar los tipos, constantes y utilidades nuevos en `packages/shared/src/index.ts`.
- [X] T016 Crear `apps/server/src/modules/suppliers/supplier.model.ts` (`SupplierModel`, colección `suppliers`,
  `{ timestamps: true }`) con los campos de data-model.md: `name` «Obligatorio, 1–120»; `cif` «normalizado …
  **Único**»; `foreign` (por defecto `false`); `address` «Obligatorio, 1–200»; `postalCode`; `city` «Obligatorio,
  1–100»; `contactPerson` «Hasta 120» o `null`; `phones` y `emails` como `{ label, value }[]`; `paymentMethod` enum
  «`TRANSFER_30`, `TRANSFER_60`, `DIRECT_DEBIT`, `PROMISSORY_NOTE`, `CASH`. Por defecto `TRANSFER_30`»; `iban`,
  `web`, `leadTimeDays`, `minOrder`, `notes` nullables; `active` (por defecto `true`); `version` (empieza en 0);
  `createdBy` y `updatedBy` `{ id, login }`. Índices: `cif` único, `name` con collation
  `{ locale: 'es', strength: 1 }`, `active`. Sin `versionKey` de Mongoose.
- [X] T017 [P] Crear `apps/server/src/modules/suppliers/supplierPurchases.ts` con
  `getPurchaseTotals(ids, year)` que devuelve, por id, `{ year: 0, quarters: [0, 0, 0, 0] }` (costura del módulo
  de compras, research R7).
- [X] T018 Crear `apps/server/src/modules/suppliers/supplier.mapper.ts` con `toSupplierListItem(doc, totals,
  quarter)` y `toSupplierDetail(doc, totals)` hasta poner en verde T005.
- [X] T019 Ampliar `supplierListQuerySchema` en `apps/server/src/modules/suppliers/supplier.validation.ts` con
  `quarter`: `z.coerce.number().int().min(1).max(4)`, por defecto el trimestre en curso calculado en cada petición,
  `.default(() => currentQuarter(new Date()))` (NUNCA un valor fijado al cargar el módulo); y añadir
  `supplierIdParams` (`id` de 24 hex, como `userIdParams`).
- [X] T020 Reescribir `listSuppliers` en `apps/server/src/modules/suppliers/supplier.service.ts`: filtro de
  `active`, búsqueda (`name` con regex escapada, insensible a mayúsculas, y `cif` contiene `normalizeTaxId(q)`),
  orden por `name` con collation `es`, `skip`/`limit` con `SUPPLIERS_PAGE_SIZE`, `countDocuments` y totales de
  `getPurchaseTotals`, hasta poner en verde T004 y T006. Actualizar el `@openapi` del `GET /` en
  `supplier.routes.ts` (parámetro `quarter`, campos nuevos del item) según contracts/suppliers-api.openapi.yaml.
- [X] T021 [P] Crear `apps/client/src/components/BackLink.tsx` (+ `BackLink.module.css`): `Link` de React Router
  con flecha SVG de trazo 22 px, texto, `aria-label`, `to` y `state`; fondo `surface2` al pasar; hasta poner en
  verde T007.
- [X] T022 [P] Crear `apps/client/src/components/TextArea.tsx` (+ `TextArea.module.css`) con la misma etiqueta,
  error y estilos que `TextField`, hasta poner en verde T008.
- [X] T023 Ampliar `apps/client/src/features/suppliers/supplierCriteria.ts` con `quarter` (hasta poner en verde
  T009) y `suppliersApi.ts` para enviar `quarter` (actualizar `suppliersApi.test.ts`).
- [X] T024 Ampliar `apps/client/src/features/suppliers/components/SupplierFilters.tsx` (selector de trimestre con
  `aria-pressed`) y `SuppliersTable.tsx` (CIF, población, «Gasto <T>» con `UserMoney`), y conectar el trimestre en
  `apps/client/src/pages/SuppliersPage.tsx`, hasta poner en verde T010.
- [X] T025 [P] Añadir `seedSuppliers(list)` y `removeSuppliers()` en `e2e/support/db.ts` con el patrón de
  `seedUsers` (importa `SupplierModel`, `insertMany` con `version: 0` y `createdBy`/`updatedBy` del admin).

**Checkpoint**: `npm test --workspaces` en verde; el listado muestra proveedores sembrados.

---

## Phase 3: User Story 2 - Consultar la ficha de un proveedor (Priority: P1) 🎯 MVP (1/2)

**Goal**: pulsar un proveedor abre su ficha a pantalla completa con todos sus datos y una flecha de retorno que
vuelve al listado tal como estaba (FR-012 a FR-015).

**Independent Test**: con proveedores sembrados, un usuario Almacén abre uno del listado, ve todos sus datos sin
acciones de edición y vuelve con la flecha a la misma búsqueda, filtro, trimestre y página, con el foco en la fila.

### Tests de US2 (primero, deben fallar) ⚠️

- [ ] T026 [P] [US2] Tests de `getSupplier` en `supplier.service.test.ts`: devuelve el detalle de un activo y de
  uno dado de baja; id inexistente → `AppError` `SUPPLIER_NOT_FOUND` 404.
- [ ] T027 [P] [US2] Tests de `GET /api/suppliers/:id` en `supplier.routes.test.ts`: 200 con el contrato de
  `SupplierDetail`; 404; id mal formado → 400; 401; 403 Comercial; 200 Almacén.
- [ ] T028 [P] [US2] Tests de `loadSupplier` en `apps/client/src/features/suppliers/suppliersSlice.test.ts`:
  `detail.status` `loading` → `ready` / `notFound` (404) / `error`.
- [ ] T029 [P] [US2] Tests de `SupplierDetailView` en
  `apps/client/src/features/suppliers/components/SupplierDetailView.test.tsx`: secciones «Datos fiscales»,
  «Contacto» (`tel:` / `mailto:`, «sin etiqueta»), «Pago» (IBAN en grupos de 4), «Compras <año>» con 4 trimestres,
  «Pedidos» (web externa, «N días» / «1 día» / «—», `UserMoney` o «Sin pedido mínimo»), «Observaciones» o «Sin
  observaciones.», pie «Creado por … el …» / «Modificado por … el …», sello «Baja», «— » en datos vacíos; sin
  botones de edición cuando `canEdit` es `false`.
- [ ] T030 [P] [US2] Tests de `SupplierDetailPage` en `apps/client/src/pages/SupplierDetailPage.test.tsx`: carga
  por `:id`; mientras carga, `aria-busy="true"` y «Cargando proveedor…»; `BackLink` a `/proveedores` con la misma
  query; 404 → navega a `/proveedores` con `state.notFound`; error «No se ha podido cargar el proveedor.» con
  «Reintentar».
- [ ] T031 [P] [US2] Ampliar `SuppliersPage.test.tsx` y `SuppliersTable.test.tsx`: cada fila es un enlace a
  `/proveedores/:id?<query actual>`; al volver (con la flecha o con «Atrás» del navegador) el foco queda en la fila
  del último proveedor abierto (`detail.data.id` del slice); `state.notFound`
  muestra el aviso «El enlace apunta a un proveedor que no existe. Busca el proveedor en el listado.» con
  «Entendido».

### Implementación de US2

- [ ] T032 [US2] Implementar `getSupplier(id)` en `supplier.service.ts` (usa `toSupplierDetail` y
  `getPurchaseTotals`) hasta poner en verde T026.
- [ ] T033 [US2] Añadir `get` en `supplier.controller.ts` y `GET /:id` con `validate({ params: supplierIdParams })`
  y su `@openapi` en `supplier.routes.ts`, hasta poner en verde T027.
- [ ] T034 [US2] Añadir `fetchSupplier(id)` en `suppliersApi.ts` y el estado `detail` con el thunk
  `loadSupplier` en `suppliersSlice.ts`, hasta poner en verde T028.
- [ ] T035 [P] [US2] Crear `apps/client/src/features/suppliers/components/SupplierDetailView.tsx`
  (+ `.module.css`): dos columnas (una en estrecho), según el tablero «Proveedores», hasta poner en verde T029.
- [ ] T036 [US2] Crear `apps/client/src/pages/SupplierDetailPage.tsx` (+ `.module.css`) con `BackLink`
  («Proveedores», `aria-label` «Volver al listado de proveedores»), estados de carga y error, cabecera y
  `SupplierDetailView`, hasta poner en verde T030.
- [ ] T037 [US2] Añadir la ruta `proveedores/:id` (ver) en `apps/client/src/routes/AppRouter.tsx`, convertir las
  filas de `SuppliersTable` en enlaces con la query actual, enfocar al montar la fila del último proveedor abierto
  (`detail.data.id`) y mostrar el aviso de `notFound` en `SuppliersPage.tsx`,
  hasta poner en verde T031.

**Checkpoint**: US2 completa y probada de forma independiente con proveedores sembrados.

---

## Phase 4: User Story 1 - Dar de alta un proveedor (Priority: P1) 🎯 MVP (2/2)

**Goal**: «Nuevo proveedor» abre un formulario a pantalla completa; al guardar se crea el proveedor activo y se
abre su ficha (FR-004 a FR-010).

**Independent Test**: con Administración se dan de alta uno completo y otro con solo los obligatorios; los dos
aparecen en el listado y su ficha muestra lo introducido; un CIF repetido en otro formato se rechaza con el
nombre; Almacén no ve «Nuevo proveedor».

### Tests de US1 (primero, deben fallar) ⚠️

- [ ] T038 [P] [US1] Tests de `supplierInputSchema` en
  `apps/server/src/modules/suppliers/supplier.validation.test.ts`: obligatorios (`name`, `cif`, `address`,
  `postalCode`, `city`); límites de `SUPPLIER_LIMITS`; CIF español inválido rechazado salvo `foreign`; código
  postal «5 cifras» si es español y 3–10 si es extranjero; IBAN inválido; web sin protocolo → `https://…`;
  `leadTimeDays` 0–365; `minOrder` > 0 con 2 decimales o `null`; filas de contacto sin valor descartadas antes de
  contar el máximo de 5; teléfono «6–20 de dígitos, espacios, `+`, `-`, `()`»; correo válido; `paymentMethod` del
  enum.
- [ ] T039 [P] [US1] Tests de `createSupplier` en `supplier.service.test.ts`: crea activo, `version` 0,
  `createdBy` = `updatedBy` = actor; CIF ya usado por un activo o por un dado de baja → `SUPPLIER_CIF_TAKEN` 409
  con «Ya existe un proveedor con este CIF: <nombre>.»; dos altas simultáneas con el mismo CIF → solo una.
- [ ] T040 [P] [US1] Tests de `POST /api/suppliers` en `supplier.routes.test.ts`: 201 con `SupplierDetail`; 400;
  409; 403 Almacén y Comercial; 401.
- [ ] T041 [P] [US1] Tests de `supplierForm.ts` en `apps/client/src/features/suppliers/supplierForm.test.ts`:
  `toSupplierInput` (recorta, normaliza CIF e IBAN, números, descarta filas vacías), `fromSupplierDetail` y
  `validateSupplierForm` con cada texto de error de contracts/suppliers-ui.md.
- [ ] T042 [P] [US1] Tests de `SupplierContactsField` en
  `apps/client/src/features/suppliers/components/SupplierContactsField.test.tsx`: añadir, quitar
  («Quitar teléfono N»), etiquetar, contador «N de 5», botón deshabilitado al llegar a 5, error por fila.
- [ ] T043 [P] [US1] Tests de `SupplierForm` en
  `apps/client/src/features/suppliers/components/SupplierForm.test.tsx`: secciones y campos con sus textos; casilla
  «Proveedor extranjero»; `UserMoneyField` en pedido mínimo; `TextArea` en Observaciones; errores junto al campo
  con `aria-invalid`, resumen «Revisa estos campos: …» y foco en el primero con error; error de CIF del servidor
  en el campo CIF.
- [ ] T044 [P] [US1] Tests de `createSupplier` (thunk) en `suppliersSlice.test.ts` y de `SupplierFormPage` en
  modo alta en `apps/client/src/pages/SupplierFormPage.test.tsx`: guardar navega a `/proveedores/:id` y la ficha
  muestra «Proveedor creado.» con `role="status"`; error de red → «No se ha podido guardar el proveedor. Lo que has
  escrito sigue aquí; vuelve a intentarlo.»; 403 → «Ya no tienes permiso para editar proveedores.» sin perder lo
  escrito; 400 del servidor → errores junto a cada campo; salir con cambios (flecha, «Cancelar» o navegación) abre «¿Descartar los
  cambios?» con «Seguir editando» / «Descartar cambios»; sin cambios sale directamente.
- [ ] T045 [P] [US1] Tests de `parseValidationMessage` en `apps/client/src/features/suppliers/supplierForm.test.ts`:
  `postalCode: El código postal español tiene 5 cifras; phones.1.value: …` se convierte en errores de `postalCode`
  y de la fila 2 de teléfonos; una ruta que no es un campo del formulario va al resumen (FR-006, research R4).

### Implementación de US1

- [ ] T046 [US1] Añadir `supplierInputSchema` en `supplier.validation.ts` con las reglas de data-model.md y
  `superRefine` para CIF y código postal según `foreign`, usando los validadores de `@app/shared`, hasta poner en
  verde T038.
- [ ] T047 [US1] Implementar `createSupplier(input, actor)` en `supplier.service.ts` con el mapeo de E11000 a
  `SUPPLIER_CIF_TAKEN` (busca el nombre del dueño del CIF; patrón `toEmailTakenError` de usuarios), hasta poner en
  verde T039.
- [ ] T048 [US1] Añadir `create` en `supplier.controller.ts` (actor `AuditUser` desde `req.auth`, respuesta 201)
  y `POST /` con `requirePermission('proveedores', 'edit')`, `validate({ body: supplierInputSchema })` y su
  `@openapi`, hasta poner en verde T040.
- [ ] T049 [P] [US1] Crear `apps/client/src/features/suppliers/supplierForm.ts` hasta poner en verde T041.
- [ ] T050 [P] [US1] Crear `SupplierContactsField.tsx` en `apps/client/src/features/suppliers/components/` hasta
  poner en verde T042.
- [ ] T051 [US1] Crear `SupplierForm.tsx` (+ `.module.css`) en `apps/client/src/features/suppliers/components/`
  según el tablero «Proveedores» (dos columnas, una en estrecho), hasta poner en verde T043.
- [ ] T052 [US1] Añadir `createSupplier` en `suppliersApi.ts`, el estado `save` y el thunk `createSupplier` en
  `suppliersSlice.ts` (CIF duplicado al error del campo; 403 → mensaje de permiso en `save.error`; 400 → errores
  por campo con `parseValidationMessage`), y crear `apps/client/src/pages/SupplierFormPage.tsx`
  (+ `.module.css`) en modo alta con `BackLink` al listado, `useBlocker` y `Dialog` de descartar, hasta poner en
  verde T044.
- [ ] T053 [US1] Implementar `parseValidationMessage` en `apps/client/src/features/suppliers/supplierForm.ts`
  hasta poner en verde T045.
- [ ] T054 [US1] Añadir la ruta `proveedores/nuevo` con `RequireAuth module="proveedores" level="edit"` en
  `AppRouter.tsx`, el botón «Nuevo proveedor» (solo con permiso de editar) en `SuppliersPage.tsx`, el texto
  adicional del aviso vacío para quien puede editar (FR-022) y el aviso «Proveedor creado.» en
  `SupplierDetailPage.tsx`.

**Checkpoint**: MVP (US2 + US1) completo: alta y consulta de proveedores de principio a fin.

---

## Phase 5: User Story 3 - Editar un proveedor (Priority: P1)

**Goal**: «Editar proveedor» abre el mismo formulario con los datos actuales; guardar actualiza la ficha y el
listado sin sobrescribir en silencio cambios de otro usuario (FR-007, FR-009, FR-011).

**Independent Test**: un Administrador cambia nombre, plazo y un correo y lo ve en la ficha y el listado; poner
el CIF de otro proveedor da error; guardar con una versión antigua muestra el aviso de conflicto.

### Tests de US3 (primero, deben fallar) ⚠️

- [ ] T055 [P] [US3] Tests de `updateSupplier` en `supplier.service.test.ts`: con la `version` correcta guarda,
  sube `version` y cambia `updatedBy`; con una antigua → `SUPPLIER_VERSION_CONFLICT` 409 y no guarda; id
  inexistente → 404; CIF de otro → 409 `SUPPLIER_CIF_TAKEN`; editable estando dado de baja (FR-019).
- [ ] T056 [P] [US3] Tests de `PUT /api/suppliers/:id` en `supplier.routes.test.ts`: 200; 400 (sin `version` o
  datos no válidos); 404; 409 (los dos códigos); 403 Almacén.
- [ ] T057 [P] [US3] Tests del thunk `updateSupplier` en `suppliersSlice.test.ts` y de `SupplierFormPage` en modo
  edición: datos actuales cargados; guardar vuelve a la ficha con «Cambios guardados.» (`role="status"`); 409 de versión muestra
  «Otro usuario ha cambiado este proveedor mientras lo editabas. Carga los datos actuales y repite tus cambios.»
  con «Cargar datos actuales», sin perder lo escrito hasta pulsarlo; 403 muestra «Ya no tienes permiso para
  editar proveedores.»; la flecha vuelve a la ficha.

### Implementación de US3

- [ ] T058 [US3] Añadir `supplierUpdateSchema` (`supplierInputSchema` + `version` entero ≥ 0) en
  `supplier.validation.ts` e implementar `updateSupplier(id, input, actor)` en `supplier.service.ts` con
  `findOneAndUpdate({ _id, version }, { …, $inc: { version: 1 } })` y la distinción 404 / 409 de research R6, hasta
  poner en verde T055.
- [ ] T059 [US3] Añadir `update` en `supplier.controller.ts` y `PUT /:id` (editar) con su `@openapi` en
  `supplier.routes.ts`, hasta poner en verde T056.
- [ ] T060 [US3] Añadir `updateSupplier` en `suppliersApi.ts` y el thunk con `save.conflict` en
  `suppliersSlice.ts`; modo edición en `SupplierFormPage.tsx` (precarga, `BackLink` a la ficha, avisos de
  conflicto y de permiso); ruta `proveedores/:id/editar` (`level="edit"`) en `AppRouter.tsx`; botón «Editar
  proveedor» en `SupplierDetailPage.tsx`; hasta poner en verde T057.

**Checkpoint**: US3 completa.

---

## Phase 6: User Story 4 - Dar de baja y reactivar un proveedor (Priority: P2)

**Goal**: dar de baja con confirmación y reactivar desde la ficha, sin borrar nada (FR-017 a FR-019).

**Independent Test**: se da de baja un proveedor, desaparece del listado y baja el contador; con «Mostrar dados de
baja» aparece con «Baja»; «Reactivar» lo devuelve; no existe forma de borrarlo.

### Tests de US4 (primero, deben fallar) ⚠️

- [ ] T061 [P] [US4] Tests de `setSupplierActive` en `supplier.service.test.ts`: baja y reactivación suben
  `version` y cambian `updatedBy` sin tocar otros datos; versión antigua → 409; 404.
- [ ] T062 [P] [US4] Tests de `PATCH /api/suppliers/:id/status` en `supplier.routes.test.ts`: 200; 400 (`active`
  o `version` ausentes); 404; 409; 403 Almacén; y que `DELETE /api/suppliers/:id` responde 404 `NOT_FOUND`
  (no hay ruta, FR-018).
- [ ] T063 [P] [US4] Tests de `SupplierStatusDialog` en
  `apps/client/src/features/suppliers/components/SupplierStatusDialog.test.tsx` y de la ficha: «Dar de baja» abre
  «¿Dar de baja a <nombre>?» con el texto de contracts/suppliers-ui.md, «Cancelar» y «Dar de baja»; al confirmar
  aparece «<nombre> dado de baja.» y el sello «Baja»; «Reactivar» sin diálogo → «<nombre> reactivado.»; error dentro
  del diálogo.

### Implementación de US4

- [ ] T064 [US4] Añadir `supplierStatusSchema` (`active` booleano + `version`) en `supplier.validation.ts` e
  implementar `setSupplierActive(id, input, actor)` en `supplier.service.ts` con la misma comprobación de versión
  que `updateSupplier`, hasta poner en verde T061.
- [ ] T065 [US4] Añadir `setStatus` en `supplier.controller.ts` y `PATCH /:id/status` (editar) con su `@openapi`
  en `supplier.routes.ts`, hasta poner en verde T062.
- [ ] T066 [US4] Añadir `setSupplierStatus` en `suppliersApi.ts` y el thunk `setSupplierActive` en
  `suppliersSlice.ts`; crear `SupplierStatusDialog.tsx` y conectar «Dar de baja» / «Reactivar» en
  `SupplierDetailPage.tsx` (solo con permiso de editar), hasta poner en verde T063.

**Checkpoint**: las cuatro historias completas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T067 Reescribir `e2e/suppliers.spec.ts` con `seedSuppliers`/`removeSuppliers`: listado con datos y
  trimestre; ficha a pantalla completa y vuelta con la flecha conservando criterios; alta con errores y correcta;
  CIF duplicado; edición y diálogo de descartar; baja y reactivación; Almacén sin acciones de edición y con acceso
  denegado en `/proveedores/nuevo`; enlace a proveedor inexistente; versión móvil.
- [ ] T068 [P] Documentar `BackLink` y `TextArea` en la sección Componentes de `docs/design/README.md`.
- [ ] T069 [P] Comprobar en `/api-docs` que los 5 endpoints coinciden con
  `specs/010-suppliers-management/contracts/suppliers-api.openapi.yaml`.
- [ ] T070 Revisar el tamaño y la responsabilidad única de las funciones nuevas (principio IV) y que no hay UI
  duplicada (principio VIII) en `apps/server/src/modules/suppliers/` y `apps/client/src/features/suppliers/`.
- [ ] T071 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde, y recorrer la prueba
  manual de `specs/010-suppliers-management/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US2 (Phase 3)**: depende de Foundational.
- **US1 (Phase 4)**: depende de Foundational y de la ruta y la página de ficha de US2 (el alta termina abriéndola).
- **US3 (Phase 5)**: depende de US1 (reutiliza `SupplierForm`, `supplierForm.ts`, el estado `save` y
  `SupplierFormPage`).
- **US4 (Phase 6)**: depende de US2 (botones en la ficha); es independiente de US1 y US3.
- **Polish (Phase 7)**: depende de todas las historias.

### Within Each User Story

- Tests primero y en rojo → validación → servicio → controlador y ruta (+ `@openapi`) → API y slice del cliente →
  componentes → página y ruta.
- Cada historia termina con su checkpoint en verde antes de seguir.

### Parallel Opportunities

- Foundational: T002–T010 (tests) en paralelo; T013/T014, T017, T021/T022 y T025 en paralelo con el resto.
- Dentro de cada historia, todos los tests marcados [P] en paralelo.
- US4 puede hacerse en paralelo con US1/US3 una vez terminada US2 (archivos de servicio y slice compartidos:
  coordinar los cambios en `supplier.service.ts`, `supplier.routes.ts` y `suppliersSlice.ts`).

---

## Parallel Example: Foundational

```text
Task: "T002 Tests de isValidSpanishTaxId en packages/shared/src/utils/taxId.test.ts"
Task: "T003 Tests de isValidIban en packages/shared/src/utils/iban.test.ts"
Task: "T007 Tests de BackLink en apps/client/src/components/BackLink.test.tsx"
Task: "T008 Tests de TextArea en apps/client/src/components/TextArea.test.tsx"
```

## Parallel Example: User Story 1

```text
Task: "T038 Tests de supplierInputSchema en supplier.validation.test.ts"
Task: "T041 Tests de supplierForm.ts"
Task: "T042 Tests de SupplierContactsField"
Task: "T043 Tests de SupplierForm"
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Setup y Foundational.
2. US2: ficha con proveedores sembrados → validar.
3. US1: alta → validar. **Parar y demostrar**: ya se pueden registrar y consultar proveedores.

### Incremental Delivery

1. Base → listado real.
2. + US2 → consulta.
3. + US1 → alta (MVP).
4. + US3 → edición con control de conflictos.
5. + US4 → baja y reactivación.
6. Polish → E2E, documentación y quality gates.

### Notes

- [P] = archivos distintos y sin dependencias pendientes.
- Commit al terminar cada tarea o grupo lógico (Conventional Commits, en español, como en 009).
- Fuera de alcance (spec): credenciales de la web (011), productos asociados y pedido de compra, modelo 347,
  migración desde el sistema anterior.
