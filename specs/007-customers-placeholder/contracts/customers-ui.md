# Contrato de UI: pantalla de Clientes

**Feature**: `007-customers-placeholder` · Referencia visual: `docs/design/canvas/Clientes.dc.html` y
`ClientesMovil.dc.html`. Patrón de pantalla provisional: [contrato de UI de 006](../../006-products-placeholder/contracts/products-ui.md).

## Ruta y acceso

- Ruta `/clientes`, dentro de `AppLayout` (menú de 005), envuelta en `RequireAuth module="clientes"`.
- Sin sesión → `/login` conservando la dirección de origen (con sus criterios). Sin permiso → pantalla de
  inicio del usuario.
- El menú marca «Clientes» como activo (`aria-current="page"`).

## Dirección de la pantalla (FR-007a)

| Parámetro | Ejemplo | Valor por defecto (se omite de la dirección) |
|---|---|---|
| `q` | `q=ferreteria` | sin búsqueda |
| `page` | `page=2` | 1 |

- Un valor no válido (`page=abc`, `page=0`, `q` de más de 100 caracteres) se ignora, se usa el valor por
  defecto y la dirección se normaliza con `replace`, sin mostrar error.
- El campo de búsqueda se resincroniza con `q` cuando la dirección cambia desde fuera («Atrás», enlace). Montar
  la pantalla no cambia la dirección.
- Teclear actualiza la dirección con `replace` 300 ms después de la última tecla y vuelve a la página 1.

## Estructura (de arriba abajo)

1. **Cabecera**: título «Clientes» (h1) y debajo «N fichas» (Mono), con N = `total`. Sin «Nuevo cliente».
2. **Búsqueda** (`role="search"`, etiqueta accesible «Buscar clientes»): `TextField` «Buscar»
   (`type="search"`, `maxLength=100`, placeholder «Buscar cliente»).
3. **Listado** dentro de un panel: `Table` con `caption` «Clientes» y columnas:
   - Cliente: nombre y, debajo, población; sin población (`city: null`), solo el nombre.
   - Riesgo usado: `NN %` (Mono) + `ProgressBar` del tono del umbral; «Sin límite» si `riskUsed` es `null`.
   - Saldo: `UserMoney`, alineado a la derecha.
   - Último pedido: `DD/MM/AAAA` (Mono) o «—».
   Sin columna de acciones ni ficha lateral (FR-005). Por debajo de 760 px, tarjetas con los mismos datos.
4. **Zona de estado**, debajo de las cabeceras y dentro del panel; solo una a la vez:

| Estado del slice | Se muestra |
|---|---|
| `loading` | «Cargando clientes…» (`role="status"`); tabla con `aria-busy="true"` |
| `succeeded` y 0 elementos | `EmptyState`: título «Todavía no hay clientes», texto «La cartera se cargará desde el sistema anterior.» (`role="status"`) |
| `failed` | `Alert variant="error"`: «No se ha podido cargar el listado de clientes.» + `Button` secundario «Reintentar» |
| `succeeded` con elementos (futuro) | Filas y paginación «1–10 de N», «Anterior», «Siguiente» |

- Sin paginación con el listado vacío (FR-006).
- «Reintentar» vuelve a pedir el listado con los criterios actuales de la dirección.

## Componente genérico nuevo: `ProgressBar`

| Prop | Tipo | Notas |
|---|---|---|
| `value` | number | Porcentaje; el relleno se limita a 0–100 |
| `tone` | `'ok' \| 'warning' \| 'danger'` | Color del semáforo del README de diseño |
| `label` | string | Nombre accesible, p. ej. «Riesgo usado» |

- `role="meter"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow` con el valor limitado y
  `aria-valuetext` con el porcentaje real (p. ej. «112 %»).
- 4 px de alto, pista `surface2`, relleno del color del tono. Sin lógica de negocio.

## Accesibilidad

- Orden de tabulación: búsqueda → «Reintentar» (si hay error).
- Objetivos táctiles de 44 px; foco visible.
- El riesgo se entiende por la cifra, no solo por el color de la barra.
- El error se anuncia de inmediato (`role="alert"`) y el vacío de forma educada (`role="status"`).
