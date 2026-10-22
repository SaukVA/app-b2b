---

description: "Task list for feature 008-design-alignment"
---

# Tasks: Ajuste de la aplicación al nuevo diseño del menú y del login

**Input**: Design documents from `/specs/008-design-alignment/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/navigation-ui.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige tests de los componentes que cambian (Jest + Testing Library) y los E2E de Playwright (ADR 0004) cubren el menú y el login de principio a fin. En cada fase los tests se escriben o ajustan primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de cada fase se muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden por prioridad: US1 → US2 (P1) → US3 (P2) → US4 (P3).

**Reglas transversales** (aplican a todas las tareas):
- **Referencia visual**: tableros de `docs/design/canvas/` (barra lateral en `Clientes.dc.html`, `Ajustes.dc.html`…; `Login.dc.html`, `LoginMovil.dc.html`) y `docs/design/README.md` › «Sin marca» y «Barra lateral». Contrato: `contracts/navigation-ui.md`.
- **Solo `apps/client` y `e2e/`**: sin cambios en servidor, escritorio ni shared; sin dependencias nuevas (research R9).
- **Tokens del menú** en vez de colores fijos: `--nav-active` (hover), `--nav-icon-active` (contorno de foco), `--disabled` (elemento de plegar, rol), `--nav-text`/`--nav-text-active`. El separador `#2c3238` ya es un valor fijo existente de `NavBar.module.css`.
- **Botones flex**: fijar `align-items` explícito en los botones nuevos o cambiados; el Chromium 132 de Electron 34 da `flex-start` a `<button>` (bug `desktop-theme-previews`).
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40; extraer subcomponentes.
- **Accesibilidad**: objetivos de 44 px, foco visible, nombre accesible por texto (no solo icono), corte responsive `@media (max-width: 759px)` en el menú y `@container login (max-width: 760px)` en el login.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: línea base y diseño de referencia en el repositorio

- [X] T001 Comprobar que la rama activa es `008-design-alignment`, que `.specify/feature.json` apunta a `specs/008-design-alignment` y que `npm test --workspace=apps/client`, `npm run lint` y `npm run test:e2e -- navigation smoke` están en verde antes de empezar (línea base).
- [X] T002 Incorporar la copia actualizada del lienzo que ya está en la carpeta de trabajo (`docs/design/README.md` y los 12 ficheros modificados de `docs/design/canvas/`) en un commit propio `docs(008): actualizar la copia del lienzo «Albarán»` (FR-014, research R7). Revisar antes con `git diff --stat -- docs/design` que solo cambian esos ficheros.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: no hay prerrequisitos compartidos: cada historia toca componentes distintos (US1 `NavBar`, US2 el pie de `AppNav`, US3 el login, US4 Ajustes). Las historias pueden empezar tras la Phase 1.

---

## Phase 3: User Story 1 - Menú sin marca y con «Plegar menú» como un elemento más (Priority: P1) 🎯 MVP

**Goal**: el menú no muestra logotipo, nombre de empresa ni «Venta a mayoristas» en ninguna anchura, y el control de plegar es el último elemento de la lista, bajo Ajustes, con texto «Plegar menú» / «Desplegar menú», doble chevrón y color `--disabled`.

**Independent Test**: iniciar sesión a 1440 px: sin marca; «Plegar menú» bajo Ajustes pliega y despliega, anuncia `aria-expanded` y su nombre; plegado y a 390 px tampoco hay marca, y a 390 px no hay elemento de plegar (quickstart §3.3, §3.6–§3.9).

### Tests de US1 (primero, deben fallar) ⚠️

- [ ] T003 [P] [US1] Ajustar `apps/client/src/components/NavBar.test.tsx` al contrato N4′–N6′:
  - quitar `brand`/`brandCollapsed` de `renderNavBar` y del bloque de plegado; el test «pinta el footer y la marca recibidos» pasa a «pinta el footer recibido»;
  - eliminar «plegado: pinta brandCollapsed en lugar de brand» y añadir «no pinta ninguna marca: el primer elemento del nav es la lista de módulos»;
  - con `onToggleCollapsed`: el botón «Plegar menú» es el **último `listitem`** de la segunda lista (la de `section: 'footer'`), después de Ajustes; su texto visible es «Plegar menú» (nombre accesible por texto, sin `aria-label`), tiene `title="Plegar menú"`, `aria-expanded="true"` y `aria-controls` = id del `<nav>`;
  - plegado: «Desplegar menú», `aria-expanded="false"`, `title="Desplegar menú"`;
  - sin `onToggleCollapsed` no hay `listitem` de plegar (la lista inferior solo tiene Ajustes).
- [ ] T004 [P] [US1] Ajustar `apps/client/src/features/navigation/components/AppNav.test.tsx`: añadir «no muestra marca» — dentro del `navigation` «Principal» no aparecen «Venta a mayoristas» ni «M» como logotipo, desplegado y plegado (`localStorage['navigation.collapsed'] = 'true'` antes de montar, como en los tests de 005).
- [ ] T005 [P] [US1] Ajustar `e2e/navigation.spec.ts`:
  - en «tras el login muestra los módulos…» (ancho): el `navigation` «Principal» no contiene «Venta a mayoristas»; el botón «Plegar menú» aparece después del enlace «Ajustes» (comparar `boundingBox().y`) y mide al menos 44 px de alto;
  - en «Menú plegado»: plegado, sigue sin marca y el botón dice «Desplegar menú»;
  - en «Menú en pantallas estrechas» (línea ~162): sustituir `getByText('Venta a mayoristas')).toBeHidden()` por `toHaveCount(0)`; la comprobación de `getByRole('button', { name: /menú$/ })` con `toHaveCount(0)` se mantiene.

### Implementación de US1

- [ ] T006 [US1] En `apps/client/src/components/NavBar.tsx`:
  - eliminar las props `brand` y `brandCollapsed` de `NavBarProps` (y sus comentarios) y el `<div className={styles.brand}>`;
  - sustituir `NavBarToggle` (IconButton) por `NavBarToggleItem`: un `<li className={styles.toggleItem}>` con `<button type="button" className={`${styles.item} ${styles.muted}`} aria-expanded={!collapsed} aria-controls={navId} title={text} onClick={onToggle}>` que contiene el `icon` y `<span className={styles.label}>{text}</span>`, con `text = collapsed ? 'Desplegar menú' : 'Plegar menú'`;
  - pintarlo como último elemento de la lista inferior (`NavBarList` acepta un hijo extra o `NavBar` monta la lista inferior con el `<li>` al final), solo si hay `onToggleCollapsed`;
  - quitar el import de `IconButton` si deja de usarse; actualizar el comentario de cabecera (contrato 008).
  Comprobar que T003 pasa.
- [ ] T007 [US1] En `apps/client/src/components/NavBar.module.css`:
  - borrar `.brand`, `.collapsed .brand` y las reglas de marca del bloque estrecho (`.brand`, `.collapsed .brand`, `.brand > * > :not(:first-child)`);
  - sustituir `.toggle` por: `.item` aplicado a `<button>` (`width: 100%; border: 0; background: transparent; font: inherit; text-align: left; align-items: center; cursor: pointer`), `.muted { color: var(--disabled); }`, giro del icono con transición (respetando `prefers-reduced-motion`);
  - N7: `.muted:hover { background: var(--nav-active); color: var(--nav-text-active); }` y `.muted:focus-visible { outline: 2px solid var(--nav-icon-active); outline-offset: 2px; }`;
  - plegado: la etiqueta del elemento de plegar se oculta y flota como la del resto (reutilizar `.collapsed .label`);
  - `@media (max-width: 759px)`: `.toggleItem { display: none; }`.
- [ ] T008 [US1] En `apps/client/src/features/navigation/components/AppNav.tsx`, dejar de pasar `brand` y `brandCollapsed` y quitar el import de `BrandMark`. Comprobar que T004 pasa y ejecutar `npm run test:e2e -- navigation` para T005.

**Checkpoint**: US1 funcional. Menú sin marca y «Plegar menú» como elemento de la lista en web y escritorio.

---

## Phase 4: User Story 2 - Pie de usuario en una sola fila (Priority: P1)

**Goal**: el pie es una fila con avatar, nombre y «rol · canal» (recortados con `title` completo) y botón de icono «Cerrar sesión» de 44×44 a la derecha; plegado y en estrecho, solo el botón.

**Independent Test**: con un usuario de nombre corto y otro de 60 caracteres: fila única, texto recortado con `title`, botón «Cerrar sesión» por nombre que cierra sesión desplegado, plegado y a 390 px (quickstart §3.4, §3.5, §3.7, §3.10).

### Tests de US2 (primero, deben fallar) ⚠️

- [ ] T009 [P] [US2] Ajustar `apps/client/src/features/navigation/components/AppNav.test.tsx` (bloque «AppNav · pie»):
  - el nombre lleva `title` igual al nombre completo y «`roleName` · Web» lleva `title` con ese texto completo (clarificación 2026-10-22, FR-006);
  - hay un avatar con `aria-hidden="true"` (no aparece en el árbol accesible);
  - el botón «Cerrar sesión» se encuentra por nombre accesible y tiene `title="Cerrar sesión"`; su texto no se ve como texto suelto (está oculto visualmente) — comprobar que existe el `svg` del icono dentro del botón;
  - con un nombre de 60 caracteres el `textContent` del nombre es el nombre completo (el recorte es solo CSS);
  - el canal Escritorio y la cuenta inicial siguen como en 005.
- [ ] T010 [P] [US2] Ampliar `e2e/navigation.spec.ts`:
  - en ancho, el pie del `navigation` «Principal» muestra «Administrador · Web» y el botón «Cerrar sesión» está a la derecha del texto (`boundingBox().x` mayor) y mide 44×44;
  - plegado, el pie solo tiene el botón «Cerrar sesión» (el texto «Administrador · Web» no es visible);
  - a 390 px, el botón «Cerrar sesión» sigue visible y funciona, mide 44×44 y su texto no se ve (solo icono, clarificación 2026-10-22);
  - nuevo test con un usuario sembrado (`seedUsers`/`removeUsers` de `e2e/support/db.ts`, login único por proyecto) de nombre de 60 caracteres: el pie mide lo mismo de alto que con «Administrador inicial» (±2 px), el nombre tiene `title` completo y el botón «Cerrar sesión» queda dentro del `navigation` (`boundingBox` contenido).

### Implementación de US2

- [ ] T011 [P] [US2] Añadir `PersonIcon` en `apps/client/src/features/navigation/NavIcons.tsx` (icono de persona de trazo como el del tablero: `circle cx=12 cy=8 r=3.5` + hombros), con el mismo `NavIcon` que el resto.
- [ ] T012 [P] [US2] Permitir `title` en `apps/client/src/features/auth/components/LogoutButton.tsx` (prop opcional que se pasa a `Button`), sin cambiar su comportamiento ni sus usos actuales.
- [ ] T013 [US2] Reescribir `NavFooter` en `apps/client/src/features/navigation/components/AppNav.tsx` según contracts/navigation-ui.md §2:
  - `<span className={styles.avatar} aria-hidden="true"><PersonIcon /></span>`;
  - bloque `styles.who` con `<span className={styles.name} title={user.name}>` y `<span className={styles.role} title={roleLine}>` (`roleLine = `${user.roleName} · ${channel}``);
  - `<LogoutButton className={styles.logout} title="Cerrar sesión">` con `<LogoutIcon />` y `<span className={styles.logoutLabel}>Cerrar sesión</span>` (oculto visualmente siempre);
  - subcomponentes pequeños si hace falta (≤ 40 líneas). Depende de T011 y T012.
- [ ] T014 [US2] Reescribir `apps/client/src/features/navigation/components/AppNav.module.css`:
  - `.footer`: fila (`display: flex; align-items: center; gap: 10px; min-width: 0`);
  - `.avatar`: 36×36, radio 6, fondo `--nav-active`, color `--nav-text`, centrado, `flex: none`;
  - `.who`: columna, `flex: 1; min-width: 0`; `.name` 13/600 `--nav-text-active` y `.role` 12/400 `--disabled`, ambos con `overflow: hidden; white-space: nowrap; text-overflow: ellipsis`;
  - `.footer .logout`: 44×44, `padding: 0`, `justify-content: center; align-items: center`, color `--nav-text`, `flex: none`; `:hover` fondo `--nav-active` y texto `--nav-text-active`; `:focus-visible` contorno 2 px `--nav-icon-active` con `outline-offset: 2px` (N7);
  - `.logoutLabel` oculto visualmente; plegado, flota con `:hover`/`:focus-visible` como hoy;
  - `.collapsed`: oculta `.avatar` y `.who`, centra el botón;
  - `@media (max-width: 759px)`: oculta `.avatar` y `.who`; el botón queda de 44×44 en línea con la barra.
  Revisar también el padding del contenedor `.footer` en `apps/client/src/components/NavBar.module.css` (`padding: 12px 4px 0`, `border-top: 1px solid #2c3238` según el tablero). Comprobar que T009 y T010 pasan.

**Checkpoint**: US1 y US2 funcionan; el menú coincide con los tableros en ancho, plegado y estrecho.

---

## Phase 5: User Story 3 - Inicio de sesión sin marca y centrado en móvil (Priority: P2)

**Goal**: el panel de presentación no muestra la marca; por debajo de 760 px desaparece y el formulario queda centrado en vertical y horizontal.

**Independent Test**: login a 1440 px con el panel sin marca; a 390 px sin panel, formulario centrado y visible entero; en escritorio, indicador de base de datos visible (quickstart §3.1, §3.2, §4).

### Tests de US3 (primero, deben fallar) ⚠️

- [ ] T015 [P] [US3] Crear `apps/client/src/features/auth/components/LoginHero.test.tsx`: la región «Presentación» muestra el titular «Todo el ciclo de venta, en una sola hoja.» y no contiene «Venta a mayoristas» ni el logotipo «M».
- [ ] T016 [P] [US3] Ampliar `e2e/smoke.spec.ts` con dos tests de login:
  - a 1440×900: la región «Presentación» es visible y no contiene «Venta a mayoristas»;
  - a 390×844: la región «Presentación» no es visible; el formulario (encabezado «Iniciar sesión» + botón «Entrar») está entero en el viewport sin desplazarse y su centro horizontal está a ±16 px del centro de la pantalla, y su centro vertical a ±10 % de la altura (SC-005).

### Implementación de US3

- [ ] T017 [US3] En `apps/client/src/features/auth/components/LoginHero.tsx`, quitar `BrandMark` y su import, y actualizar el comentario («por debajo de 760 px no se muestra»). Comprobar que T015 pasa.
- [ ] T018 [US3] En `apps/client/src/features/auth/components/LoginHero.module.css`, dentro de `@container login (max-width: 760px)`, sustituir la franja (`padding`/`gap` y la ocultación de `.claim`/`.footer`) por `.hero { display: none; }`. Revisar que el reparto vertical del hero en ancho (`justify-content`) sigue bien sin la marca arriba.
- [ ] T019 [US3] En `apps/client/src/pages/LoginPage.module.css`, quitar `align-items: flex-start` del `.main` dentro de `@container login (max-width: 760px)` (se mantiene `padding: 32px 16px 40px`). Ejecutar `npm run test:e2e -- smoke` y comprobar que T016 pasa.

**Checkpoint**: el login coincide con `Login.dc.html` y `LoginMovil.dc.html`.

---

## Phase 6: User Story 4 - Texto de Ajustes sin «conexión de datos» (Priority: P3)

**Goal**: el subtítulo de Ajustes es «Preferencias de la aplicación y acceso de usuarios.».

**Independent Test**: abrir Ajustes con cualquier rol y leer el subtítulo (quickstart §3.11).

### Tests de US4 (primero, deben fallar) ⚠️

- [ ] T020 [P] [US4] Ampliar `apps/client/src/pages/SettingsPage.test.tsx`: el subtítulo es exactamente «Preferencias de la aplicación y acceso de usuarios.» y no aparece «conexión de datos».

### Implementación de US4

- [ ] T021 [US4] En `apps/client/src/pages/SettingsPage.tsx`, cambiar el subtítulo a «Preferencias de la aplicación y acceso de usuarios.» y el comentario de `useSettingsTabs` («la fila «Ajustes» de la matriz cubre la pestaña de Usuarios»). Comprobar que T020 pasa.

**Checkpoint**: las cuatro historias funcionan.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T022 Eliminar `apps/client/src/components/BrandMark.tsx`, `BrandMark.module.css` y `BrandMark.test.tsx`, ya sin usos tras T008 y T017 (research R1). Comprobar con una búsqueda que no queda ninguna referencia a `BrandMark` en `apps/client` ni en `e2e`. Depende de T008 y T017.
- [ ] T023 [P] Revisar con `playwright-cli` el menú (desplegado, plegado), el pie y el login a 390 px y 1440 px, en claro y en oscuro, comparando con los tableros (SC-006): orden del teclado, foco visible (contorno naranja en plegar y cerrar sesión), objetivos de 44 px, contraste de 4.5:1 en textos, etiquetas flotantes plegado y sin scroll horizontal. Repetir el pie y el elemento de plegar dentro de Electron 34 (Chromium 132) para descartar diferencias de `align-items` en botones.
- [ ] T024 [P] Revisar que ninguna función nueva o cambiada pasa de 40 líneas efectivas y que no quedan comentarios que mencionen la marca o el `IconButton` de plegar (principio IV).
- [ ] T025 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde. Validar a mano quickstart.md completo en web (§3) y en escritorio (§4: `npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T002 deja el diseño en el historial antes del código.
- **Foundational (Phase 2)**: vacía.
- **US1, US2, US3, US4 (Phases 3–6)**: dependen solo de Setup y son independientes entre sí, salvo que US2 toca `NavBar.module.css` (contenedor `.footer`) después de US1 (T007 → T014).
- **Polish (Phase 7)**: T022 depende de US1 (T008) y US3 (T017); el resto, de las historias que se entreguen.

### Within Each User Story

- Tests primero (deben fallar), después la implementación.
- US1: `NavBar.tsx` → `NavBar.module.css` → `AppNav.tsx`.
- US2: icono y `LogoutButton` en paralelo → `NavFooter` → CSS del pie.
- US3: `LoginHero.tsx` → CSS del hero → CSS de la página.

### Parallel Opportunities

- US1: T003, T004 y T005 en paralelo.
- US2: T009 y T010 en paralelo; T011 y T012 en paralelo.
- US3: T015 y T016 en paralelo.
- US3 y US4 completas se pueden hacer en paralelo con US1/US2 (ficheros distintos).
- Polish: T023 y T024 en paralelo.

---

## Parallel Example: User Story 1

```text
Tests a la vez:      T003 NavBar.test   T004 AppNav.test   T005 e2e/navigation.spec
Implementación:      T006 NavBar.tsx → T007 NavBar.module.css → T008 AppNav.tsx
```

## Parallel Example: User Story 2

```text
Tests a la vez:      T009 AppNav.test (pie)   T010 e2e/navigation.spec (pie)
Implementación:      T011 PersonIcon │ T012 LogoutButton title  →  T013 NavFooter  →  T014 CSS del pie
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (línea base y commit del diseño).
2. Phase 3 (US1): menú sin marca y «Plegar menú» en la lista.
3. **Parar y validar**: quickstart §3.3, §3.6–§3.9.

### Incremental Delivery

1. Setup → diseño en el repositorio.
2. US1 → menú sin marca (MVP).
3. US2 → pie en una fila.
4. US3 → login sin marca y centrado en móvil.
5. US4 → subtítulo de Ajustes.
6. Polish → `BrandMark` eliminado, revisión visual y validación completa.

### Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Hacer commit al terminar cada fase (Conventional Commits en español, prefijo `(008)`).
- Al lanzar `/speckit-implement`, pasar a «En curso» en Jira la fase y las subtareas que se vayan a implementar (CLAUDE.md › Flujos habituales), si ya existe `specs/008-design-alignment/jira-mapping.json`.
