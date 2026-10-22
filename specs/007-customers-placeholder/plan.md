# Implementation Plan: Pantalla provisional de Clientes

**Branch**: `007-customers-placeholder` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-customers-placeholder/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Clientes pasa de «Pendiente» a módulo implementado, en web y escritorio, con la estructura del diseño
«Albarán»:

- Búsqueda, que vive en la dirección de la pantalla junto con la página.
- Listado con las columnas Cliente (con población), Riesgo usado, Saldo y Último pedido.
- Tres estados: cargando, aviso de cartera pendiente de carga y error con «Reintentar».

El servidor expone ya el contrato definitivo del listado, pero responde siempre vacío sin tocar la base de
datos. Sigue el patrón de 006-products-placeholder, ya en `develop`, y reutiliza sus piezas genéricas.

Enfoque técnico:

- **Shared**: tipos `CustomerListItem`/`CustomerListQuery`/`CustomerRiskLevel`, constantes y las reglas
  `customerRiskUsed` y `customerRiskLevel` (riesgo «Sin límite» y semáforo). Reutiliza `ListPage<T>`.
  `IMPLEMENTED_MODULES` incluye `clientes` (R5, R6, R11).
- **Servidor**: módulo `customers` con `routes → controller → service`, sin modelo. `GET /api/customers` con
  `requireAuth` + `requirePermission('clientes', 'view')`, query validada con zod y `@openapi` (R1–R4).
- **Cliente**:
  - Feature `customers`: `customersApi`, `customersSlice` (con descarte de respuestas obsoletas),
    `customerCriteria` (dirección ↔ criterios), `formatOrderDate` y componentes `CustomerSearch`,
    `CustomersTable` y `CustomersListStatus`.
  - Página `CustomersPage` y ruta `/clientes`.
  - Reutiliza `EmptyState`, `useDebouncedValue`, `Table`, `Alert`, `Button`, `TextField` y `UserMoney`.
  - Genérico nuevo `ProgressBar` para el riesgo usado (R7).
- **Diseño**: `docs/design/README.md` registra el uso en Clientes y documenta `ProgressBar` (R13).
- **Tests existentes**: se ajustan los que usaban Clientes como módulo pendiente (R11).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**:
- Las existentes. Servidor: Express 5.1, zod 3.24 y swagger-jsdoc 6.2.
- Cliente: React 19, React Router 7.18 (`useSearchParams`) y Redux Toolkit 2.5 (`createAsyncThunk` con
  `requestId`/`abort`).
- **Sin dependencias nuevas** (R13).

**Storage**: ninguno nuevo. No se crea colección ni modelo de clientes (FR-009, R3).

**Testing**: Jest 30 + ts-jest; supertest + mongodb-memory-server en el servidor; Testing Library + jsdom en
el cliente; Playwright para E2E (ADR 0004).

**Target Platform**: navegadores actuales y Electron 34 con el backend embebido (002), sin cambios en
`apps/desktop`.

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `packages/shared`).

**Performance Goals**: el aviso aparece en menos de 2 s desde que se abre la pantalla (SC-004): una sola
petición sin acceso a la base de datos. Una petición por pausa al teclear (debounce de 300 ms).

**Constraints**:
- Ninguna lectura ni escritura de clientes en la base de datos (FR-009).
- La respuesta tiene ya la forma definitiva (FR-010).
- Solo se muestra la última respuesta (FR-007).
- Nunca se ven a la vez el aviso de «sin datos» y el error (SC-003).
- Saldo con `UserMoney`; riesgo como porcentaje, nunca importe (FR-016).
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**:
- 1 endpoint.
- 1 feature de cliente nueva y 1 página.
- 1 pieza genérica nueva (`ProgressBar`).
- 2 ficheros nuevos en shared.
- Ajustes en `AppRouter`, `store`, `app.ts`, `modules.ts`, `index.ts` de shared y 6 ficheros de tests
  existentes (`modules.test`, `preferences.pendingModules`, `AppearanceForm.pendingModules`, `navItems`,
  `homeRoute` y `e2e/navigation.spec`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | Servidor en `apps/server/src/modules/customers/`; cliente en `apps/client/src/features/customers/`. Solo `ProgressBar` (en `components/`) es transversal, por ser genérico. | ✅ |
| II. Contrato API primero | `GET /customers` con su bloque `@openapi` en `customer.routes.ts` y en el mismo commit que la ruta; envelope con `sendSuccess`; errores con `AppError` (401 y 403 desde los middlewares existentes). | ✅ |
| III. Validación en el borde | `customerListQuerySchema` (zod) en `customer.validation.ts`, aplicado con `validate({ query })` antes del controlador. | ✅ |
| IV. Funciones cortas y capas | El controlador solo lee `req.query` y llama a `listCustomers`. El servicio es una función pura de pocas líneas. No hay modelo todavía, pero ningún controlador accede a Mongoose. El cliente se divide en `CustomerSearch`, `CustomersTable` y `CustomersListStatus`. | ✅ |
| V. Cambios mínimos | Se tocan solo `app.ts`, `AppRouter`, `store`, `modules.ts`, `index.ts` de shared, el README de diseño y los tests que dependían de que Clientes estuviera pendiente. No se refactoriza el código de 006 (R8, R10). | ✅ |
| VI. Tipos compartidos únicos | `CustomerListItem`, `CustomerListQuery`, `CustomerRiskLevel` y las reglas del riesgo viven en `packages/shared`; `ListPage<T>` se reutiliza. | ✅ |
| VII. Testing obligatorio | Tests de servicio y de rutas (supertest + mongodb-memory-server), unitarios de shared y cliente, test propio de `ProgressBar` y E2E de la pantalla. | ✅ |
| VIII. Componentes reutilizables | La pantalla compone `Table`, `TextField`, `Alert`, `Button`, `EmptyState` y `UserMoney`. `ProgressBar` es nuevo y genérico (ya listado en el README de diseño). La API se llama solo desde los thunks del slice. | ✅ |
| Restricciones | Sin dependencias nuevas. Sin cambio de arquitectura que requiera ADR. | ✅ |

**Re-check post-design**: sin cambios. Los artefactos de Phase 1 (contrato OpenAPI, contrato de UI y modelo
de tipos) respetan los ocho principios. Complexity Tracking recoge las desviaciones.

## Project Structure

### Documentation (this feature)

```text
specs/007-customers-placeholder/
├── plan.md                          # Este fichero
├── research.md                      # Phase 0 (R1–R13)
├── data-model.md                    # Phase 1: tipos compartidos y estado del cliente
├── quickstart.md                    # Phase 1: validación de principio a fin
├── contracts/
│   ├── customers-api.openapi.yaml   # GET /api/customers
│   └── customers-ui.md              # Ruta, dirección, estructura y estados de la pantalla
├── checklists/requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/customer.ts                  # nuevo: CustomerListItem, CustomerListQuery, CustomerRiskLevel
├── constants/customers.ts             # nuevo: constantes, customerRiskUsed(), customerRiskLevel()
├── constants/customers.test.ts        # nuevo
├── constants/modules.ts               # IMPLEMENTED_MODULES += 'clientes'
├── constants/modules.test.ts          # ajustado
└── index.ts                           # exporta lo nuevo

apps/server/src/
├── app.ts                             # app.use('/api/customers', customerRouter)
└── modules/customers/                 # nuevo
    ├── customer.routes.ts             # GET / con @openapi
    ├── customer.controller.ts
    ├── customer.service.ts            # listCustomers(): página vacía
    ├── customer.validation.ts         # customerListQuerySchema
    ├── customer.service.test.ts
    └── customer.routes.test.ts
apps/server/src/modules/preferences/preferences.pendingModules.test.ts   # ajustado: otro módulo pendiente

apps/client/src/
├── components/ProgressBar.tsx (+ .module.css, .test.tsx)               # nuevo, genérico
├── features/customers/                                                 # nuevo
│   ├── customersApi.ts (+ .test.ts)
│   ├── customersSlice.ts (+ .test.ts)
│   ├── customerCriteria.ts (+ .test.ts)   # dirección ↔ criterios
│   ├── formatOrderDate.ts (+ .test.ts)
│   └── components/
│       ├── CustomerSearch.tsx (+ .module.css, .test.tsx)
│       ├── CustomersTable.tsx (+ .module.css, .test.tsx)
│       └── CustomersListStatus.tsx (+ .module.css, .test.tsx)
├── pages/CustomersPage.tsx (+ .module.css, .test.tsx)                  # nuevo
├── routes/AppRouter.tsx                # ruta 'clientes' con RequireAuth
├── store/store.ts                      # customers: customersReducer
└── features/preferences/components/AppearanceForm.pendingModules.test.tsx   # ajustado

e2e/
├── customers.spec.ts                   # nuevo
└── navigation.spec.ts                  # ajustado

docs/design/README.md                   # uso en Clientes, «Sin límite» y ProgressBar
```

**Structure Decision**: monorepo existente, organizado por dominio (constitución I). El dominio `customers` se
crea completo en servidor y cliente, con la misma forma que `products`. La única pieza transversal nueva
(`ProgressBar`) es genérica y sin lógica de negocio.

## Notas de diseño

- El lienzo muestra 8 fichas por página; por la clarificación del 2026-10-22 se usan 10, como en Productos.
  El texto de paginación del README («1–8 de N») es un ejemplo y no cambia.
- El lienzo no tiene el caso «Sin límite» en la columna de riesgo: se documenta en el README y el lienzo se
  actualiza más adelante.

## Complexity Tracking

| Desviación | Por qué hace falta | Alternativa descartada |
|---|---|---|
| Módulo `customers` sin `customer.model.ts` (principio I, que lista el modelo dentro del módulo). | FR-009: en esta entrega el servidor no lee ni escribe clientes. Es temporal: el modelo llega con la spec de migración de la cartera. | Crear ya un modelo sin uso: fija un esquema que no se puede validar contra la base antigua. |
| `CustomersListStatus` y `customerCriteria` repiten la forma de sus equivalentes de 006. | Constitución V: no refactorizar 006 sin confirmación; cada pieza solo tiene textos y criterios propios. | Extraer `ListStatus` y criterios genéricos ahora: refactor de código ya entregado. Se propondrá con el tercer listado. |
