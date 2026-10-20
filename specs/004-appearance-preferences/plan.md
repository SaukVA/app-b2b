# Implementation Plan: Preferencias personales (Ajustes › Apariencia)

**Branch**: `004-appearance-preferences` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-appearance-preferences/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Pestaña **Ajustes › Apariencia**, para todos los roles, en web y escritorio. Cada usuario elige su tema
(Claro, Oscuro o Según el sistema), la densidad de las tablas, el formato de los importes y su pantalla de
inicio. Los cambios se aplican al momento y se guardan por usuario. Enfoque técnico:

- **Servidor**:
  - Tres campos nuevos en `users` (`theme`, `tableDensity`, `moneyFormat`) junto al `homeScreen` de 001, con
    `null` = valor por defecto y sin migración (R1).
  - `AuthUser` sustituye `homeScreen` por `preferences` (R2).
  - Nuevo módulo `modules/preferences/` con `PATCH /api/preferences`, que solo exige sesión y valida la
    pantalla de inicio contra el rol (R3).
- **Shared**: tipos `ThemePreference`, `TableDensity`, `MoneyFormat` y `AppearancePreferences`; `HomeScreen`
  ampliado a las 6 pantallas; constantes de valores por defecto y `AVAILABLE_HOME_SCREENS` (R9).
- **Cliente**:
  - `features/preferences/` (slice + API): aplica al momento y guarda en segundo plano, con aviso si falla
    (R6).
  - `data-theme` y `data-density` en `<html>`: los temas ya los resuelven los tokens (R4), y «Según el
    sistema» sigue al equipo en vivo por CSS.
  - Script inline en `index.html` con el último tema del equipo (`appearance.lastTheme`) para que el login
    no destelle (R5).
  - Densidad Compacta en el `Table` genérico (R7).
  - Formato de importes con `formatMoney`/`parseMoney` y los componentes genéricos `Money` y `MoneyField`
    (R8). Hoy no hay importes en pantalla, así que se deja listo para los módulos de negocio.
  - Pantalla por defecto efectiva en `homeRoute`, que corrige el bucle de redirecciones con roles sin
    acceso a Productos (R9).
  - Pestaña Apariencia, la primera de Ajustes y visible para todos (R10), con el componente genérico
    `OptionGroup` (R11).

## Technical Context

**Language/Version**: TypeScript 5.7 sobre Node.js 22.12+ (servidor y Electron) y navegador (cliente).

**Primary Dependencies**: las existentes. Servidor: Express 5.1, Mongoose 8.24 y zod 3.24. Cliente: React 19,
React Router 7.18, Redux Toolkit 2.5 y axios 1.20. **Sin dependencias nuevas** (R12).

**Storage**: MongoDB 8.0. Se añaden 3 campos opcionales a `users` y se amplía el enum de `homeScreen`. En el
equipo, `localStorage` (`appearance.lastTheme`).

**Testing**: Jest 30 + ts-jest. Servidor: supertest + mongodb-memory-server. Cliente: Testing Library +
jsdom. E2E: Playwright (ADR 0004) para el tema sin destello y la pantalla de inicio.

**Target Platform**: igual que 003: servidor Linux/Windows, navegadores actuales y Electron 34 con backend
embebido (002). `localStorage` persiste en Electron porque `app://` es `standard` y `secure`.

**Project Type**: aplicación web + escritorio en monorepo (`apps/server`, `apps/client`, `packages/shared`;
`apps/desktop` sin cambios).

**Performance Goals**: un cambio se ve aplicado en menos de 1 s (SC-001), sin esperar a la red. Con «Según el
sistema», el cambio del modo del equipo se aplica en menos de 2 s (SC-003), en la práctica al instante por la
media query.

**Constraints**:
- Sin destello del tema equivocado en el login ni al entrar (FR-007, SC-002).
- En el equipo solo se recuerda el tema, nunca quién lo usó (FR-007).
- Ningún usuario llega a una pantalla sin acceso (SC-006), también con roles creados en la base de datos.
- Densidad Compacta con al menos un 25 % más de filas y controles de 44 px (FR-009).
- Funciones de 40 líneas efectivas como máximo (constitución IV).

**Scale/Scope**: 1 endpoint nuevo y 3 adaptados (`AuthUser`), 1 pestaña, 4 componentes genéricos nuevos
(`OptionGroup`, `Money`, `MoneyField` y la densidad en `Table`) y 2 utilidades (`formatMoney`,
`parseMoney`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | Nuevo dominio `preferences` completo en `apps/server/src/modules/preferences/` y `apps/client/src/features/preferences/`. | ✅ |
| II. Contrato API primero | `PATCH /preferences` con su bloque `@openapi` y envelope; `AuthUser` actualizado en `auth.routes.ts` en el mismo cambio; error `PREFERENCES_HOME_SCREEN_NOT_ALLOWED` con `AppError`. | ✅ |
| III. Validación en el borde | Cuerpo validado con zod en `preferences.validation.ts` (al menos un campo, enums, `null` permitido, sin campos extra). | ✅ |
| IV. Funciones cortas y capas | `routes → controller → service → model` (`UserModel`). El servicio valida la pantalla con `can()` y mapea a `AppearancePreferences`; nunca devuelve el documento. | ✅ |
| V. Cambios mínimos | Sin migración ni colección nueva. Los únicos cambios a código existente son `AuthUser.homeScreen` → `preferences`, `homeRoute`, `SettingsPage` y `Table.module.css`. La corrección del bucle de `homeRoute` lleva su test. | ✅ |
| VI. Tipos compartidos únicos | Todos los tipos y constantes nuevos en `packages/shared`. | ✅ |
| VII. Testing obligatorio | Tests de servicio y de rutas del módulo; tests de `money.ts`, `homeRoute`, el slice y los componentes genéricos nuevos; E2E del tema sin destello. | ✅ |
| VIII. Componentes reutilizables | `OptionGroup`, `Money` y `MoneyField` genéricos en `components/`; la densidad, dentro de `Table`; `Select` y `Tabs` de 003 reutilizados. | ✅ |
| Dependencias | Ninguna nueva. | ✅ |
| Diseño | Sigue el tablero `Ajustes.dc.html` (pestaña Apariencia). Sin cambios en el lienzo. El README de diseño cita `toLocaleString('es-ES')` para los importes; se corrige en el mismo cambio porque no agrupa números de 4 cifras (R8). | ✅ |

**Re-check tras la Fase 1**: sin cambios. El diseño no añade capas, paquetes ni dependencias, y no hace falta
ADR (no hay cambio de arquitectura).

## Project Structure

### Documentation (this feature)

```text
specs/004-appearance-preferences/
├── plan.md              # Este archivo
├── research.md          # Fase 0 (R1–R12)
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   └── preferences-api.openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks, no lo crea este comando)
```

### Source Code (repository root)

```text
packages/shared/src/
├── types/
│   ├── preferences.ts            # NUEVO: ThemePreference, TableDensity, MoneyFormat,
│   │                             #   AppearancePreferences, UpdatePreferencesRequest
│   ├── user.ts                   # HomeScreen ampliado
│   └── auth.ts                   # AuthUser: homeScreen → preferences
├── constants/
│   └── preferences.ts            # NUEVO: DEFAULT_THEME, DEFAULT_TABLE_DENSITY, DEFAULT_MONEY_FORMAT,
│                                 #   AVAILABLE_HOME_SCREENS (DEFAULT_HOME_SCREEN sigue en auth.ts)
└── index.ts                      # exportaciones nuevas

apps/server/src/
├── modules/
│   ├── preferences/              # NUEVO dominio
│   │   ├── preferences.routes.ts       # PATCH /preferences + @openapi
│   │   ├── preferences.controller.ts
│   │   ├── preferences.service.ts      # valida homeScreen con can(), guarda y mapea
│   │   ├── preferences.mapper.ts       # documento → AppearancePreferences con valores por defecto
│   │   ├── preferences.validation.ts   # zod
│   │   ├── preferences.service.test.ts
│   │   └── preferences.routes.test.ts
│   ├── users/
│   │   ├── user.model.ts         # theme, tableDensity, moneyFormat; enum de homeScreen ampliado
│   │   └── user.mapper.ts        # AuthUser.preferences
│   └── auth/
│       └── auth.routes.ts        # @openapi de AuthUser
└── app.ts                        # app.use('/api/preferences', preferencesRouter)

apps/client/
├── index.html                    # script inline: appearance.lastTheme → data-theme (R5)
└── src/
    ├── components/
    │   ├── OptionGroup.tsx (+ .module.css, .test.tsx)   # NUEVO (R11)
    │   ├── Money.tsx (+ .test.tsx)                      # NUEVO (R8)
    │   ├── MoneyField.tsx (+ .test.tsx)                 # NUEVO (R8)
    │   └── Table.module.css      # --table-cell-py y data-density='compact' (R7)
    ├── features/preferences/     # NUEVO dominio
    │   ├── preferencesSlice.ts (+ .test.ts)     # applied, saveStatus, saveError, pendingChange; savePreference
    │   ├── preferencesApi.ts                    # PATCH /preferences
    │   ├── useApplyAppearance.ts (+ .test.ts)   # data-theme, data-density, appearance.lastTheme
    │   ├── useMoneyFormat.ts
    │   └── components/
    │       ├── AppearanceForm.tsx (+ .module.css, .test.tsx)
    │       └── UserMoney.tsx (+ .test.tsx)   # UserMoney / UserMoneyField: Money y MoneyField con el formato del usuario
    ├── pages/
    │   ├── AppearanceSettingsPage.tsx (+ .test.tsx)   # NUEVO: pestaña Apariencia
    │   └── SettingsPage.tsx      # pestaña Apariencia siempre, la primera (R10)
    ├── routes/
    │   ├── AppRouter.tsx         # ruta hija ajustes/apariencia
    │   └── homeRoute.ts (+ .test.ts)   # preferences.homeScreen y pantalla por defecto efectiva (R9)
    ├── utils/
    │   └── money.ts (+ .test.ts) # formatMoney, parseMoney (R8)
    ├── store/store.ts            # registrar preferences
    └── App.tsx                   # useApplyAppearance()

e2e/
├── appearance.spec.ts            # NUEVO: tema sin destello en login y al entrar; densidad
└── support/
    ├── startServer.ts            # publica la URI de MongoDB en memoria para db.ts
    └── db.ts                     # NUEVO: siembra usuarios directamente, sin retirar la cuenta inicial

docs/design/README.md             # formato de importes: formatMoney en lugar de toLocaleString('es-ES')
CLAUDE.md                         # convención: importes solo con UserMoney / UserMoneyField
```

**Structure Decision**: se mantiene la organización por dominio del monorepo. `preferences` es un dominio
nuevo en servidor y cliente. El resto son cambios puntuales en piezas de 001 y 003 (`AuthUser`, `homeRoute`,
`SettingsPage`, `Table`). `apps/desktop` no cambia: el escritorio carga el mismo cliente y su
`localStorage` es persistente.

## Complexity Tracking

Sin violaciones de la constitución que justificar.
