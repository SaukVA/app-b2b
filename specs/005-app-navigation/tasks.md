---

description: "Task list for feature 005-app-navigation"
---

# Tasks: Menú lateral de navegación

**Input**: Design documents from `/specs/005-app-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/navigation-ui.md, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige:
- tests unitarios en los workspaces afectados;
- tests propios del componente genérico nuevo (`NavBar`);
- mantener en verde los tests de integración del servidor que cambian de comportamiento (`PATCH /preferences`).

El E2E de Playwright (ADR 0004) cubre el menú tras el login, los pendientes, el plegado y el móvil. En cada
fase los tests se escriben primero y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los
tests de cada fase se muestra el plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución por
prioridad: US1 → US2 → US3 → US4 (P1) → US5 → US6 (P2).

**Reglas transversales** (aplican a todas las tareas):
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40, anidamiento
  ≤2 y early returns. `NavBar` se divide en subcomponentes (`NavBarLink`, `NavBarPending`, `NavBarToggle`).
- **Genérico sin negocio** (principio VIII): `NavBar` no importa `@app/shared`, ni el store, ni permisos; todo
  le llega por props (contracts/navigation-ui.md §1). Permisos, iconos y pie viven en
  `apps/client/src/features/navigation/`.
- **Fuente única** (FR-010): qué módulos están implementados solo se decide en
  `packages/shared/src/constants/modules.ts` (`IMPLEMENTED_MODULES`, hoy `['ajustes']`).
- **Estado y almacenamiento** (constitución VIII): el estado plegado vive en el slice `navigation`; en el
  equipo solo se guarda `localStorage['navigation.collapsed']` con `'1'` (plegado) o `'0'` (desplegado),
  "Sin valor → desplegado", y cada lectura o escritura en `try/catch`. NEVER se envía al servidor (FR-014).
- **Estilos**: tokens de `apps/client/src/styles/tokens.css` (`--nav`, `--nav-active`, `--nav-text`,
  `--nav-icon-active`, escala de espacios); corte `@media (max-width: 759px)`; objetivo táctil de 44 px.
- **Dependencias**: ninguna nueva (research R10).
- **Diseño**: el lienzo actualizado en T002 es la referencia visual (barra lateral de
  `docs/design/canvas/Productos.dc.html` y lo añadido en R11).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: rama de trabajo y diseño previo obligatorio (FR-020, research R11)

- [X] T001 Crear la rama `005-app-navigation` a partir de la rama base que indique el usuario (`main` o
  `004-appearance-preferences`, que todavía no está integrada) y llevar a ella `specs/005-app-navigation/`.
  Comprobar que `.specify/feature.json` apunta a `specs/005-app-navigation`.
- [X] T002 Añadir al lienzo publicado (https://claude.ai/artifact/8tNZ1JTHbiRh11kfnay9Ya), en el tablero del
  sistema visual (`Main.dc.html`) y en la barra lateral de los tableros:
  - el orden completo del menú: Ventas, Clientes, Productos, Proveedores, Cobros y, separado, Ajustes;
  - iconos de Ventas y Cobros (SVG de trazo de 18 px, `stroke-width: 1.8`);
  - sello «Pendiente» sobre fondo `--nav` (versión completa y versión reducida para el menú plegado), con
    contraste AA en claro y en oscuro;
  - menú plegado: ancho (propuesta 72 px), etiqueta flotante al pasar el ratón o con el foco, botón
    «Plegar menú»/«Desplegar menú» y pie reducido con «Cerrar sesión».
- [X] T003 Refrescar `docs/design/canvas/` (copia literal de los `*.dc.html` cambiados y `canvas.json`) y
  `docs/design/README.md`:
  - en Componentes, apartado «Barra lateral» con las medidas plegada y desplegada, el sello «Pendiente» y los
    iconos;
  - en «Espaciado, radios y tamaños», el ancho plegado;
  - en la tabla de color, el token nuevo `navTextActive` (`#E8EAE6` en los dos temas) para el texto del
    elemento activo.
  
  Va en el mismo cambio que T002 (CLAUDE.md, «Diseño visual»).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: fuente única de módulos implementados e iconos, que usan todas las historias

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase

### Tests de Foundational (primero, deben fallar) ⚠️

- [X] T004 [P] Crear `packages/shared/src/constants/modules.test.ts`:
  - `IMPLEMENTED_MODULES` es `['ajustes']`;
  - `isModuleImplemented('ajustes') === true`;
  - `isModuleImplemented` devuelve `false` para `ventas`, `clientes`, `productos`, `proveedores` y `cobros`.

### Implementación de Foundational

- [X] T005 Crear `packages/shared/src/constants/modules.ts` con
  `export const IMPLEMENTED_MODULES: readonly AppModule[] = ['ajustes'];` y
  `export function isModuleImplemented(module: AppModule): boolean`. Incluir un comentario de cabecera: «Único
  sitio que se edita al implementar un módulo (005 FR-010)». Exportar ambos en
  `packages/shared/src/index.ts`.
- [X] T006 [P] Crear `apps/client/src/features/navigation/NavIcons.tsx`:
  - un componente por icono: `VentasIcon`, `ClientesIcon`, `ProductosIcon`, `ProveedoresIcon`, `CobrosIcon`,
    `AjustesIcon` y `CollapseIcon` (chevron que gira según el estado);
  - SVG inline de 18×18, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
    `stroke-width="1.8"` y `aria-hidden="true"`;
  - los trazos de Clientes, Productos, Proveedores y Ajustes se copian de la barra lateral de
    `docs/design/canvas/Productos.dc.html`; los de Ventas, Cobros y plegar, del diseño de T002.

**Checkpoint**: `npm test --workspace=packages/shared` en verde.

---

## Phase 3: User Story 1 - Navegar entre los módulos de mi rol (Priority: P1) 🎯 MVP

**Goal**: menú lateral en todas las pantallas con sesión, con los módulos que el rol puede ver en orden fijo y
Ajustes siempre, separado al final.

**Independent Test**: un Administrador y un usuario de Almacén inician sesión y cada uno ve solo los módulos que
su rol puede ver, más Ajustes. Pulsando Ajustes llegan a Ajustes. En `/login` no hay menú.

### Tests de US1 (primero, deben fallar) ⚠️

- [X] T007 [P] [US1] Crear `apps/client/src/components/NavBar.test.tsx` (en `MemoryRouter`):
  - un único `navigation` con el `label` recibido;
  - los elementos `main` en el orden recibido y los de `section: 'footer'` después;
  - cada elemento es un enlace con su `label` como nombre accesible y lleva a `to`;
  - se pinta el `footer` recibido;
  - sin `onToggleCollapsed` no hay botón de plegar (contrato N1, N5).
- [X] T008 [P] [US1] Crear `apps/client/src/features/navigation/navItems.test.ts` para
  `buildNavItems(permissions)`:
  - Administrador: devuelve los 6 módulos en el orden `ventas, clientes, productos, proveedores, cobros,
    ajustes`;
  - un módulo con `none` no aparece; con `view` o `edit` sí;
  - `ajustes` aparece siempre, incluso con `ajustes: 'none'`, con `section: 'footer'`;
  - un rol sin ningún `view` solo recibe Ajustes;
  - `to` es `/<module>` y la etiqueta es Ventas, Clientes, Productos, Proveedores, Cobros o Ajustes.
- [X] T009 [P] [US1] Crear `apps/client/src/routes/AppLayout.test.tsx` (store de prueba y `MemoryRouter`):
  - con sesión, `/ajustes/apariencia` muestra `navigation` «Principal» y el contenido de la página;
  - sin sesión, redirige a `/login` y no hay menú (FR-001; contrato A1, A2).
- [X] T010 [P] [US1] Crear `apps/client/src/features/navigation/components/AppNav.test.tsx`: con un usuario
  Comercial, el menú muestra sus módulos visibles y Ajustes. Al despachar `refreshSession.fulfilled` con otros
  permisos, el menú cambia sin volver a montar (FR-005; contrato A3–A5).
- [X] T011 [P] [US1] Crear `e2e/navigation.spec.ts`, caso «menú tras el login»: tras `loginAsAdmin` se ve
  `navigation` «Principal» con los 5 módulos y Ajustes en orden. Pulsar Ajustes lleva a `/ajustes/apariencia`.
  En `/login` no hay `navigation`. La configuración de base de datos solo existe en escritorio: en web,
  `/ajustes/base-de-datos` sin sesión lleva a `/login`, sin `navigation` (FR-001, A2). En escritorio se
  comprueba a mano (quickstart §4).

### Implementación de US1

- [X] T012 [US1] Crear `apps/client/src/components/NavBar.tsx` y `NavBar.module.css` con la API de
  contracts/navigation-ui.md §1 (`NavBarItem`, `NavBarProps`):
  - `<nav aria-label>` con la marca, una lista de elementos `main`, un separador, los elementos `footer` y el
    `footer` recibido;
  - cada elemento es un `NavBarLink` sobre `NavLink` con el icono y el texto;
  - estilos de la barra lateral de 232 px: fondo `--nav`, texto `--nav-text`, `min-height: 44px`, padding
    `0 12px`, radio 6, gap 12, Ajustes empujado al final (`margin-top: auto`).
  
  Todavía sin estado activo, pendientes, plegado ni móvil.
- [X] T013 [US1] Después de T012 (usa el tipo `NavBarItem`), crear
  `apps/client/src/features/navigation/navItems.ts` con `NAV_MODULES` (orden,
  etiqueta e icono de `NavIcons.tsx`) y `buildNavItems(permissions: PermissionSet): NavBarItem[]`:
  - filtra los módulos de negocio con `can(permissions, module, 'view')`;
  - añade Ajustes siempre con `section: 'footer'`;
  - pone `pending: !isModuleImplemented(module)` (data-model.md, «Elemento de menú»).
- [X] T014 [US1] Crear `apps/client/src/features/navigation/components/AppNav.tsx` (+ `AppNav.module.css`).
  Lee `selectUser`; si no hay usuario no pinta nada. Compone:
  - `NavBar` con `label="Principal"`;
  - `brand={<BrandMark name="Venta a mayoristas" />}` (la misma marca que `LoginHero`, FR-018);
  - `items={buildNavItems(user.permissions)}`.
- [X] T015 [US1] Crear `apps/client/src/routes/AppLayout.tsx` (+ `AppLayout.module.css`): `<RequireAuth>`
  que envuelve un contenedor de dos columnas (`AppNav` y una zona de contenido con `<Outlet />`), de altura
  mínima `100dvh` y con la columna del menú `sticky`.
- [X] T016 [US1] Modificar `apps/client/src/routes/AppRouter.tsx`:
  - nueva ruta sin `path` con `element: <AppLayout />`, hija de `/`;
  - `moduleRoutes` y `settingsRoute` pasan a ser sus hijas;
  - `login`, `desktopRoutes`, el índice y `*` siguen fuera del layout;
  - `settingsRoute` ya no necesita su propio `RequireAuth` de sesión; se mantiene el de la pestaña Usuarios.
- [X] T017 [US1] Ajustar `apps/client/src/pages/SettingsPage.module.css` al layout: quitar `max-width` y
  `margin: 0 auto` si el contenido ya queda limitado por la zona de contenido, y usar el padding del diseño
  (`24px 32px 48px`; en móvil, `16px 16px 32px`).

**Checkpoint**: T007–T011 en verde; el menú aparece en Ajustes con los módulos del rol.

---

## Phase 4: User Story 2 - Saber en qué pantalla estoy (Priority: P1)

**Goal**: el módulo de la pantalla abierta (o de su subpantalla) está marcado como activo, de forma visible y
como `aria-current="page"`.

**Independent Test**: en Ajustes › Apariencia y en Ajustes › Usuarios, Ajustes aparece activo y es el único
con `aria-current="page"`.

### Tests de US2 (primero, deben fallar) ⚠️

- [X] T018 [P] [US2] Ampliar `apps/client/src/components/NavBar.test.tsx`:
  - en la ruta `/ajustes/usuarios`, el elemento `/ajustes` tiene `aria-current="page"`;
  - ningún otro elemento lo tiene;
  - en `/ajustes` también (contrato N2).

### Implementación de US2

- [X] T019 [US2] En `NavBarLink` (`apps/client/src/components/NavBar.tsx`), usar `NavLink` sin `end` para que
  las subrutas activen el módulo. En `NavBar.module.css`, estilo activo: fondo `--nav-active`, texto
  `--nav-text-active` (token nuevo en `apps/client/src/styles/tokens.css`: `#E8EAE6` en los dos temas) e icono
  `--nav-icon-active`. Indicador de foco visible con `--accent`.

**Checkpoint**: T018 en verde.

---

## Phase 5: User Story 3 - Ver quién soy y cerrar sesión (Priority: P1)

**Goal**: pie del menú con nombre, rol y canal, y «Cerrar sesión».

**Independent Test**: un Comercial en la web ve su nombre y «Comercial · Web» al pie; en el escritorio,
«Escritorio». «Cerrar sesión» vuelve al login.

### Tests de US3 (primero, deben fallar) ⚠️

- [X] T020 [P] [US3] Ampliar `apps/client/src/features/navigation/components/AppNav.test.tsx`:
  - el pie muestra `user.name` y `${user.roleName} · Web`;
  - con `window.desktop` simulado muestra `· Escritorio`;
  - con la cuenta inicial muestra su nombre y rol;
  - hay un botón «Cerrar sesión» (FR-007, FR-008; contrato A8).
- [X] T021 [P] [US3] Ampliar `e2e/navigation.spec.ts`: el pie muestra «Administrador · Web». «Cerrar sesión»
  lleva a `/login`, y al volver atrás no se ve ninguna pantalla con sesión.

### Implementación de US3

- [X] T022 [US3] En `AppNav.tsx`, pasar a `NavBar` el `footer` con el nombre (recortado con
  `text-overflow: ellipsis` y `title` con el nombre completo), la línea `{roleName} · {isDesktop() ?
  'Escritorio' : 'Web'}` y `<LogoutButton />`. Estilos del pie en `AppNav.module.css` (borde superior,
  tamaños 13/12 px del lienzo, texto secundario `--disabled`). Si hace falta, añadir a `LogoutButton` una
  prop opcional `className` para el estilo sobre fondo oscuro, sin cambiar su comportamiento.

**Checkpoint**: T020–T021 en verde.

---

## Phase 6: User Story 4 - Ver qué módulos están pendientes (Priority: P1)

**Goal**: los módulos no implementados aparecen con «Pendiente», reciben el foco y no se abren por ninguna
vía: ni desde el menú, ni por dirección, ni como pantalla de inicio (clarificación del 2026-10-20).

**Independent Test**: con solo Ajustes implementado, los 5 módulos de negocio que el rol ve aparecen con
«Pendiente». El clic, Intro y Espacio no cambian de pantalla. `/clientes` redirige a la pantalla de inicio.
`PATCH /api/preferences` con `homeScreen: 'clientes'` responde 400.

### Tests de US4 (primero, deben fallar) ⚠️

- [X] T023 [P] [US4] Ampliar `apps/client/src/components/NavBar.test.tsx` con un elemento `pending`:
  - tiene `role="link"`, `aria-disabled="true"`, `tabIndex=0` y no tiene `href`;
  - se ve el texto «Pendiente»;
  - recibe el foco con Tab;
  - ni el clic, ni Intro, ni Espacio cambian la ruta del `MemoryRouter` (contrato N3).
- [X] T024 [P] [US4] Ampliar `apps/client/src/features/navigation/navItems.test.ts`: con la lista real,
  `ventas…cobros` llevan `pending: true` y `ajustes`, `pending: false`. Con `jest.mock` de
  `packages/shared/src/constants/modules.ts` (`IMPLEMENTED_MODULES = ['ajustes', 'clientes']`), `clientes`
  lleva `pending: false` en la misma posición (FR-010).
- [X] T025 [P] [US4] Ampliar `apps/client/src/routes/homeRoute.test.ts`:
  - `resolveHomeRoute(user, '/clientes')` no devuelve `/clientes` mientras esté pendiente;
  - sin módulos implementados, cualquier rol va a `/ajustes/apariencia`;
  - un `homeScreen: 'ventas'` guardado se ignora.
  
  Los casos actuales que esperan `/productos` o una pantalla elegida pasan a usar `jest.mock` de
  `constants/modules.ts` con los módulos implementados que necesiten.
- [X] T026 [P] [US4] Adaptar `packages/shared/src/constants/preferences.test.ts`:
  - con la lista real, `AVAILABLE_HOME_SCREENS` está vacía e `isHomeScreenAllowed` devuelve `false` para
    cualquier pantalla;
  - los casos válidos actuales pasan a `jest.mock('./modules')` con módulos implementados.
- [X] T027 [P] [US4] Adaptar `apps/server/src/modules/preferences/preferences.routes.test.ts` y
  `preferences.service.test.ts`:
  - nuevo caso: 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED` con `homeScreen: 'clientes'` y la lista real;
  - los casos que hoy aceptan `'clientes'` usan `jest.mock` del archivo
    `packages/shared/src/constants/modules.ts` (misma ruta resuelta que el `moduleNameMapper` de
    `@app/shared`);
  - `homeScreen: null` sigue respondiendo 200.
- [X] T028 [P] [US4] Adaptar `apps/client/src/features/preferences/components/AppearanceForm.test.tsx`:
  - con la lista real no hay control «Pantalla de inicio»;
  - los casos de elegir `clientes`/`proveedores` usan `jest.mock` de `constants/modules.ts`.
- [X] T029 [P] [US4] Ampliar `e2e/navigation.spec.ts`:
  - «Ventas» muestra «Pendiente»; el clic y Intro no cambian la URL;
  - `page.goto('/clientes')` acaba en `/ajustes/apariencia`;
  - en Apariencia no hay «Pantalla de inicio».

### Implementación de US4

- [X] T030 [US4] Añadir `NavBarPending` en `apps/client/src/components/NavBar.tsx`:
  - `<span role="link" aria-disabled="true" tabIndex={0}>` con icono, etiqueta y
    `<StatusStamp tone="warning">Pendiente</StatusStamp>`;
  - `onClick`/`onKeyDown` con `preventDefault` para Intro y Espacio;
  - estilo atenuado del diseño de T002, con el mismo alto de 44 px;
  - `NavBar` lo usa cuando `item.pending`.
- [X] T031 [US4] Modificar `packages/shared/src/constants/preferences.ts`:
  - `AVAILABLE_HOME_SCREENS` = `(['ventas', 'clientes', 'productos', 'proveedores', 'cobros'] as const)
    .filter(isModuleImplemented)`, tipada como `readonly HomeScreen[]`;
  - actualizar su comentario: «pantallas de módulos implementados (005, clarificación del 2026-10-20)»;
  - comprobar que `isHomeScreenAllowed` y `defaultHomeScreen` siguen compilando sin cambios.
- [X] T032 [US4] Modificar `canOpen()` en `apps/client/src/routes/homeRoute.ts` para exigir también
  `isModuleImplemented(module)` (research R2). Actualizar el comentario de `resolveHomeRoute`.
- [X] T033 [US4] Modificar `apps/client/src/routes/AppRouter.tsx`:
  - `moduleRoutes` solo para `APP_MODULES` implementados y distintos de `ajustes` (hoy ninguno);
  - eliminar `ModulePlaceholder` y el import de `LogoutButton`, que ya no se usan;
  - una dirección de un pendiente cae en `*` → `HomeRedirect`.
- [X] T034 [P] [US4] Actualizar la descripción `@openapi` de `homeScreen` en
  `apps/server/src/modules/preferences/preferences.routes.ts`: «solo pantallas de módulos implementados que el
  rol puede ver; si no, 400 PREFERENCES_HOME_SCREEN_NOT_ALLOWED». Añadir la misma nota, remitiendo a 005, en
  `specs/004-appearance-preferences/contracts/preferences-api.openapi.yaml`.
- [X] T035 [P] [US4] En `e2e/appearance.spec.ts`, línea `await page.goto('/productos');`: quitarla (el
  «Cerrar sesión» ya está en el menú de Apariencia) y comprobar que el test sigue en verde.

**Checkpoint**: T023–T029 en verde; `npm test --workspaces` en verde (tests de 004 adaptados).

---

## Phase 7: User Story 5 - Plegar y desplegar el menú (Priority: P2)

**Goal**: en pantallas anchas, el menú se pliega a iconos y se despliega con un botón. El estado se recuerda
en el equipo y la primera vez arranca desplegado.

**Independent Test**: se pliega, el nombre aparece al pasar el ratón y al tabular, se recarga y sigue plegado;
se despliega y vuelve el menú completo.

### Tests de US5 (primero, deben fallar) ⚠️

- [X] T036 [P] [US5] Crear `apps/client/src/features/navigation/navigationSlice.test.ts` y
  `useNavCollapsed.test.ts`:
  - sin valor en `localStorage` → `collapsed === false`; con `'1'` → `true`;
  - `collapsedToggled` invierte `collapsed`;
  - el hook escribe `'1'` y luego `'0'` en `navigation.collapsed` al alternar;
  - si `getItem`/`setItem` lanzan, arranca desplegado y alternar funciona sin lanzar (FR-014; contrato A9,
    A10).
- [X] T037 [P] [US5] Ampliar `apps/client/src/components/NavBar.test.tsx`:
  - con `onToggleCollapsed`, existe el botón «Plegar menú» con `aria-expanded="true"` y `aria-controls` igual
    al `id` del `nav`;
  - con `collapsed`, el botón es «Desplegar menú» con `aria-expanded="false"`;
  - los enlaces conservan su nombre accesible;
  - el pendiente sigue anunciando «Pendiente»;
  - se pinta `brandCollapsed` en lugar de `brand`;
  - pulsar el botón llama a `onToggleCollapsed` (contrato N4, N5);
  - con `collapsed`, el `footer` sigue pintado y su botón «Cerrar sesión» sigue accesible por nombre (FR-013).
- [X] T038 [P] [US5] Ampliar `e2e/navigation.spec.ts` a 1440 px:
  - pulsar «Plegar menú» reduce el ancho del menú;
  - tabular a un enlace muestra su etiqueta;
  - tras `page.reload()` sigue plegado y `localStorage['navigation.collapsed'] === '1'`;
  - con el menú plegado, «Cerrar sesión» es visible y funciona;
  - «Desplegar menú» lo restaura.

### Implementación de US5

- [X] T039 [P] [US5] Crear `apps/client/src/features/navigation/navigationSlice.ts`:
  - `initialState: { collapsed: readCollapsed() }`, con `readCollapsed()` = `try { return
    localStorage.getItem(NAV_COLLAPSED_KEY) === '1' } catch { return false }`;
  - reducer `collapsedToggled` y selector `selectNavCollapsed`;
  - exportar `NAV_COLLAPSED_KEY = 'navigation.collapsed'`;
  - registrar el slice en `apps/client/src/store/store.ts`.
- [X] T039b [US5] Crear `apps/client/src/features/navigation/useNavCollapsed.ts`: devuelve
  `{ collapsed, toggle }`; `toggle` despacha `collapsedToggled` y guarda el nuevo valor (`'1'`/`'0'`) con
  `writeCollapsed()` dentro de `try/catch`.
- [X] T040 [US5] En `apps/client/src/components/NavBar.tsx` y `NavBar.module.css`:
  - `NavBarToggle` (`IconButton` con `CollapseIcon` recibido por prop `toggleIcon`, `aria-expanded`,
    `aria-controls` y la etiqueta del contrato N5);
  - `useId()` para el `id` del `nav`;
  - clase `collapsed`: ancho del diseño de T002 (72 px), etiquetas con el patrón «visually hidden», que
    vuelven a verse como etiqueta flotante con `:hover` y `:focus-visible`;
  - marca reducida de «Pendiente» según el diseño de T002;
  - con `collapsed`, el `footer` pasa a su versión reducida del diseño de T002 (sin nombre ni rol visibles,
    con «Cerrar sesión» como botón de icono o texto corto con nombre accesible «Cerrar sesión»);
  - transición de ancho ≤200 ms, desactivada con `prefers-reduced-motion`.
- [X] T041 [US5] En `AppNav.tsx`, usar `useNavCollapsed()` y pasar `collapsed`, `onToggleCollapsed`,
  `toggleIcon` y `brandCollapsed={<BrandMark />}` (solo el logotipo). En `AppLayout.module.css`, la columna del
  menú usa el ancho del propio `nav` (`grid-template-columns: auto 1fr`) para que el contenido gane el espacio
  liberado (FR-015).

**Checkpoint**: T036–T038 en verde.

---

## Phase 8: User Story 6 - Navegar en pantallas estrechas (Priority: P2)

**Goal**: por debajo de 760 px, el menú es una barra superior fija y desplazable, sin marca, sin datos del
usuario y sin botón de plegar, pero con «Cerrar sesión».

**Independent Test**: a 390 px, la barra se queda arriba al desplazar, se llega a «Cerrar sesión»
desplazándola horizontalmente y no hay botón de plegar. Al ensanchar con el menú plegado, vuelve plegado.

### Tests de US6 (primero, deben fallar) ⚠️

- [X] T042 [P] [US6] Ampliar `e2e/navigation.spec.ts` con `viewport: { width: 390, height: 844 }`:
  - el `navigation` está en la parte superior y sigue visible tras desplazar el contenido;
  - no hay botón «Plegar menú»;
  - el texto «Venta a mayoristas» de la marca y la línea del rol no se ven;
  - «Cerrar sesión» es visible tras `scrollIntoViewIfNeeded()`;
  - `document.documentElement.scrollWidth <= 390` (sin scroll horizontal de la página);
  - los enlaces y «Cerrar sesión» están dentro del primer viewport en vertical (SC-006);
  - plegar a 1440 px, pasar a 390 px y volver a 1440 px lo mantiene plegado (FR-017).

### Implementación de US6

- [X] T043 [US6] En `NavBar.module.css`, `@media (max-width: 759px)`, siguiendo las reglas `.nav*` de
  `docs/design/canvas/Productos.dc.html`:
  - `flex-direction: row`, `overflow-x: auto`, `position: sticky; top: 0; z-index: 5` y padding `8px 12px`;
  - enlaces `flex: none; white-space: nowrap`;
  - ocultar el texto de la marca y el botón de plegar;
  - anular los estilos de `collapsed` (etiquetas visibles).
- [X] T044 [US6] En `AppNav.module.css` y `AppLayout.module.css`, `@media (max-width: 759px)`:
  - ocultar nombre y rol del pie, dejando «Cerrar sesión» en línea con borde izquierdo `#2C3238`;
  - el layout pasa a una columna (menú arriba y contenido debajo).

**Checkpoint**: T042 en verde.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Revisar la accesibilidad del menú con `playwright-cli` a 390 px y 1440 px, en claro y en
  oscuro, desplegado y plegado (FR-019, SC-005):
  - orden del teclado y foco visible;
  - `aria-current` y pendientes anunciados;
  - objetivos de 44 px y contraste de 4.5:1 (incluido el sello sobre `--nav`);
  - sin scroll horizontal de la página.
- [ ] T046 [P] Comprobar que `/api-docs` refleja la nueva descripción de `homeScreen` en `PATCH /preferences`
  (T034) comparando el spec generado por `buildSwaggerSpec()`.
- [ ] T047 [P] Añadir a la sección Convenciones de `CLAUDE.md`: «Al implementar un módulo de dominio MUST
  añadirlo a `IMPLEMENTED_MODULES` (`packages/shared/src/constants/modules.ts`) en el mismo cambio: activa su
  entrada del menú y lo permite como pantalla de inicio (005, FR-010)».
- [ ] T048 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde. Validar a mano
  quickstart.md completo en web (§3, §5) y en escritorio (§4: `npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 primero. T002 → T003. El diseño (T002–T003) bloquea solo las tareas de estilo con
  diseño nuevo (T030, T040, T043); el resto de US1–US4 puede avanzar con la barra actual del lienzo.
- **Foundational (Phase 2)**: depende de T001. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP y la base de US2–US6, porque todas tocan `NavBar`,
  `AppNav` o `AppLayout`.
- **US2, US3 y US4 (Phases 4–6)**: dependen de US1 e independientes entre sí en comportamiento, pero US2 y
  US4 tocan `NavBar.tsx` y su test (T018/T019 → T023/T030 en serie), y US3 toca `AppNav.tsx`.
- **US5 (Phase 7)**: depende de US1; si US4 está hecha, incluye la marca reducida de «Pendiente».
- **US6 (Phase 8)**: depende de US1; la comprobación FR-017 necesita US5.
- **Polish (Phase 9)**: después de las historias que se vayan a entregar.

### Within Each User Story

- Tests primero (deben fallar), después la implementación.
- En US4, el cambio de datos (T031) va antes que comprobar los tests adaptados de 004 (T025–T028).

### Parallel Opportunities

- Foundational: T004 y T006 en paralelo; T005 después de T004.
- US1: T007–T011 en paralelo; luego T012 → T013 → T014 → T015 → T016 → T017.
- US4: T023–T029 en paralelo (archivos distintos); T034 y T035 en paralelo con T030–T033.
- US5: T036–T038 en paralelo; T039 en paralelo con T040; T039b después de T039.
- Polish: T045–T047 en paralelo.

---

## Parallel Example: User Story 1

```text
Tests a la vez:
  T007 NavBar.test.tsx       T008 navItems.test.ts      T009 AppLayout.test.tsx
  T010 AppNav.test.tsx       T011 e2e/navigation.spec.ts
Implementación:
  T012 NavBar.tsx → T013 navItems.ts  →  T014 AppNav.tsx → T015 AppLayout.tsx → T016 AppRouter.tsx → T017
```

## Parallel Example: User Story 4

```text
Tests:          T023 NavBar | T024 navItems | T025 homeRoute | T026 shared | T027 server | T028 AppearanceForm | T029 e2e
Implementación: T030 NavBarPending | T031 preferences.ts → T032 homeRoute.ts → T033 AppRouter.tsx
                T034 @openapi + contrato 004 | T035 e2e/appearance.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001; el diseño T002–T003 puede ir en paralelo) + Phase 2 (Foundational).
2. Phase 3 (US1): menú con los módulos del rol y Ajustes.
3. **Parar y validar**: quickstart §3.1 (sin la parte de «Pendiente») y §3.6.

### Incremental Delivery

1. Setup + Foundational → fuente única de módulos e iconos.
2. US1 → menú por rol (MVP).
3. US2 + US3 → activo y pie con usuario y cierre de sesión. Con esto el menú sustituye por completo a la
   pantalla provisional.
4. US4 → pendientes y regla «por ninguna vía» (cambia la pantalla de inicio de 004).
5. US5 → plegado recordado en el equipo.
6. US6 → barra superior en móvil.
7. Polish → accesibilidad, Swagger, convención en CLAUDE.md y validación completa.
