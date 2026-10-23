# Implementation Plan: Pantalla provisional de Proveedores

**Branch**: `009-suppliers-placeholder` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-suppliers-placeholder/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Proveedores pasa de «Pendiente» a módulo implementado, en web y escritorio, con la estructura del diseño
«Albarán»:

- Búsqueda por nombre o CIF y filtro «Mostrar dados de baja», que viven en la dirección de la pantalla junto con
  la página.
- Contador «N activos» / «N proveedores» según el filtro.
- Listado con las columnas Proveedor, Plazo (oculta en móvil) y Compras año, y marca «Baja» en los dados de baja.
- Tres estados: cargando, aviso de proveedores pendientes de carga y error con «Reintentar».

El servidor expone ya el contrato definitivo del listado, pero responde siempre vacío sin tocar la base de
datos. Sigue el patrón de 006-products-placeholder y 007-customers-placeholder, ya en `develop`.

Enfoque técnico:

- **Shared**: tipos `SupplierListItem`/`SupplierListQuery` y constantes `SUPPLIER_SEARCH_MAX_LENGTH` y
  `SUPPLIERS_PAGE_SIZE`. Reutiliza `ListPage<T>`. `IMPLEMENTED_MODULES` incluye `proveedores` (R5, R11).
- **Servidor**: módulo `suppliers` con `routes → controller → service`, sin modelo. `GET /api/suppliers` con
  `requireAuth` + `requirePermission('proveedores', 'view')`, query validada con zod (`q`, `includeInactive`,
  `page`) y `@openapi` (R1–R4).
- **Cliente**:
  - Feature `suppliers`: `suppliersApi`, `suppliersSlice` (con descarte de respuestas obsoletas),
    `supplierCriteria` (dirección ↔ criterios), `formatLeadTime` y componentes `SupplierFilters`,
    `SuppliersTable` y `SuppliersListStatus`.
  - Página `SuppliersPage` y ruta `/proveedores`.
  - Reutiliza `EmptyState`, `useDebouncedValue`, `Table`, `Alert`, `Button`, `TextField`, `Checkbox`,
    `StatusStamp` y `UserMoney`. **Sin componentes genéricos nuevos** (R7).
- **Diseño**: `docs/design/README.md` registra el uso en Proveedores, el filtro «Mostrar dados de baja», el sello
  «Baja» y el placeholder «Nombre o CIF» (R12).
- **Tests existentes**: se ajustan los que usaban Proveedores como módulo pendiente de ejemplo (R11).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**:
- Las existentes. Servidor: Express 5.1, zod 3.24 y swagger-jsdoc 6.2.
- Cliente: React 19, React Router 7.18 (`useSearchParams`) y Redux Toolkit 2.5 (`createAsyncThunk` con
  `requestId`/`abort`).
- **Sin dependencias nuevas** (R12).

**Storage**: ninguno nuevo. No se crea colección ni modelo de proveedores (FR-009, R3).

**Testing**: Jest 30 + ts-jest; supertest + mongodb-memory-server en el servidor; Testing Library + jsdom en
el cliente; Playwright para E2E (ADR 0004).

**Target Platform**: navegadores actuales y Electron 34 con el backend embebido (002), sin cambios en
`apps/desktop`.

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `packages/shared`).

**Performance Goals**: el aviso aparece en menos de 2 s desde que se abre la pantalla (SC-004): una sola
petición sin acceso a la base de datos. Una petición por pausa al teclear (debounce de 300 ms); el filtro pide
el listado al momento.

**Constraints**:
- Ninguna lectura ni escritura de proveedores en la base de datos (FR-009).
- La respuesta tiene ya la forma definitiva, con el estado de cada proveedor (FR-010).
- Solo se muestra la última respuesta (FR-007).
- Nunca se ven a la vez el aviso de «sin datos» y el error (SC-003).
- Compras del año con `UserMoney`; plazo como «N días», nunca importe (FR-016).
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**:
- 1 endpoint.
- 1 feature de cliente nueva y 1 página.
- 2 ficheros nuevos en shared (más su test).
- Ajustes en `AppRouter`, `store`, `app.ts`, `modules.ts`, `index.ts` de shared, el README de diseño y 5
  ficheros de tests existentes (`modules.test`, `navItems.test`, `AppearanceForm.pendingModules`,
  `homeRoute.test` y `e2e/navigation.spec`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | Servidor en `apps/server/src/modules/suppliers/`; cliente en `apps/client/src/features/suppliers/`. No hay piezas transversales nuevas. | ✅ |
| II. Contrato API primero | `GET /suppliers` con su bloque `@openapi` en `supplier.routes.ts` y en el mismo commit que la ruta; envelope con `sendSuccess`; errores con `AppError` (401 y 403 desde los middlewares existentes). | ✅ |
| III. Validación en el borde | `supplierListQuerySchema` (zod) en `supplier.validation.ts`, aplicado con `validate({ query })` antes del controlador. | ✅ |
| IV. Funciones cortas y capas | El controlador solo lee `req.query` y llama a `listSuppliers`. El servicio es una función pura de pocas líneas. No hay modelo todavía, pero ningún controlador accede a Mongoose. El cliente se divide en `SupplierFilters`, `SuppliersTable` y `SuppliersListStatus`. | ✅ |
| V. Cambios mínimos | Se tocan solo `app.ts`, `AppRouter`, `store`, `modules.ts`, `index.ts` de shared, el README de diseño y los tests que usaban Proveedores como pendiente. No se refactoriza el código de 006 ni de 007 (R8, R10). | ✅ |
| VI. Tipos compartidos únicos | `SupplierListItem`, `SupplierListQuery` y las constantes viven en `packages/shared`; `ListPage<T>` se reutiliza. | ✅ |
| VII. Testing obligatorio | Tests de servicio y de rutas (supertest + mongodb-memory-server), unitarios de cliente y E2E de la pantalla. | ✅ |
| VIII. Componentes reutilizables | La pantalla compone `Table`, `TextField`, `Checkbox`, `StatusStamp`, `Alert`, `Button`, `EmptyState` y `UserMoney`. La API se llama solo desde los thunks del slice. | ✅ |
| Restricciones | Sin dependencias nuevas. Sin cambio de arquitectura que requiera ADR. | ✅ |

**Re-check post-design**: sin cambios. Los artefactos de Phase 1 (contrato OpenAPI, contrato de UI y modelo
de tipos) respetan los ocho principios. Complexity Tracking recoge las desviaciones.

## Project Structure

### Documentation (this feature)

```text
specs/009-suppliers-placeholder/
├── plan.md                          # Este fichero
├── research.md                      # Phase 0 (R1–R12)
├── data-model.md                    # Phase 1: tipos compartidos y estado del cliente
├── quickstart.md                    # Phase 1: validación de principio a fin
├── contracts/
│   ├── suppliers-api.openapi.yaml   # GET /api/suppliers
│   └── suppliers-ui.md              # Ruta, dirección, estructura y estados de la pantalla
├── checklists/requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/supplier.ts                  # nuevo: SupplierListItem, SupplierListQuery
├── constants/suppliers.ts             # nuevo: SUPPLIER_SEARCH_MAX_LENGTH, SUPPLIERS_PAGE_SIZE
├── constants/modules.ts               # IMPLEMENTED_MODULES += 'proveedores'
├── constants/modules.test.ts          # ajustado
└── index.ts                           # exporta lo nuevo

apps/server/src/
├── app.ts                             # app.use('/api/suppliers', supplierRouter)
└── modules/suppliers/                 # nuevo
    ├── supplier.routes.ts             # GET / con @openapi
    ├── supplier.controller.ts
    ├── supplier.service.ts            # listSuppliers(): página vacía
    ├── supplier.validation.ts         # supplierListQuerySchema
    ├── supplier.service.test.ts
    └── supplier.routes.test.ts

apps/client/src/
├── features/suppliers/                                                 # nuevo
│   ├── suppliersApi.ts (+ .test.ts)
│   ├── suppliersSlice.ts (+ .test.ts)
│   ├── supplierCriteria.ts (+ .test.ts)   # dirección ↔ criterios
│   ├── formatLeadTime.ts (+ .test.ts)     # «N días» / «1 día» / «—»
│   └── components/
│       ├── SupplierFilters.tsx (+ .module.css, .test.tsx)
│       ├── SuppliersTable.tsx (+ .module.css, .test.tsx)
│       └── SuppliersListStatus.tsx (+ .module.css, .test.tsx)
├── pages/SuppliersPage.tsx (+ .module.css, .test.tsx)                  # nuevo
├── routes/AppRouter.tsx                # ruta 'proveedores' con RequireAuth
├── routes/homeRoute.test.ts            # ajustado: otro módulo pendiente de ejemplo
├── store/store.ts                      # suppliers: suppliersReducer
├── features/navigation/navItems.test.ts                                # ajustado
└── features/preferences/components/AppearanceForm.pendingModules.test.tsx   # ajustado

e2e/
├── suppliers.spec.ts                   # nuevo
└── navigation.spec.ts                  # ajustado: Cobros como pendiente de ejemplo

docs/design/README.md                   # uso en Proveedores, filtro de bajas, sello «Baja», «Nombre o CIF»
```

**Structure Decision**: monorepo existente, organizado por dominio (constitución I). El dominio `suppliers` se
crea completo en servidor y cliente, con la misma forma que `products` y `customers`. No hay piezas
transversales nuevas.

## Notas de diseño

- El lienzo no tiene el filtro «Mostrar dados de baja», el sello «Baja» ni el placeholder «Nombre o CIF»
  (clarificaciones del 2026-10-23): se documentan en el README de diseño y el lienzo se actualiza más adelante.
- El lienzo no fija cuántos proveedores por página; se usan 10, como Productos y Clientes.
- El subtítulo de la fila del lienzo (productos asociados) no se muestra en esta entrega.

## Complexity Tracking

| Desviación | Por qué hace falta | Alternativa descartada |
|---|---|---|
| Módulo `suppliers` sin `supplier.model.ts` (principio I, que lista el modelo dentro del módulo). | FR-009: en esta entrega el servidor no lee ni escribe proveedores. Es temporal: el modelo llega con la spec de migración. | Crear ya un modelo sin uso: fija un esquema que no se puede validar contra la base antigua. |
| `SuppliersListStatus`, `supplierCriteria` y `suppliersSlice` repiten la forma de sus equivalentes de 006 y 007. Es el tercer listado que lo hace. | Constitución V: no refactorizar 006 ni 007 sin confirmación explícita. | Extraer ahora `ListStatus`, un `listCriteria` y un slice de listado genéricos: refactor de código ya entregado. **Se propone como spec propia** (ver research R10). |
