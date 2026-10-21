# Data Model: Pantalla provisional de Productos

**Feature**: `006-products-placeholder` · **Fecha**: 2026-10-21

En esta entrega **no hay persistencia**: no se crea colección ni modelo Mongoose (research R3). Lo que sigue
son los tipos compartidos (`packages/shared`) que fijan el contrato del listado.

## ProductStatus

`'Disponible' | 'Stock bajo' | 'Sin stock'`

Regla (FR-011a), función `productStatus(stock, minStock)`:

| Condición | Estado | Tono del sello |
|---|---|---|
| `stock === 0` | Sin stock | `danger` |
| `0 < stock < minStock` | Stock bajo | `warning` |
| en otro caso | Disponible | `ok` |

El filtro `lowStock` incluye los estados **Stock bajo** y **Sin stock**.

## ProductListItem

Fila del listado (columnas de FR-004).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string | Identificador opaco del producto |
| `code` | string | Código del producto (columna «Código») |
| `name` | string | Nombre |
| `supplierName` | string \| null | Proveedor principal, bajo el nombre |
| `category` | string | Nombre de la categoría |
| `subcategory` | string \| null | Nombre de la subcategoría (opcional) |
| `stock` | number | Entero ≥ 0; cantidad, nunca importe |
| `minStock` | number | Entero ≥ 0; cantidad, nunca importe |
| `price` | number | Euros con 2 decimales; se muestra con `UserMoney` |
| `status` | ProductStatus | Calculado con `productStatus(stock, minStock)` |

## ProductListQuery (criterios)

| Campo | Tipo | Por defecto | Validación |
|---|---|---|---|
| `q` | string? | ausente | Recortado; ≤ `PRODUCT_SEARCH_MAX_LENGTH` (100); vacío = ausente |
| `category` | string? | ausente («Todas») | `PRODUCT_FILTER_ID_PATTERN` `^[A-Za-z0-9_-]{1,64}$` |
| `subcategory` | string? | ausente («Todas») | Ídem |
| `supplier` | string? | ausente («Todos») | Ídem |
| `lowStock` | boolean | `false` | En la query, `'true'` o `'false'` |
| `page` | number | 1 | Entero ≥ 1 |

- Servidor: formato no válido → 400 `VALIDATION_ERROR`. Identificador bien formado e inexistente → listado
  vacío (FR-009).
- Cliente (dirección de la pantalla, FR-008a): valor no válido → se ignora y se usa el valor por defecto.
  Mientras no haya catálogo, el cliente no lee `category`, `subcategory` ni `supplier` de la dirección y nunca
  los envía; el tipo los mantiene para fijar el contrato.

## ListPage\<T\> (genérico, `types/api.ts`)

| Campo | Tipo | Reglas |
|---|---|---|
| `items` | T[] | Elementos de la página |
| `total` | number | Total de elementos que cumplen los criterios |
| `page` | number | Página devuelta (la pedida) |
| `pageSize` | number | `PRODUCTS_PAGE_SIZE` (10) para productos |

En esta entrega, toda respuesta válida es `{ items: [], total: 0, page, pageSize: 10 }` (FR-010).

## Constantes (`constants/products.ts`)

| Constante | Valor |
|---|---|
| `PRODUCT_SEARCH_MAX_LENGTH` | 100 |
| `PRODUCTS_PAGE_SIZE` | 10 |
| `PRODUCT_FILTER_ID_PATTERN` | `/^[A-Za-z0-9_-]{1,64}$/` |
| `PRODUCT_STATUSES` | `['Disponible', 'Stock bajo', 'Sin stock']` |

## Estado del cliente (slice `products`)

| Campo | Tipo | Notas |
|---|---|---|
| `items` | ProductListItem[] | Vacío en esta entrega |
| `total` | number | |
| `status` | `'idle' \| 'loading' \| 'succeeded' \| 'failed'` | |
| `error` | string \| null | Mensaje fijo de FR-014, nunca el del servidor |
| `requestId` | string \| null | Última petición; las respuestas de otras se ignoran (R7) |

Los criterios **no** están en el slice: viven en la dirección de la pantalla (R6).

## Transiciones de estado de la pantalla

```text
idle ──abrir/cambiar criterios──▶ loading ──200──▶ succeeded (items vacíos → EmptyState)
                                     │
                                     └─error/sin respuesta──▶ failed (Alert + «Reintentar»)
failed ──Reintentar──▶ loading
```
