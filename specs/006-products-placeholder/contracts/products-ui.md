# Contrato de UI: pantalla de Productos

**Feature**: `006-products-placeholder` · Referencia visual: `docs/design/canvas/Productos.dc.html` y
`ProductosMovil.dc.html`.

## Ruta y acceso

- Ruta `/productos`, dentro de `AppLayout` (menú de 005), envuelta en `RequireAuth module="productos"`.
- Sin sesión → `/login` conservando la dirección de origen (con sus criterios). Sin permiso → pantalla de
  inicio del usuario.
- El menú marca «Productos» como activo (`aria-current="page"`).

## Dirección de la pantalla (FR-008a)

| Parámetro | Ejemplo | Valor por defecto (se omite de la dirección) |
|---|---|---|
| `q` | `q=aceite` | sin búsqueda |
| `category` | `category=alimentacion` | «Todas» |
| `subcategory` | `subcategory=aceites` | «Todas» |
| `supplier` | `supplier=prov-12` | «Todos» |
| `lowStock` | `lowStock=true` | desmarcado |
| `page` | `page=2` | 1 |

- Un valor no válido se ignora y se usa el valor por defecto; la dirección se normaliza con `replace`.
- Teclear en la búsqueda actualiza la dirección con `replace` 300 ms después de la última tecla. Cambiar un
  filtro crea una entrada de historial. Cualquier cambio de criterio vuelve a la página 1.

## Estructura (de arriba abajo)

1. **Cabecera**: título «Productos» (h1) y debajo «N referencias» (Mono), con N = `total`. Sin «Importar
   CSV» ni «Nuevo producto».
2. **Filtros** (`role="search"`, etiqueta accesible «Filtrar productos»):
   - `TextField` «Buscar» (`type="search"`, `maxLength=100`, placeholder «Código o nombre»).
   - `Select` «Categoría» (solo «Todas»), «Subcategoría» (solo «Todas»), «Proveedor» (solo «Todos»).
   - `Checkbox` «Solo stock bajo».
3. **Listado** dentro de un panel: `Table` con `caption` «Productos» y columnas Código, Producto (nombre +
   proveedor), Categoría (`categoría › subcategoría`), Stock (`stock / mín. minStock`, Mono, derecha), Precio
   (`UserMoney`, derecha) y Estado (`StatusStamp`). Sin columna de acciones. Por debajo de 760 px, tarjetas.
4. **Zona de estado**, debajo de las cabeceras y dentro del panel; solo una a la vez:

| Estado del slice | Se muestra |
|---|---|
| `loading` | «Cargando productos…» (`role="status"`); tabla con `aria-busy="true"` |
| `succeeded` y 0 elementos | `EmptyState`: título «Todavía no hay productos», texto «El catálogo se cargará desde el sistema anterior.» (`role="status"`) |
| `failed` | `Alert variant="error"`: «No se ha podido cargar el listado de productos.» + `Button` secundario «Reintentar» |
| `succeeded` con elementos (futuro) | Filas y paginación «1–10 de N», «Anterior», «Siguiente» |

- Sin paginación con el listado vacío.
- «Reintentar» vuelve a pedir el listado con los criterios actuales de la dirección.

## Componente genérico nuevo: `EmptyState`

| Prop | Tipo | Notas |
|---|---|---|
| `title` | string | Sans 18/600, `ink` |
| `children` | ReactNode | Texto 14/400, `ink2` |

- Contenedor con `role="status"` (se anuncia al aparecer), padding 32, centrado, sin color de estado.
- Sin lógica de negocio ni llamadas a la API (constitución VIII). Se documenta en `docs/design/README.md`.

## Accesibilidad

- Orden de tabulación: búsqueda → categoría → subcategoría → proveedor → «Solo stock bajo» → «Reintentar»
  (si hay error).
- Objetivos táctiles de 44 px (los componentes existentes ya lo cumplen).
- Los avisos se entienden por su texto; el error se anuncia de inmediato (`role="alert"`) y el vacío de forma
  educada (`role="status"`).
