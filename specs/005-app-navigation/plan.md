# Implementation Plan: Menú lateral de navegación

**Branch**: `005-app-navigation` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-app-navigation/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Menú lateral común a todas las pantallas con sesión, en web y escritorio:

- Módulos que el rol puede ver, en orden fijo, y Ajustes siempre.
- Módulo activo marcado.
- Pie con el usuario, su rol, el canal y «Cerrar sesión».
- Módulos no implementados con «Pendiente», sin navegación por ninguna vía.
- Plegado a iconos en pantallas anchas, recordado en el equipo.
- Barra superior en móvil.

Enfoque técnico:

- **Shared**: nueva fuente única `IMPLEMENTED_MODULES` / `isModuleImplemented` (hoy solo `ajustes`), de la
  que se deriva `AVAILABLE_HOME_SCREENS` (R1). Así la pantalla de inicio de 004 y `PATCH /api/preferences`
  dejan de aceptar módulos pendientes sin cambiar su código (R3).
- **Cliente**:
  - Ruta de layout `AppLayout` con el menú para las pantallas con sesión (R4).
  - Rutas solo para módulos implementados; un pendiente cae en la redirección a la pantalla de inicio, y
    `ModulePlaceholder` se retira (R2).
  - Componente genérico `NavBar` (R5), compuesto en `features/navigation/` con permisos, iconos y pie (R6).
  - Estado plegado en el slice `navigation`, persistido en `localStorage['navigation.collapsed']` (R7);
    responsive con el corte de 760 px (R8).
- **Servidor**: sin código nuevo; solo la descripción `@openapi` de `homeScreen` y el ajuste de tests (R3).
- **Diseño**: menú plegado, sello «Pendiente» e iconos de Ventas y Cobros en el lienzo antes de la UI
  (R11, FR-020).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**: las existentes. Cliente: React 19, React Router 7.18 (`NavLink`) y Redux Toolkit
2.5. **Sin dependencias nuevas** (R10).

**Storage**: sin cambios en MongoDB. En el equipo, `localStorage` (`navigation.collapsed`).

**Testing**: Jest 30 + ts-jest y Testing Library + jsdom en el cliente; supertest + mongodb-memory-server en el
servidor; Playwright para E2E (ADR 0004).

**Target Platform**: navegadores actuales y Electron 34 (mismo cliente; `localStorage` persistente en `app://`).

**Project Type**: aplicación web + escritorio en monorepo (`apps/client`, `packages/shared`; `apps/server`
solo con documentación y tests; `apps/desktop` sin cambios).

**Performance Goals**: plegar o desplegar en menos de 1 s (SC-004), en la práctica en un solo render; sin
peticiones nuevas a la red.

**Constraints**:
- Ningún módulo pendiente se abre por ninguna vía (FR-011).
- Pendientes enfocables y anunciados como no disponibles (FR-009).
- Menú navegable con teclado y lector de pantalla en sus tres formas (SC-005); 44 px por elemento.
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**:
- 1 componente genérico (`NavBar`) y 1 layout (`AppLayout`).
- 1 feature de cliente (`navigation`: `navItems`, `NavIcons`, `AppNav`, `navigationSlice`,
  `useNavCollapsed`).
- 1 constante compartida (`modules.ts`).
- Ajustes en `AppRouter`, `homeRoute`, `preferences.ts` (shared), la `@openapi` de preferencias y 6
  ficheros de tests existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | La navegación, transversal como `auth` y `preferences`, vive en `apps/client/src/features/navigation/`. Ningún dominio de servidor nuevo. | ✅ |
| II. Contrato API primero | Sin endpoints nuevos. El cambio de valores válidos de `homeScreen` en `PATCH /preferences` actualiza su `@openapi` y el contrato de 004 en el mismo commit. | ✅ |
| III. Validación en el borde | Sin cambios: la validación de `homeScreen` sigue en el servicio con `isHomeScreenAllowed`. | ✅ |
| IV. Funciones cortas y capas | `buildNavItems`, el reducer de `navigationSlice` y `useNavCollapsed` son funciones pequeñas. `NavBar` se divide en subcomponentes (`NavBarLink`, `NavBarPending`, `NavBarToggle`). | ✅ |
| V. Cambios mínimos | Solo se toca lo necesario: `AppRouter` (layout, rutas implementadas), `canOpen` en `homeRoute` y `AVAILABLE_HOME_SCREENS` derivada. `ModulePlaceholder` se retira porque deja de usarse (no es código comentado). | ✅ |
| VI. Tipos compartidos únicos | `IMPLEMENTED_MODULES` e `isModuleImplemented` en `packages/shared`; los tipos de UI (`NavBarItem`) son del componente, no de dominio. | ✅ |
| VII. Testing obligatorio | Tests propios de `NavBar`; tests de `navItems`, `navigationSlice`, `useNavCollapsed`, `AppNav`, `homeRoute` y `modules`; tests de 004 adaptados; E2E `navigation.spec.ts`. | ✅ |
| VIII. Componentes reutilizables | `NavBar` genérico en `components/` (citado en la constitución), que reutiliza `StatusStamp`, `IconButton` y `BrandMark`. El estado plegado vive en el slice `navigation` y se persiste en el equipo (R7). | ✅ |
| Dependencias | Ninguna nueva. | ✅ |
| Diseño | El lienzo no tiene el menú plegado, el sello «Pendiente» en el menú ni los iconos de Ventas y Cobros: se diseñan y se refresca `docs/design/` antes de la UI (R11). | ⚠️ Prerrequisito, no violación |

**Re-check tras la Fase 1**: sin cambios. No hay capas, paquetes ni dependencias nuevas, y no hace falta ADR
(no hay cambio de arquitectura).

## Project Structure

### Documentation (this feature)

```text
specs/005-app-navigation/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (R1–R12)
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── navigation-ui.md # Contrato de NavBar, comportamiento y cambio en PATCH /preferences
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks, no lo crea este comando)
```

### Source Code (repository root)

```text
packages/shared/src/
├── constants/
│   ├── modules.ts (+ .test.ts)   # NUEVO: IMPLEMENTED_MODULES, isModuleImplemented (R1)
│   ├── preferences.ts            # AVAILABLE_HOME_SCREENS derivada de IMPLEMENTED_MODULES
│   └── preferences.test.ts       # casos válidos con jest.mock de modules.ts + caso «pendiente»
└── index.ts                      # exportaciones nuevas

apps/server/src/modules/preferences/
├── preferences.routes.ts         # @openapi: homeScreen solo de módulos implementados
├── preferences.routes.test.ts    # jest.mock de modules.ts en casos válidos; 400 con pendiente
└── preferences.service.test.ts   # ídem

apps/client/src/
├── components/
│   └── NavBar.tsx (+ .module.css, .test.tsx)   # NUEVO genérico (R5)
├── features/navigation/                        # NUEVO
│   ├── navItems.ts (+ .test.ts)                # orden, etiquetas, permisos, pendientes (R6)
│   ├── NavIcons.tsx                            # SVG de módulos y de plegar
│   ├── navigationSlice.ts (+ .test.ts)         # collapsed, collapsedToggled; inicial desde localStorage (R7)
│   ├── useNavCollapsed.ts (+ .test.ts)         # lee el slice y escribe navigation.collapsed (R7)
│   └── components/
│       └── AppNav.tsx (+ .module.css, .test.tsx)   # NavBar + BrandMark + pie + LogoutButton
├── routes/
│   ├── AppLayout.tsx (+ .module.css, .test.tsx)   # NUEVO: RequireAuth + AppNav + Outlet (R4)
│   ├── AppRouter.tsx             # layout; rutas solo de módulos implementados; sin ModulePlaceholder (R2)
│   ├── homeRoute.ts              # canOpen exige isModuleImplemented
│   └── homeRoute.test.ts         # pendientes nunca son destino
├── store/store.ts                # registrar navigation
├── pages/
│   └── SettingsPage.module.css   # padding coherente con el layout
└── features/preferences/components/
    └── AppearanceForm.test.tsx   # jest.mock de modules.ts en los casos de pantalla de inicio

e2e/
├── navigation.spec.ts            # NUEVO
└── appearance.spec.ts            # sin /productos antes de cerrar sesión

specs/004-appearance-preferences/contracts/preferences-api.openapi.yaml  # nota: homeScreen según 005
docs/design/README.md + docs/design/canvas/                             # R11 (antes de la UI)
```

**Structure Decision**: se mantiene la organización por dominio del monorepo. La navegación es una feature
transversal de cliente (`features/navigation/`) sobre un genérico nuevo (`NavBar`). El único cambio de
datos es una constante en `packages/shared`, que propaga la regla de módulos implementados a la pantalla de
inicio y al servidor. `apps/desktop` no cambia.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
