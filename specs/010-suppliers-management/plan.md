# Implementation Plan: Gestión de proveedores

**Branch**: `010-suppliers-management` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-suppliers-management/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Proveedores deja de ser una pantalla provisional (009) y pasa a guardar proveedores de verdad, en web y escritorio:

- **Listado** con búsqueda por nombre o CIF, filtro de bajas, selector de trimestre y columnas proveedor (con
  población y sello «Baja»), CIF, plazo, gasto del trimestre y compras del año, ahora con datos reales.
- **Ficha a pantalla completa** en su propia ruta, con flecha de retorno que vuelve al listado tal como estaba.
- **Alta y edición** a pantalla completa, con validación de NIF/CIF español (salvo extranjeros), IBAN, código
  postal, contactos y pedido mínimo; aviso de conflicto si otro usuario cambió el proveedor.
- **Baja y reactivación**, sin borrado.
- Quién creó y quién modificó por última vez cada proveedor.

Las compras (año y trimestres) valen 0 hasta que exista el módulo de compras; el plan deja una costura explícita
para conectarlo.

Enfoque técnico:

- **Shared**: tipos `SupplierInput`, `SupplierDetail`, `SupplierContact`, `PaymentMethod`, `AuditUser`; `SupplierListItem` y
  `SupplierListQuery` se amplían (CIF, población, gasto del trimestre, trimestre). Constantes de límites y
  códigos de error. Validadores puros `isValidSpanishTaxId`, `isValidIban` y `normalizeTaxId`, usados por el
  servidor y el cliente (R3).
- **Servidor**: primer `supplier.model.ts` (colección `suppliers`, índice único por CIF normalizado, auditoría
  en el propio documento y versión para la concurrencia optimista). Rutas nuevas `GET /:id`, `POST /`,
  `PUT /:id` y `PATCH /:id/status`, con `requirePermission('proveedores', 'edit')` en las escrituras. Errores
  409 `SUPPLIER_CIF_TAKEN` y `SUPPLIER_VERSION_CONFLICT`, 404 `SUPPLIER_NOT_FOUND` (R1, R2, R4–R6).
- **Cliente**: rutas `/proveedores`, `/proveedores/nuevo`, `/proveedores/:id` y `/proveedores/:id/editar`.
  Páginas `SupplierDetailPage` y `SupplierFormPage`; el slice `suppliers` gana estado de ficha y de guardado.
  Componentes genéricos nuevos `BackLink` y `TextArea` (R8, R9).
- **Diseño**: tablero «Proveedores» del lienzo, ya publicado y copiado en `docs/design/canvas/` (FR-024).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**:
- Las existentes. Servidor: Express 5.1, Mongoose 8.24, zod 3.24 y swagger-jsdoc 6.2.
- Cliente: React 19, React Router 7.18 (`createBrowserRouter`, `useBlocker`, `useSearchParams`) y Redux
  Toolkit 2.5.
- **Sin dependencias nuevas**: la validación de NIF/CIF e IBAN se implementa en `packages/shared` (R3).

**Storage**: MongoDB 8.0, colección nueva `suppliers` con índices único por `cif`, por `name` (con collation
`es`) y por `active` (R1).

**Testing**: Jest 30 + ts-jest; supertest + mongodb-memory-server en el servidor; Testing Library + jsdom en
el cliente; Playwright para E2E con proveedores sembrados (`e2e/support/db.ts`).

**Target Platform**: navegadores actuales y Electron 34 con el backend embebido (002), sin cambios en
`apps/desktop`.

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `packages/shared`).

**Performance Goals**: con 1.000 proveedores, listado, búsqueda y apertura de ficha en menos de 2 s (SC-006):
consulta paginada con índices y una sola petición por ficha.

**Constraints**:
- Nunca se borra un proveedor (FR-018): no hay ruta `DELETE`.
- CIF único entre activos y bajas, comparado normalizado (FR-005).
- Ninguna escritura sobrescribe en silencio un cambio de otro usuario (FR-011).
- Importes con `UserMoney` / `UserMoneyField` (CLAUDE.md); plazo nunca como importe (FR-025).
- Las credenciales de la web del proveedor no se tocan (spec 011).
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**:
- 5 endpoints (1 modificado, 4 nuevos).
- 1 modelo nuevo.
- 2 páginas nuevas y 4 rutas de cliente; 2 componentes genéricos nuevos.
- Validadores compartidos con tests propios.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | Todo en `apps/server/src/modules/suppliers/` (ahora con modelo) y `apps/client/src/features/suppliers/`. Los validadores fiscales van a `packages/shared` porque los usan las dos apps. | ✅ |
| II. Contrato API primero | Cada ruta nueva lleva su `@openapi` en `supplier.routes.ts` en el mismo commit; envelope con `sendSuccess`; errores con `AppError` y códigos en `SUPPLIER_ERROR_CODES`. | ✅ |
| III. Validación en el borde | `supplierIdParams`, `supplierInputSchema` (alta y edición con `version`), `supplierStatusSchema` y el `supplierListQuerySchema` ampliado, todos en `supplier.validation.ts`. | ✅ |
| IV. Funciones cortas y capas | Controlador solo HTTP; servicio con funciones pequeñas (`createSupplier`, `updateSupplier`, `setSupplierActive`, `getSupplier`, `listSuppliers`, mapeo a DTO aparte); el modelo solo esquema. Nunca se devuelve un documento de Mongoose (`toSupplierDetail`, `toSupplierListItem`). | ✅ |
| V. Cambios mínimos | Se amplía lo de 009 en su sitio; no se refactorizan 006/007 ni el módulo de usuarios. El test de 009 que exige «sin Mongoose» se reescribe porque la spec lo deja obsoleto. | ✅ |
| VI. Tipos compartidos únicos | Tipos, constantes, códigos de error y validadores en `packages/shared`. | ✅ |
| VII. Testing obligatorio | Tests de servicio y de rutas con mongodb-memory-server, unitarios de shared y de cliente, tests de los dos componentes genéricos nuevos y E2E. | ✅ |
| VIII. Componentes reutilizables | Reutiliza `TextField`, `Select`, `Checkbox`, `Dialog`, `Alert`, `Button`, `IconButton`, `StatusStamp`, `Table`, `EmptyState`, `UserMoney`, `UserMoneyField`. Crea `BackLink` y `TextArea` como genéricos con tests, porque no existen (R9). | ✅ |
| Restricciones | Sin dependencias nuevas. Sin cambio de arquitectura que requiera ADR. Diseño ya sincronizado con el lienzo. | ✅ |

**Re-check post-design**: sin cambios. El contrato OpenAPI, el contrato de UI y el modelo de datos respetan los
ocho principios. Complexity Tracking recoge las desviaciones.

## Project Structure

### Documentation (this feature)

```text
specs/010-suppliers-management/
├── plan.md                          # Este fichero
├── research.md                      # Phase 0 (R1–R12)
├── data-model.md                    # Phase 1: modelo, DTO, validaciones y estados
├── quickstart.md                    # Phase 1: validación de principio a fin
├── contracts/
│   ├── suppliers-api.openapi.yaml   # 5 endpoints
│   └── suppliers-ui.md              # Rutas, pantallas, estados y textos
├── checklists/requirements.md
└── tasks.md                         # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/supplier.ts                  # ampliado: SupplierListItem (+cif, city, quarterPurchases),
│                                      #   SupplierListQuery (+quarter), SupplierContact, PaymentMethod,
│                                      #   SupplierInput, SupplierDetail, SupplierStatusInput
├── constants/suppliers.ts             # ampliado: límites, PAYMENT_METHODS, SUPPLIER_ERROR_CODES, QUARTERS
├── utils/taxId.ts (+ .test.ts)        # nuevo: normalizeTaxId, isValidSpanishTaxId
├── utils/iban.ts (+ .test.ts)         # nuevo: normalizeIban, isValidIban, formatIban
└── index.ts                           # exporta lo nuevo

apps/server/src/
├── modules/suppliers/
│   ├── supplier.model.ts              # nuevo: SupplierModel
│   ├── supplier.routes.ts             # + GET /:id, POST /, PUT /:id, PATCH /:id/status con @openapi
│   ├── supplier.controller.ts         # + get, create, update, setStatus
│   ├── supplier.service.ts            # listado real + get/create/update/setActive
│   ├── supplier.mapper.ts             # nuevo: toSupplierListItem, toSupplierDetail
│   ├── supplierPurchases.ts           # nuevo: costura de compras (devuelve 0 hasta el módulo de compras)
│   ├── supplier.validation.ts         # + supplierIdParams, supplierInputSchema, supplierStatusSchema, quarter
│   ├── supplier.service.test.ts       # reescrito
│   └── supplier.routes.test.ts        # ampliado
e2e/support/db.ts                      # + seedSuppliers / removeSuppliers

apps/client/src/
├── components/
│   ├── BackLink.tsx (+ .module.css, .test.tsx)    # nuevo: flecha de retorno
│   └── TextArea.tsx (+ .module.css, .test.tsx)    # nuevo: área de texto con etiqueta y error
├── features/suppliers/
│   ├── suppliersApi.ts (+ .test.ts)               # + fetchSupplier, createSupplier, updateSupplier, setSupplierStatus
│   ├── suppliersSlice.ts (+ .test.ts)             # + detalle, guardado, conflicto
│   ├── supplierCriteria.ts (+ .test.ts)           # + trimestre (`quarter=1…4`, omitido si es el en curso)
│   ├── supplierForm.ts (+ .test.ts)               # nuevo: valores del formulario ↔ SupplierInput, validación
│   └── components/
│       ├── SupplierFilters.tsx                    # + selector de trimestre
│       ├── SuppliersTable.tsx                     # + CIF, población, gasto del trimestre; filas como enlace
│       ├── SupplierDetailView.tsx (+ css, test)   # nuevo: secciones de la ficha
│       ├── SupplierForm.tsx (+ css, test)         # nuevo: formulario completo
│       ├── SupplierContactsField.tsx (+ test)     # nuevo: teléfonos y correos con etiqueta
│       └── SupplierStatusDialog.tsx (+ test)      # nuevo: confirmación de baja
├── pages/
│   ├── SuppliersPage.tsx                          # + aviso de proveedor inexistente, foco al volver, «Nuevo proveedor»
│   ├── SupplierDetailPage.tsx (+ css, test)       # nuevo
│   └── SupplierFormPage.tsx (+ css, test)         # nuevo (alta y edición; useBlocker al salir con cambios)
└── routes/AppRouter.tsx                           # rutas hijas de 'proveedores'

e2e/suppliers.spec.ts                              # reescrito: alta, ficha, edición, baja
docs/design/README.md                              # componentes BackLink y TextArea
```

**Structure Decision**: monorepo existente, organizado por dominio (constitución I). El dominio `suppliers`
crece en su sitio; solo salen de él los validadores fiscales (shared) y los dos genéricos de UI (components).

## Notas de diseño

- El tablero «Proveedores» del lienzo (versión `1793034141-8cb8`) es la referencia de la ficha, el formulario y
  sus estados. Las cifras de ejemplo del tablero no son reales: en esta entrega las compras valen 0.
- El aviso breve de guardado se muestra con `Alert variant="info"` en la ficha, no con un toast: no hay
  componente de toast y crear uno no lo exige la spec (R9).
- La sección «Acceso a la web del proveedor» no se implementa (spec 011).

## Complexity Tracking

| Desviación | Por qué hace falta | Alternativa descartada |
|---|---|---|
| La auditoría de proveedores se guarda en el propio documento (`createdBy`, `updatedBy`) y no en una colección de auditoría como usuarios (003). | La spec pide solo creación y último cambio, sin historial (FR-012b, clarificación del 2026-10-26). | Reutilizar el patrón de `userAudit`: guarda un historial que nadie consulta y obliga a leer otra colección para pintar el pie de la ficha. |
| Concurrencia optimista con un campo `version` explícito, primera vez en el proyecto. | FR-011: no sobrescribir en silencio. | `optimisticConcurrency` de Mongoose: solo funciona con `doc.save()` y no viaja al cliente; última escritura gana: incumple FR-011. |
