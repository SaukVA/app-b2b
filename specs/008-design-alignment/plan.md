# Implementation Plan: Ajuste de la aplicación al nuevo diseño del menú y del login

**Branch**: `008-design-alignment` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-design-alignment/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La aplicación se alinea con la actualización del lienzo «Albarán»:

- Sin marca en el menú ni en el login.
- «Plegar menú» como un elemento más de la lista, bajo Ajustes.
- Pie de usuario en una fila (avatar, nombre y «rol · canal» recortados con `title`, y botón de icono «Cerrar sesión»).
- Login sin panel de presentación en estrecho, con el formulario centrado.
- Nuevo subtítulo de Ajustes.

Es un cambio solo del cliente y de presentación. No hay datos, endpoints ni dependencias nuevas.

Enfoque técnico:

- **`NavBar`**: se quitan `brand`/`brandCollapsed`; el toggle pasa a `<li><button class="item muted">` al final de la lista inferior, con texto visible (R1, R2).
- **`AppNav` › `NavFooter`**: una fila con avatar (`PersonIcon` nuevo en `NavIcons.tsx`), textos recortados con `title` y `LogoutButton` de icono 44×44 (R3). Hover y foco con tokens del menú (R4).
- **Login**: `LoginHero` sin `BrandMark` y oculto en estrecho; `LoginPage` centra el formulario (R5).
- **`SettingsPage`**: subtítulo (R6).
- **`BrandMark`**: se elimina, porque se queda sin usos (R1).
- **Diseño**: la copia de `docs/design/` (README y 12 tableros) entra en el mismo PR (R7).

## Technical Context

**Language/Version**: TypeScript 5.7, navegador y Electron 34 (mismo cliente).

**Primary Dependencies**: las existentes (React 19, React Router 7.18 y CSS Modules). **Sin dependencias nuevas** (R9).

**Storage**: ninguno. El estado plegado sigue en `localStorage['navigation.collapsed']` (005).

**Testing**: Jest 30 + Testing Library + jsdom en el cliente; Playwright para E2E (ADR 0004).

**Target Platform**: web y escritorio (Electron 34, Chromium 132). Para los botones flex se fija `align-items` de forma explícita: la hoja por defecto de Chromium 132 difiere (bug `desktop-theme-previews`, PR #10).

**Project Type**: aplicación web + escritorio en monorepo. Solo cambia `apps/client`.

**Performance Goals**: sin impacto. Solo CSS y estructura de unos pocos componentes.

**Constraints**:
- Objetivos de 44 px.
- Foco visible con contraste ≥ 3:1 (R4: 7,1:1).
- Textos ≥ 4.5:1.
- Funciones ≤ 40 líneas (constitución IV).
- Tokens en vez de colores fijos donde existan.

**Scale/Scope**:
- 0 ficheros nuevos de código salvo `PersonIcon`, que se añade a un fichero existente.
- 3 ficheros eliminados (`BrandMark`).
- Unos 10 ficheros modificados (componentes, CSS y tests).
- 12 tableros y el README de diseño.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento | Estado |
|---|---|---|
| I. Organización por dominio | `NavBar` sigue genérico en `components/`. El pie y los iconos siguen en `features/navigation/` y el login en `features/auth/` y `pages/`. | ✅ |
| II. Contrato API primero | No hay cambios de API. | ✅ (N/A) |
| III. Validación en el borde | Sin entradas nuevas. | ✅ (N/A) |
| IV. Funciones cortas y capas | `NavBar` se reparte en `NavBarToggleItem`, `NavBarList` y `NavBar`; `NavFooter` en avatar, textos y botón. Ninguna pasa de 40 líneas. | ✅ |
| V. Cambios mínimos | Solo los componentes que pinta el diseño. Se borra `BrandMark`, que se queda sin usos (R1); no es un refactor de módulo. | ✅ |
| VI. Tipos compartidos únicos | Sin tipos nuevos. | ✅ |
| VII. Testing obligatorio | Se ajustan los tests de `NavBar`, `AppNav`, `SettingsPage` y del login, y los E2E de navegación y login en estrecho (R8). | ✅ |
| VIII. Componentes reutilizables | Se reutilizan `.item`/`.label` de `NavBar`, `LogoutButton`, `CollapseIcon` y `LogoutIcon`. El nuevo `PersonIcon` va con los demás iconos del menú. Colores por tokens (`--nav-active`, `--nav-icon-active`, `--disabled`). | ✅ |
| Restricciones | Sin dependencias ni cambios de arquitectura (sin ADR). Diseño y README en el mismo cambio (CLAUDE.md). | ✅ |

**Re-check post-design**: sin cambios. El contrato de UI respeta los ocho principios. No hay desviaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/008-design-alignment/
├── plan.md                  # Este fichero
├── research.md              # Phase 0 (R1–R9)
├── data-model.md            # Phase 1: sin datos nuevos
├── quickstart.md            # Phase 1: validación de principio a fin
├── contracts/
│   └── navigation-ui.md     # Cambios sobre el contrato de UI de 005
├── checklists/requirements.md
└── tasks.md                 # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/client/src/
├── components/
│   ├── NavBar.tsx (+ .module.css, .test.tsx)          # sin brand; toggle como elemento de la lista
│   └── BrandMark.tsx (+ .module.css, .test.tsx)       # se eliminan
├── features/navigation/
│   ├── NavIcons.tsx                                   # + PersonIcon
│   └── components/AppNav.tsx (+ .module.css, .test.tsx)  # pie en una fila
├── features/auth/components/
│   └── LoginHero.tsx (+ .module.css)                  # sin BrandMark; oculto en estrecho
└── pages/
    ├── LoginPage.module.css (+ LoginPage.test.tsx si comprueba la marca)  # formulario centrado
    └── SettingsPage.tsx (+ .test.tsx)                 # subtítulo

e2e/
├── navigation.spec.ts                                 # sin marca; pie y plegado nuevos
└── smoke.spec.ts                                      # login en estrecho

docs/design/README.md + docs/design/canvas/*           # copia del lienzo actualizada (ya en la carpeta de trabajo)
```

**Structure Decision**: monorepo existente. Los cambios quedan en los componentes que ya pintan el menú y el login, sin mover nada de sitio.

## Notas de diseño

- El tablero muestra el contorno de foco `#F08A5D` y el hover `#262B31`, que coinciden con `--nav-icon-active` y `--nav-active` del tema claro. En oscuro se usan los mismos tokens, porque el menú es oscuro en los dos temas.
- La regla del menú plegado del README («El pie deja solo «Cerrar sesión» como icono con etiqueta flotante») sigue vigente. Se conserva la etiqueta flotante del botón de cerrar sesión.

## Complexity Tracking

Sin desviaciones de la constitución que justificar.
