# Data Model: Pantalla provisional de Proveedores

**Feature**: `009-suppliers-placeholder` · **Fecha**: 2026-10-23

En esta entrega **no hay persistencia**: no se crea colección ni modelo Mongoose (research R3). Lo que sigue
son los tipos compartidos (`packages/shared`) que fijan el contrato del listado.

## SupplierListItem

Fila del listado (columnas de FR-004 y estado de FR-004a).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string | Identificador opaco del proveedor |
| `name` | string | Nombre del proveedor |
| `leadTimeDays` | number \| null | Plazo de entrega en días naturales, entero ≥ 0; `null` si no se conoce («—») |
| `yearPurchases` | number | Euros sin IVA con 2 decimales, del 1 de enero del año en curso hasta hoy; se muestra con `UserMoney` |
| `active` | boolean | `false` = dado de baja → sello «Baja» |

El CIF no forma parte del listado: el servidor lo usará para buscar cuando haya datos (research R6).

### Plazo en pantalla (`formatLeadTime`)

| `leadTimeDays` | Texto |
|---|---|
| `null` | «—» |
| 1 | «1 día» |
| cualquier otro | «N días» (incluido «0 días») |

## SupplierListQuery (criterios)

| Campo | Tipo | Por defecto | Validación |
|---|---|---|---|
| `q` | string? | ausente | Recortado; ≤ `SUPPLIER_SEARCH_MAX_LENGTH` (100); vacío = ausente. Buscará en nombre y CIF |
| `includeInactive` | boolean | `false` | En la query, `true` o `false` |
| `page` | number | 1 | Entero ≥ 1 |

- Servidor: formato no válido → 400 `VALIDATION_ERROR`.
- Cliente (dirección de la pantalla, FR-007a): valor no válido → se ignora, se usa el de por defecto y se
  corrige la dirección, sin error.

## ListPage\<SupplierListItem\>

`ListPage<T>` de `types/api.ts`: `items`, `total`, `page`, `pageSize` (`SUPPLIERS_PAGE_SIZE`, 10).

- `total` cuenta solo los activos con `includeInactive=false` y todos con `includeInactive=true` (FR-004a).
- En esta entrega, toda respuesta válida es `{ items: [], total: 0, page, pageSize: 10 }` (FR-009).

## Constantes (`constants/suppliers.ts`)

| Constante | Valor |
|---|---|
| `SUPPLIER_SEARCH_MAX_LENGTH` | 100 |
| `SUPPLIERS_PAGE_SIZE` | 10 |

## Estado del cliente (slice `suppliers`)

| Campo | Tipo | Notas |
|---|---|---|
| `items` | SupplierListItem[] | Vacío en esta entrega |
| `total` | number | |
| `status` | `'idle' \| 'loading' \| 'succeeded' \| 'failed'` | |
| `error` | string \| null | Mensaje fijo de FR-013, nunca el del servidor |
| `requestId` | string \| null | Última petición; las respuestas de otras se ignoran (R9) |

Los criterios **no** están en el slice: viven en la dirección de la pantalla (R8).

## Transiciones de estado de la pantalla

```text
idle ──abrir/cambiar criterios──▶ loading ──200──▶ succeeded (items vacíos → EmptyState)
                                     │
                                     └─error/sin respuesta──▶ failed (Alert + «Reintentar»)
failed ──Reintentar──▶ loading
```
