# Contrato de UI: menú y login sin marca

**Feature**: `008-design-alignment` · Referencia visual: `docs/design/canvas/*.dc.html` (barra lateral y Login) y `docs/design/README.md` › Componentes («Sin marca», «Barra lateral»).

Actualiza el [contrato de UI de 005](../../005-app-navigation/contracts/navigation-ui.md) §1. Las reglas que no se citan aquí (N1–N3) no cambian.

## 1. `NavBar` (apps/client/src/components/NavBar.tsx)

| Prop | Cambio |
|---|---|
| `brand`, `brandCollapsed` | **Se eliminan** (FR-001) |
| `onToggleCollapsed`, `toggleIcon` | Se mantienen; el control pasa a ser un elemento de la lista |
| `footer` | Se mantiene; contenido definido por `AppNav` (§2) |

| # | Regla | Requisito |
|---|---|---|
| N4′ | Con `collapsed`, las etiquetas de todos los elementos (también la de plegar) se ocultan visualmente y flotan con `:hover` y `:focus-visible`. No hay marca que ocultar. | FR-003 |
| N5′ | El control de plegar es el último `<li>` de la lista inferior, justo debajo de Ajustes: `<button type="button">` con la clase de elemento y el modificador `muted` (color `--disabled`). Lleva icono `toggleIcon`, `span.label` «Plegar menú» / «Desplegar menú» como nombre accesible, `title` con el mismo texto, `aria-expanded={!collapsed}` y `aria-controls` del `<nav>`. Alto mínimo de 44 px. | FR-002, FR-003 |
| N6′ | Por debajo de 760 px: barra horizontal `sticky` sin marca, sin el `<li>` de plegar y con el pie reducido al botón de cerrar sesión, sea cual sea `collapsed`. | FR-004, FR-008 |
| N7 | El elemento de plegar y los botones del pie: `:hover` → fondo `--nav-active`, texto `--nav-text-active`; `:focus-visible` → `outline: 2px solid var(--nav-icon-active)`, `outline-offset: 2px`. | FR-009 |

## 2. Pie de usuario (`NavFooter` en features/navigation/components/AppNav.tsx)

Una fila (`display: flex; align-items: center; gap: 10px`), separada por `border-top: 1px solid #2c3238`:

1. **Avatar**: `span` de 36×36, radio 6, fondo `--nav-active`, icono de persona de 18 px en `--nav-text`, `aria-hidden="true"`.
2. **Texto** (`min-width: 0; flex: 1`):
   - nombre: 13/600, `--nav-text-active`, una línea con puntos suspensivos y `title={user.name}`;
   - «`roleName` · Web|Escritorio»: 12/400, `--disabled`, una línea con puntos suspensivos y `title` con el texto completo.
3. **Cerrar sesión**: `LogoutButton` de 44×44 a la derecha, con `LogoutIcon` y texto «Cerrar sesión» oculto visualmente (nombre accesible) y `title="Cerrar sesión"`.

| Estado | Se ve |
|---|---|
| Desplegado (≥ 760 px) | Avatar + textos + botón |
| Plegado (≥ 760 px) | Solo el botón, centrado; el texto «Cerrar sesión» flota con `:hover` y `:focus-visible` |
| Estrecho (< 760 px) | Solo el botón de icono 44×44, sin texto visible (clarificación 2026-10-22), en línea con la barra, plegado o no |

## 3. Login (`LoginHero` y `LoginPage`)

| Anchura | Hero | Formulario |
|---|---|---|
| > 760 px (contenedor `login`) | Panel oscuro con titular, texto y «Web y escritorio», **sin** `BrandMark` | A la derecha, centrado |
| ≤ 760 px | `display: none` | Centrado en vertical y horizontal (`.main` sin `align-items: flex-start`), padding 32 16 40 |

En el escritorio, el indicador de base de datos y «Cambiar base de datos» siguen en la columna del formulario.

## 4. Ajustes

- Subtítulo: «Preferencias de la aplicación y acceso de usuarios.» (FR-012). Pestañas sin cambios.
