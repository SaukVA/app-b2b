# Implementation Plan: Pantalla provisional de Productos

**Branch**: `006-products-placeholder` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-products-placeholder/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Productos pasa de «Pendiente» a módulo implementado, en web y escritorio, con la estructura del diseño
«Albarán»:

- Búsqueda y filtros, que viven en la dirección de la pantalla.
- Listado con sus columnas.
- Tres estados: cargando, aviso de catálogo pendiente de carga y error con «Reintentar».

El servidor expone ya el contrato definitivo del listado, pero responde siempre vacío sin tocar la base de
datos.

Enfoque técnico:

- **Shared**: `ListPage<T>` genérico, tipos `ProductListItem`/`ProductListQuery`/`ProductStatus`, constantes
  y la regla `productStatus` (FR-011a). `IMPLEMENTED_MODULES` incluye `productos` (R5, R9).
- **Servidor**: módulo `products` con `routes → controller → service`, sin modelo. `GET /api/products` con
  `requireAuth` + `requirePermission('productos', 'view')`, query validada con zod y `@openapi` (R1–R4).
- **Cliente**:
  - Feature `products`: `productsApi`, `productsSlice` (con descarte de respuestas obsoletas),
    `productCriteria` (dirección ↔ criterios) y componentes `ProductFilters`, `ProductsTable` y
    `ProductsListStatus`.
  - Página `ProductsPage` y ruta `/productos`.
  - Genéricos nuevos `EmptyState` y `useDebouncedValue`, reutilizables por 007 (R6–R8, R10).
- **Diseño**: `EmptyState` y el error del listado se documentan en `docs/design/README.md` (R11).
- **Tests existentes**: se ajustan los que usaban Productos como módulo pendiente o esperaban aterrizar en
  Apariencia (R9).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**:
- Las existentes. Servidor: Express 5.1, zod 3.24 y swagger-jsdoc 6.2.
- Cliente: React 19, React Router 7.18 (`useSearchParams`) y Redux Toolkit 2.5 (`createAsyncThunk` con
  `requestId`/`abort`).
- **Sin dependencias nuevas** (R12).

**Storage**: ninguno nuevo. No se crea colección ni modelo de productos (FR-010, R3).

**Testing**: Jest 30 + ts-jest; supertest + mongodb-memory-server en el servidor; Testing Library + jsdom en
el cliente; Playwright para E2E (ADR 0004).

**Target Platform**: navegadores actuales y Electron 34 con el backend embebido (002), sin cambios en
`apps/desktop`.

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `packages/shared`).

**Performance Goals**: el aviso aparece en menos de 2 s desde que se abre la pantalla (SC-004). En la
práctica es una sola petición sin acceso a la base de datos. Una petición por pausa al teclear (debounce de
300 ms).

**Constraints**:
- Ninguna lectura ni escritura de productos en la base de datos (FR-010).
- La respuesta tiene ya la forma definitiva (FR-011).
- Solo se muestra la última respuesta (FR-008).
- Nunca se ven a la vez el aviso de «sin datos» y el error (SC-003).
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**:
- 1 endpoint.
- 1 feature de cliente nueva y 1 página.
- 2 piezas genéricas nuevas (`EmptyState`, `useDebouncedValue`).
- 3 ficheros nuevos en shared.
- Ajustes en `AppRouter`, `store`, `app.ts`, `modules.ts` y unos 5 ficheros de tests existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | Servidor en `apps/server/src/modules/products/`; cliente en `apps/client/src/features/products/`. Solo `EmptyState` (en `components/`) y `useDebouncedValue` (en `hooks/`) son transversales, por ser genéricos. | ✅ |
| II. Contrato API primero | `GET /products` con su bloque `@openapi` en `product.routes.ts` y en el mismo commit que la ruta; envelope con `sendSuccess`; errores con `AppError` (403 y 401 desde los middlewares existentes). | ✅ |
| III. Validación en el borde | `productListQuerySchema` (zod) en `product.validation.ts`, aplicado con `validate({ query })` antes del controlador. | ✅ |
| IV. Funciones cortas y capas | El controlador solo lee `req.query` y llama a `listProducts`. El servicio es una función pura de pocas líneas. No hay modelo todavía: la capa `model` no existe, pero ningún controlador accede a Mongoose. Los componentes del cliente se dividen en `ProductFilters`, `ProductsTable` y `ProductsListStatus`. | ✅ |
| V. Cambios mínimos | Se tocan solo `app.ts`, `AppRouter`, `store`, `modules.ts`, `index.ts` de shared, el README de diseño y los tests que dependían de que Productos estuviera pendiente. Sin refactors. | ✅ |
| VI. Tipos compartidos únicos | `ProductListItem`, `ProductListQuery`, `ProductStatus`, `ListPage<T>` y la regla `productStatus` viven en `packages/shared`. | ✅ |
| VII. Testing obligatorio | Tests de servicio y de rutas (supertest + mongodb-memory-server), unitarios de shared y cliente, tests propios de `EmptyState` y `useDebouncedValue`, y E2E de la pantalla. | ✅ |
| VIII. Componentes reutilizables | La pantalla compone `Table`, `TextField`, `Select`, `Checkbox`, `StatusStamp`, `Alert`, `Button` y `UserMoney`. `EmptyState` es nuevo y genérico, se documenta en el README de diseño y 007 lo reutiliza. La API se llama solo desde los thunks del slice. | ✅ |
| Restricciones | Sin dependencias nuevas. No hay cambio de arquitectura que requiera ADR: un módulo sin modelo es una consecuencia temporal de FR-010, no una decisión de arquitectura. | ✅ |

**Re-check post-design**: sin cambios. Los artefactos de Phase 1 (contrato OpenAPI, contrato de UI y modelo
de tipos) respetan los ocho principios. Complexity Tracking recoge la única desviación temporal (módulo sin
modelo, FR-010).

## Project Structure

### Documentation (this feature)

```text
specs/006-products-placeholder/
├── plan.md                         # Este fichero
├── research.md                     # Phase 0 (R1–R12)
├── data-model.md                   # Phase 1: tipos compartidos y estado del cliente
├── quickstart.md                   # Phase 1: validación de principio a fin
├── contracts/
│   ├── products-api.openapi.yaml   # GET /api/products
│   └── products-ui.md              # Ruta, dirección, estructura y estados de la pantalla
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/api.ts                       # + ListPage<T>
├── types/product.ts                   # nuevo: ProductStatus, ProductListItem, ProductListQuery
├── constants/products.ts              # nuevo: constantes y productStatus()
├── constants/products.test.ts         # nuevo
├── constants/modules.ts               # IMPLEMENTED_MODULES += 'productos'
├── constants/modules.test.ts          # ajustado
└── index.ts                           # exporta lo nuevo

apps/server/src/
├── app.ts                             # app.use('/api/products', productRouter)
└── modules/products/                  # nuevo
    ├── product.routes.ts              # GET / con @openapi
    ├── product.controller.ts
    ├── product.service.ts             # listProducts(): página vacía
    ├── product.validation.ts          # productListQuerySchema
    ├── product.service.test.ts
    └── product.routes.test.ts
apps/server/src/modules/preferences/preferences.pendingModules.test.ts   # ajustado: otro módulo pendiente

apps/client/src/
├── components/EmptyState.tsx (+ .module.css, .test.tsx)                # nuevo, genérico
├── hooks/useDebouncedValue.ts (+ .test.ts)                             # nuevo, genérico
├── features/products/                                                  # nuevo
│   ├── productsApi.ts
│   ├── productsSlice.ts (+ .test.ts)
│   ├── productCriteria.ts (+ .test.ts)    # dirección ↔ criterios
│   └── components/
│       ├── ProductFilters.tsx (+ .module.css, .test.tsx)
│       ├── ProductsTable.tsx (+ .test.tsx)
│       └── ProductsListStatus.tsx (+ .test.tsx)
├── pages/ProductsPage.tsx (+ .module.css, .test.tsx)                   # nuevo
├── routes/AppRouter.tsx                # ruta 'productos' con RequireAuth
├── store/store.ts                      # products: productsReducer
└── features/preferences/components/AppearanceForm.pendingModules.test.tsx   # ajustado

e2e/
├── products.spec.ts                    # nuevo
├── navigation.spec.ts                  # ajustado
└── smoke.spec.ts                       # ajustado si espera aterrizar en Apariencia

docs/design/README.md                   # EmptyState y error del listado
```

**Structure Decision**: monorepo existente, organizado por dominio (constitución I). El dominio `products` se
crea completo en servidor y cliente. Las únicas piezas transversales nuevas son genéricas y sin lógica de
negocio.

## Notas de diseño

- El tablero `Productos.dc.html` rotula la columna del código como «CIF». Es un error del lienzo: el CIF
  identifica a empresas, no a productos. La pantalla usa «Código» y conviene corregir el lienzo cuando se
  actualice (R11).
- `DEFAULT_HOME_SCREEN` es `productos` desde 001. Al implementarse el módulo, los roles que lo ven vuelven a
  aterrizar en `/productos` tras el login, y deja de valer «todos empiezan en Ajustes › Apariencia» (caso
  límite de 005).

## Complexity Tracking

| Desviación | Por qué hace falta | Alternativa descartada |
|---|---|---|
| Módulo `products` sin `product.model.ts` (principio I, que lista el modelo dentro del módulo). | FR-010: en esta entrega el servidor no lee ni escribe productos. Es temporal: el modelo llega con la spec de migración del catálogo. | Crear ya un modelo sin uso: añade un esquema que no se puede validar contra los datos reales de la base antigua. |
