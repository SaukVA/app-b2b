# Contrato de UI: menú de navegación (005-app-navigation)

La feature no añade endpoints. Este documento fija:

- El contrato del componente genérico `NavBar`.
- El comportamiento observable que prueban los tests (unitarios y E2E).
- El cambio de comportamiento del endpoint existente `PATCH /api/preferences`.

## 1. `NavBar` (apps/client/src/components/NavBar.tsx)

```ts
export interface NavBarItem {
  to: string;          // destino; se ignora si pending
  label: string;       // texto visible y nombre accesible
  icon: ReactNode;     // SVG 18 px, aria-hidden
  pending?: boolean;   // muestra «Pendiente» y no navega
  section?: 'main' | 'footer'; // 'footer' va separado al final (Ajustes)
}

export interface NavBarProps {
  label: string;                 // aria-label del <nav>, p. ej. «Principal»
  brand: ReactNode;              // BrandMark completo
  brandCollapsed?: ReactNode;    // solo el logotipo
  items: NavBarItem[];
  footer?: ReactNode;            // datos del usuario + «Cerrar sesión»
  collapsed?: boolean;
  onToggleCollapsed?: () => void; // sin él no se pinta el botón de plegar
}
```

Reglas:

| # | Comportamiento | Requisito |
|---|---|---|
| N1 | Un único `<nav aria-label={label}>`; los elementos van en el orden recibido y los de `section: 'footer'` van después, separados. | FR-002 |
| N2 | El elemento cuya ruta coincide con la actual (o con un prefijo suyo) lleva `aria-current="page"` y el estilo activo. Solo uno. | FR-006 |
| N3 | Un elemento `pending` se pinta como `role="link"`, `aria-disabled="true"` y `tabIndex=0`, sin `href`, con `StatusStamp tone="warning"` «Pendiente». Ni el clic, ni Intro, ni Espacio cambian la ruta. | FR-009 |
| N4 | Con `collapsed`, se ocultan visualmente las etiquetas y el texto de la marca, pero el nombre accesible de cada elemento sigue siendo `label`. La etiqueta se ve al pasar el ratón y con `:focus-visible`. «Pendiente» pasa a una marca reducida que sigue teniendo texto accesible. | FR-013 |
| N5 | Botón de plegar: `IconButton` con `aria-expanded={!collapsed}`, `aria-controls` del `<nav>` y `aria-label` «Plegar menú» / «Desplegar menú». | FR-012 |
| N6 | Por debajo de 760 px: barra horizontal `sticky` arriba con desplazamiento horizontal, sin el texto de la marca, sin el pie (salvo «Cerrar sesión») y sin botón de plegar, sea cual sea `collapsed`. | FR-016, FR-017 |
| N7 | Objetivo táctil de 44 px como mínimo por elemento; tokens `--nav*`; tema claro y oscuro. | FR-019 |

## 2. Comportamiento de la aplicación

| # | Situación | Resultado esperado | Requisito |
|---|---|---|---|
| A1 | Pantalla con sesión (`/ajustes/*` y módulos implementados) | Se muestra el menú | FR-001 |
| A2 | `/login` o configuración de base de datos del escritorio | Sin menú (escritorio: comprobación manual, quickstart §4) | FR-001 |
| A3 | Rol sin `view` en un módulo | El módulo no aparece en el menú | FR-003 |
| A4 | Cualquier rol | Aparece Ajustes | FR-004 |
| A5 | El refresco de sesión trae otros permisos | El menú cambia sin recargar | FR-005 |
| A6 | Dirección de un módulo pendiente (p. ej. `/ventas`) | Redirige a la pantalla de inicio (hoy `/ajustes/apariencia`) | FR-011 |
| A7 | Login con `from` igual a un módulo pendiente | Va a la pantalla de inicio, no al pendiente | FR-011 |
| A8 | Pie del menú | `name`, `roleName` · «Web» o «Escritorio», y «Cerrar sesión» | FR-007, FR-008 |
| A9 | Recargar con el menú plegado | Sigue plegado (`localStorage['navigation.collapsed'] = '1'`) | FR-014 |
| A10 | Sin almacenamiento disponible | Desplegado, sin errores | FR-014 |

## 3. Cambio en `PATCH /api/preferences` (004)

Ni la forma ni los códigos cambian; cambia el conjunto de valores válidos de `homeScreen`:

- Solo se aceptan pantallas de **módulos implementados** (`IMPLEMENTED_MODULES`) que el rol pueda ver. Hoy no
  hay ninguna, así que cualquier pantalla distinta de `null` responde 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED`.
- En el mismo commit hay que actualizar la descripción `@openapi` de `homeScreen` en
  `apps/server/src/modules/preferences/preferences.routes.ts`, así como
  `specs/004-appearance-preferences/contracts/preferences-api.openapi.yaml` (nota que remita a 005).
