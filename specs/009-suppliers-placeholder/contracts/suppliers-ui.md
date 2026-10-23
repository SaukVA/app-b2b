# Contrato de UI: pantalla de Proveedores

**Feature**: `009-suppliers-placeholder` · Referencia visual: `docs/design/canvas/Proveedores.dc.html` y
`ProveedoresMovil.dc.html`. Patrón de pantalla provisional: [contrato de UI de 007](../../007-customers-placeholder/contracts/customers-ui.md).

## Ruta y acceso

- Ruta `/proveedores`, dentro de `AppLayout` (menú de 005), envuelta en `RequireAuth module="proveedores"`.
- Sin sesión → `/login` conservando la dirección de origen (con sus criterios). Sin permiso → pantalla de
  inicio del usuario.
- El menú marca «Proveedores» como activo (`aria-current="page"`).

## Dirección de la pantalla (FR-007a)

| Parámetro | Ejemplo | Valor por defecto (se omite de la dirección) |
|---|---|---|
| `q` | `q=levante` | sin búsqueda |
| `includeInactive` | `includeInactive=true` | `false` |
| `page` | `page=2` | 1 |

- Un valor no válido (`page=abc`, `page=0`, `q` de más de 100 caracteres, `includeInactive=si`) se ignora, se
  usa el valor por defecto y la dirección se normaliza con `replace`, sin mostrar error.
- El campo de búsqueda y la casilla se resincronizan con la dirección cuando cambia desde fuera («Atrás»,
  enlace). Montar la pantalla no cambia la dirección.
- Teclear actualiza la dirección con `replace` 300 ms después de la última tecla y vuelve a la página 1.
- Marcar o desmarcar el filtro actualiza la dirección con `push` al momento y vuelve a la página 1.

## Estructura (de arriba abajo)

1. **Cabecera**: título «Proveedores» (h1) y debajo el contador (Mono), con N = `total`:
   - filtro desactivado: «N activos» («1 activo»);
   - filtro activado: «N proveedores» («1 proveedor»).
   Sin «Nuevo proveedor».
2. **Filtros** (`role="search"`, etiqueta accesible «Buscar proveedores»):
   - `TextField` «Buscar» (`type="search"`, `maxLength=100`, placeholder «Nombre o CIF»).
   - `Checkbox` «Mostrar dados de baja», desmarcada por defecto.
3. **Listado** dentro de un panel: `Table` con `caption` «Proveedores» y columnas:
   - Proveedor: nombre; si `active` es `false`, `StatusStamp tone="neutral"` «Baja» junto al nombre.
   - Plazo: `formatLeadTime` (Mono, alineado a la derecha). Oculta por debajo de 760 px.
   - Compras año: `UserMoney`, alineado a la derecha.
   Sin subtítulo bajo el nombre, sin columna de acciones ni ficha lateral (FR-005). Por debajo de 760 px,
   tarjetas con nombre, sello y compras del año.
4. **Zona de estado**, debajo de las cabeceras y dentro del panel; solo una a la vez:

| Estado del slice | Se muestra |
|---|---|
| `loading` | «Cargando proveedores…» (`role="status"`); tabla con `aria-busy="true"` |
| `succeeded` y 0 elementos | `EmptyState`: título «Todavía no hay proveedores», texto «Los proveedores se cargarán desde el sistema anterior.» (`role="status"`) |
| `failed` | `Alert variant="error"`: «No se ha podido cargar el listado de proveedores.» + `Button` secundario «Reintentar» |
| `succeeded` con elementos (futuro) | Filas y paginación «1–10 de N», «Anterior», «Siguiente» |

- Sin paginación con el listado vacío (FR-006).
- El aviso de «sin datos» es el mismo con y sin búsqueda, y con el filtro marcado o no (FR-012).
- «Reintentar» vuelve a pedir el listado con los criterios actuales de la dirección.

## Accesibilidad

- Orden de tabulación: búsqueda → «Mostrar dados de baja» → «Reintentar» (si hay error).
- Objetivos táctiles de 44 px (la etiqueta de la casilla incluida); foco visible.
- «Baja» se entiende por el texto del sello, no solo por su color.
- El error se anuncia de inmediato (`role="alert"`) y el vacío de forma educada (`role="status"`).
