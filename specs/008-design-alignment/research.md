# Research: Ajuste de la aplicación al nuevo diseño del menú y del login

**Feature**: `008-design-alignment` · **Fecha**: 2026-10-22 · **Spec**: [spec.md](spec.md)

No queda ningún `NEEDS CLARIFICATION`: es un cambio solo de presentación sobre componentes existentes de 001 y 005. La referencia visual son los tableros actualizados de `docs/design/canvas/` (pendientes de commit) y `docs/design/README.md`. La duda de producto se cerró en `/speckit-clarify` (2026-10-22).

## R1 · Retirada de la marca

- **Decision**: se eliminan las props `brand` y `brandCollapsed` de `NavBar` y el `<div className={styles.brand}>`. `AppNav` deja de pasar `BrandMark`. `LoginHero` deja de pintar `BrandMark`. Como `BrandMark` se queda sin usos, se borran `components/BrandMark.tsx`, su CSS y su test.
- **Rationale**: FR-001 prohíbe la marca en todas las pantallas. Con un componente genérico sin usos y una prop sin consumidores se arrastra código muerto, y se tocan los mismos ficheros en cualquier caso.
- **Alternatives considered**:
  - Dejar la prop `brand` opcional sin pasarla: API que nadie usa.
  - Conservar `BrandMark` «para el futuro»: el diseño dice explícitamente «Sin marca».

## R2 · «Plegar menú» como elemento de la lista

- **Decision**: el botón de plegar pasa a ser un `<li>` al final de la lista inferior (`section: 'footer'`), justo debajo de Ajustes:
  - un `<button type="button">` con la clase `item` de `NavBar` más un modificador `muted` en `--disabled`;
  - icono `CollapseIcon` (doble chevrón, ya existe) y texto visible «Plegar menú» / «Desplegar menú» en el `span.label`;
  - `aria-expanded` y `aria-controls`;
  - `title` con el mismo texto, como en el tablero.

  El nombre accesible sale del texto visible y desaparece `aria-label`. Plegado, el texto se oculta visualmente y flota con `:hover` y `:focus-visible`, igual que el resto de elementos (N4). Por debajo de 760 px se oculta el `<li>`.
- **Rationale**: FR-002 y FR-003. Reutilizar `.item` y `.label` da el alto de 44 px, los márgenes y la etiqueta flotante sin CSS nuevo. Los tests existentes (`getByRole('button', { name: 'Plegar menú' })`) siguen valiendo.
- **Alternatives considered**: mantener `IconButton` y cambiar solo su estilo. No coincide con el tablero, que lo pinta como un elemento más con texto.

## R3 · Pie de usuario en una fila

- **Decision**: `NavFooter` (en `AppNav`) pasa a una fila con tres partes:
  - un avatar `span` de 36 px con un `PersonIcon` nuevo en `NavIcons.tsx`, `aria-hidden`;
  - un bloque de texto con el nombre (13/600) y «rol · canal» (12/400 `--disabled`), cada línea con `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` y `title` con su texto completo (clarificación);
  - el botón «Cerrar sesión».

  «Cerrar sesión» sigue siendo `LogoutButton`, ahora con contenido de solo icono y nombre accesible «Cerrar sesión» por texto oculto visualmente, más `title`. Es un objetivo de 44×44 a la derecha.

  Plegado y en estrecho se ocultan el avatar y los textos, y queda solo el botón. Plegado, el texto oculto flota como hoy.
- **Rationale**: FR-005 a FR-008. El recorte con `title` es la opción A aclarada. Los lectores leen el texto completo, porque el recorte es solo de CSS.
- **Alternatives considered**: `IconButton` para cerrar sesión. Obligaría a duplicar la lógica de `LogoutButton` (dispatch + navegación) o a cambiar su API. Es más sencillo pasarle `className` e hijos, que ya acepta.

## R4 · Estilos de hover y foco en el menú

- **Decision**: el elemento de plegar y el botón de cerrar sesión toman `background: var(--nav-active)` y `color: var(--nav-text-active)` con `:hover`. Con `:focus-visible` muestran `outline: 2px solid var(--nav-icon-active)` y `outline-offset: 2px`. En claro, los tokens valen `#262b31` y `#f08a5d`, los del tablero.
- **Rationale**: FR-009. `--nav-icon-active` (`#F08A5D`) contra `--nav` (`#16191D`) da 7,1:1 (7,9:1 en oscuro), por encima del 3:1 que piden los contornos de foco. Se usan tokens y no valores fijos (constitución VIII).

## R5 · Login sin panel en estrecho

- **Decision**: en `LoginHero.module.css`, dentro de `@container login (max-width: 760px)`, `.hero { display: none; }`. Desaparece la regla de franja (`padding: 16px 20px`) y la ocultación de `.claim`/`.footer`, que ya no hacen falta. En `LoginPage.module.css` se quita `align-items: flex-start` del `.main` estrecho, para que el formulario quede centrado en vertical y horizontal (FR-011). En ancho, el hero conserva el titular, el texto y «Web y escritorio».
- **Rationale**: FR-010 y FR-011, y el tablero `LoginMovil` (`lg-hero hide-m`, `.lg-main` sin `align-items:flex-start`). El indicador de base de datos del escritorio vive en la columna del formulario, no en el hero, así que no se pierde.
- **Accesibilidad**: en estrecho la página se queda sin el `h1` del hero, y el encabezado principal pasa a ser el `h2` «Iniciar sesión» del formulario. Se acepta: es una sola pantalla con un único formulario, y el `h1` es el titular de marketing que el diseño retira en móvil. No hay requisito de `h1` en la constitución ni en la spec.
- **Alternatives considered**: ocultar el hero solo visualmente para conservar el `h1`. Anunciaría a los lectores de pantalla un texto que no se ve.

## R6 · Subtítulo de Ajustes

- **Decision**: cambiar el texto en `pages/SettingsPage.tsx` a «Preferencias de la aplicación y acceso de usuarios.» y actualizar el comentario de `useSettingsTabs`, que aún menciona «Base de datos».
- **Rationale**: FR-012.

## R7 · Copia del diseño en el repositorio

- **Decision**: la copia actualizada de `docs/design/` (README y 12 tableros, ya en la carpeta de trabajo de esta rama) se incorpora en un commit `docs(008)` al principio de la implementación, antes del código. Va en el mismo PR (FR-014). El README no necesita más cambios: ya describe «Sin marca», el elemento de plegar y el pie.
- **Rationale**: la regla de CLAUDE.md (lienzo y README en el mismo cambio) y un historial legible.

## R8 · Tests afectados

- **Decision**: se ajustan en el mismo cambio:
  - `components/NavBar.test.tsx`: sin `brand`; el toggle como elemento de la lista con texto visible.
  - `features/navigation/components/AppNav.test.tsx`: pie en una fila, `title` con el texto completo y botón de icono «Cerrar sesión».
  - `features/auth/components/LoginHero` y `pages/LoginPage.test.tsx`, si comprueban la marca.
  - `pages/SettingsPage.test.tsx`: subtítulo.
  - `e2e/navigation.spec.ts`: la línea 162 deja de buscar «Venta a mayoristas» y pasa a comprobar que no hay marca en ninguna anchura; nuevos casos del pie.
  - Un E2E de login en estrecho, en `e2e/smoke.spec.ts`: sin panel y con el formulario centrado.

  Se borra `components/BrandMark.test.tsx` junto con el componente (R1).
- **Rationale**: constitución VII.

## R9 · Escritorio, dependencias y alcance

- **Decision**: sin cambios en `apps/server`, `apps/desktop` ni `packages/shared`. Sin dependencias nuevas. Clientes (007, PR #9) toca el mismo `AppNav` solo a través de `IMPLEMENTED_MODULES`, así que no hay conflicto previsible al fusionar en cualquier orden.
- **Rationale**: constitución V.
