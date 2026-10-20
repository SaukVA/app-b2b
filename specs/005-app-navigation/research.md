# Research: Menú lateral de navegación (005-app-navigation)

Fase 0 del plan. Cada decisión resuelve una incógnita del Technical Context de `plan.md` y parte de lo que
ya existe tras 001, 003 y 004:

- `APP_MODULES` (`packages/shared/src/constants/roles.ts`) fija los 6 módulos y `can()` resuelve permisos.
- `AppRouter.tsx` genera una ruta `ModulePlaceholder` por módulo de negocio; ninguno está implementado. La
  única pantalla real es Ajustes (Apariencia y Usuarios).
- `AVAILABLE_HOME_SCREENS` e `isHomeScreenAllowed` (`packages/shared/src/constants/preferences.ts`) deciden
  qué pantallas de inicio se pueden elegir. Los usan `homeRoute.ts`, `AppearanceForm.tsx` y el servicio
  `preferences` del servidor.
- `refreshSession.fulfilled` sustituye `state.user` entero (permisos incluidos).
- `tokens.css` ya tiene los tokens de la barra lateral (`--nav`, `--nav-active`, `--nav-text`,
  `--nav-icon-active`), y `BrandMark`, `StatusStamp`, `LogoutButton` e `isDesktop()` existen.

## R1. Fuente única de módulos implementados (FR-010, FR-011)

- **Decision**: nuevo `packages/shared/src/constants/modules.ts` con `IMPLEMENTED_MODULES:
  readonly AppModule[] = ['ajustes']` e `isModuleImplemented(module)`. `AVAILABLE_HOME_SCREENS` deja de ser
  una lista fija y pasa a ser el orden de pantallas de inicio filtrado por `isModuleImplemented` (hoy,
  vacía). `isHomeScreenAllowed` mantiene su firma.
- **Rationale**: un único sitio que se edita al implementar cada módulo (FR-010). Al derivar
  `AVAILABLE_HOME_SCREENS` de él, el selector de Apariencia, `homeRoute` y el servidor (`PATCH
  /preferences`) aplican la clarificación del 2026-10-20 sin cambiar su código.
- **Alternatives considered**: un flag `implemented` en cada ruta del cliente (el servidor no lo vería y
  seguiría aceptando pantallas de inicio pendientes); un campo en la colección `roles` (no es un dato de
  negocio ni configurable).

## R2. Módulos pendientes no se abren por ninguna vía (FR-011)

- **Decision**:
  - `AppRouter` solo crea rutas de los módulos implementados (sin contar Ajustes, que tiene su propia
    ruta). Una dirección de un módulo pendiente cae en la ruta `*` → `HomeRedirect` → pantalla de inicio.
  - `canOpen()` de `homeRoute.ts` exige además `isModuleImplemented`, para que el «from» del login nunca
    lleve a un pendiente.
  - `ModulePlaceholder` se retira: deja de tener uso y su `LogoutButton` pasa al menú.
- **Rationale**: es el cambio más pequeño que cumple «por ninguna vía» y reutiliza la redirección que ya
  existe. `RequireAuth` no cambia.
- **Alternatives considered**: mantener las rutas y bloquear en `RequireAuth` (dos sitios decidiendo lo
  mismo); una página «Módulo pendiente» (descartada en la clarificación).

## R3. Efecto en la pantalla de inicio de 004

- **Decision**: sin código nuevo. Con `AVAILABLE_HOME_SCREENS` vacía:
  - `effectiveHomeScreen()` devuelve `null` y `resolveHomeRoute()` lleva a `/ajustes/apariencia`.
  - `HomeScreenField` ya no se pinta cuando no hay opciones.
  - El servidor responde 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED` a una pantalla pendiente.
  - Un `homeScreen` ya guardado que apunte a un pendiente se trata como no disponible (FR-016 de 004).
    No hay migración.
- **Rationale**: la lógica de respaldo de 004 (R9) ya cubre la lista vacía; solo cambia el dato.
- **Impacto en tests**: `homeRoute.test.ts`, `AppearanceForm.test.tsx`, `preferences.routes.test.ts`,
  `preferences.service.test.ts` y `packages/shared/src/constants/preferences.test.ts` usan pantallas como `clientes` en casos válidos. Esos casos sustituyen
  `constants/modules.ts` con `jest.mock` (lista con módulos implementados), y se añade un caso con la lista
  real que comprueba el rechazo. `e2e/appearance.spec.ts` deja de abrir `/productos` antes de cerrar
  sesión.

## R4. Layout común con el menú (FR-001)

- **Decision**: nueva ruta de layout `AppLayout` (`apps/client/src/routes/AppLayout.tsx`) envuelta en
  `RequireAuth`, con `AppNav` y un `<Outlet />`. Las rutas de módulos y `ajustes` pasan a ser sus hijas;
  `login` y la configuración de base de datos del escritorio quedan fuera.
- **Rationale**: un solo punto pinta el menú para todas las pantallas con sesión. Las páginas siguen
  teniendo su propio `<main>`.
- **Alternatives considered**: incluir el menú en cada página (duplicación; constitución VIII).

## R5. Componente genérico `NavBar` (FR-006, FR-009, FR-013, FR-019)

- **Decision**: `apps/client/src/components/NavBar.tsx` (+ CSS module y test), sin lógica de negocio. Recibe
  la marca, los elementos (`to`, `label`, `icon`, `pending`, `section`), el pie, `collapsed` y
  `onToggleCollapsed` (ver `contracts/navigation-ui.md`).
  - Enlace disponible: `NavLink` de React Router. Pone `aria-current="page"` también en subrutas, así que
    `/ajustes/usuarios` marca Ajustes.
  - Pendiente: `<span role="link" aria-disabled="true" tabIndex={0}>` sin destino, con `StatusStamp`
    `tone="warning"` «Pendiente». Recibe el foco y no navega (clarificación del 2026-10-20).
  - Plegado: la etiqueta se oculta visualmente pero sigue siendo el nombre accesible. Al pasar el ratón y
    con `:focus-visible` se muestra como etiqueta flotante, solo con CSS, sin componente `Tooltip`.
  - Botón de plegar: `IconButton` con `aria-expanded` y `aria-controls`; no se pinta en móvil.
- **Rationale**: la constitución VIII cita expresamente `NavBar` entre los genéricos. `StatusStamp` e
  `IconButton` se reutilizan.
- **Alternatives considered**: `<button disabled>` para los pendientes (sale del orden del teclado, en contra
  de la clarificación); un componente `Tooltip` genérico (de momento no tiene otro uso).

## R6. Composición de dominio: `features/navigation/` (FR-002–FR-008, FR-018)

- **Decision**:
  - `navItems.ts`: orden, etiquetas e iconos. `buildNavItems(permissions)` filtra con `can(…, 'view')`,
    mantiene Ajustes siempre y marca `pending` con `!isModuleImplemented`.
  - `NavIcons.tsx`: SVG inline de 18 px y trazo 1.8 (los de Clientes, Productos, Proveedores y Ajustes se
    copian del lienzo; los de Ventas y Cobros salen de R11).
  - `AppNav.tsx`: compone `NavBar` con `BrandMark name="Venta a mayoristas"` (como `LoginHero`), el pie
    (`user.name`, `user.roleName`, «Web»/«Escritorio» con `isDesktop()`) y `LogoutButton`.
- **Rationale**: lo transversal de la aplicación vive en `features/` igual que `auth` y `preferences`, y el
  genérico queda libre de permisos.

## R7. Estado plegado (FR-014, FR-017)

- **Decision**: slice mínimo `navigation` (`apps/client/src/features/navigation/navigationSlice.ts`) con
  `collapsed: boolean` y la acción `collapsedToggled`. El estado inicial sale de `readCollapsed()`
  (`localStorage['navigation.collapsed'] === '1'`, dentro de `try/catch`; sin valor o con error → `false`).
  El hook `useNavCollapsed()` lee el slice y, al cambiar, escribe `'1'`/`'0'` con `writeCollapsed()`
  (`try/catch`). En móvil el estado se conserva y el CSS lo ignora, así que al ensanchar vuelve el plegado
  (FR-017).
- **Rationale**: la constitución VIII exige que el estado viva en un slice por dominio. La persistencia en
  el equipo es la misma que la de `appearance.lastTheme` en 004.
- **Alternatives considered**: `useState` en el hook (deja estado fuera de Redux, en contra de VIII);
  guardarlo en el usuario (descartado en la spec).

## R8. Responsive (FR-016)

- **Decision**: `@media (max-width: 759px)`, el mismo corte que el resto de CSS (`--breakpoint-mobile`). En
  escritorio: columna de 232 px (desplegado) o 72 px (plegado, a confirmar en R11). En móvil: barra
  `position: sticky; top: 0` con `overflow-x: auto`; se ocultan el texto de la marca, el usuario y el botón
  de plegar.
- **Rationale**: es lo que define el lienzo (`Productos.dc.html`, reglas `.nav*`) y lo que ya usan las
  páginas.

## R9. Cambio de rol en vivo (FR-005)

- **Decision**: nada nuevo. `AppNav` lee `selectUser`, y `refreshSession.fulfilled` sustituye el usuario con
  los permisos nuevos, así que el menú se vuelve a pintar. Se cubre con un test de `AppNav`.

## R10. Sin dependencias nuevas

- **Decision**: React Router (`NavLink`), CSS modules y los componentes existentes bastan. La tabla de
  Tecnologías de CLAUDE.md no cambia.

## R11. Diseño previo (FR-020)

- **Decision**: antes de implementar la UI, añadir al lienzo publicado:
  - El menú plegado (ancho, etiqueta flotante y botón de plegar).
  - El sello «Pendiente» sobre fondo `--nav`, en sus versiones completa y reducida.
  - Los iconos de Ventas y Cobros, y el orden completo del menú.
  
  En el mismo cambio se refrescan `docs/design/canvas/` y `docs/design/README.md` (sección Componentes:
  «Barra lateral»).
- **Rationale**: lo exige CLAUDE.md («Diseño visual»). Los colores del sello de aviso sobre el fondo oscuro
  hay que comprobarlos (contraste AA).

## R12. Pruebas

- **Decision**:
  - Unitarias:
    - `NavBar` (activo, pendiente enfocable y sin navegación, plegado con nombre accesible, botón con
      `aria-expanded`).
    - `navItems` (permisos, orden, Ajustes siempre, pendientes).
    - `navigationSlice` y `useNavCollapsed` (persistencia y fallo de almacenamiento).
    - `AppNav` (pie, canal, cambio de rol).
    - `homeRoute` (pendientes) y `isModuleImplemented`.
  - E2E: `e2e/navigation.spec.ts` (menú tras el login, pendiente que no navega por clic ni por dirección,
    plegado que se mantiene al recargar, barra superior a 390 px).
