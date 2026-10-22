# Data Model: Pantalla provisional de Clientes

**Feature**: `007-customers-placeholder` · **Fecha**: 2026-10-22

En esta entrega **no hay persistencia**: no se crea colección ni modelo Mongoose (research R3). Lo que sigue
son los tipos compartidos (`packages/shared`) que fijan el contrato del listado.

## CustomerListItem

Fila del listado (columnas de FR-004).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string | Identificador opaco del cliente |
| `name` | string | Nombre comercial |
| `city` | string \| null | Población, bajo el nombre |
| `maxRisk` | number \| null | Euros con 2 decimales; `null` o 0 = sin límite |
| `balance` | number | Saldo pendiente en euros con 2 decimales; se muestra con `UserMoney` |
| `riskUsed` | number \| null | Porcentaje entero ≥ 0 calculado con `customerRiskUsed`; `null` sin límite |
| `lastOrderDate` | string \| null | Fecha `YYYY-MM-DD`; `null` si no hay pedidos («—») |

## Riesgo usado (`constants/customers.ts`)

`customerRiskUsed(balance, maxRisk)`:

| Condición | Resultado |
|---|---|
| `maxRisk` es `null` o ≤ 0 | `null` → «Sin límite», sin barra ni color |
| `balance` ≤ 0 | 0 |
| en otro caso | `Math.round(balance / maxRisk * 100)` (puede pasar de 100) |

`customerRiskLevel(riskUsed)` → `CustomerRiskLevel`:

| `riskUsed` | Nivel | Tono (`ProgressBar`) |
|---|---|---|
| < 50 | `low` | `ok` (verde) |
| 50 – < 80 | `medium` | `warning` (ámbar) |
| ≥ 80 | `high` | `danger` (rojo) |

## CustomerListQuery (criterios)

| Campo | Tipo | Por defecto | Validación |
|---|---|---|---|
| `q` | string? | ausente | Recortado; ≤ `CUSTOMER_SEARCH_MAX_LENGTH` (100); vacío = ausente |
| `page` | number | 1 | Entero ≥ 1 |

- Servidor: formato no válido → 400 `VALIDATION_ERROR`.
- Cliente (dirección de la pantalla, FR-007a): valor no válido → se ignora, se usa el de por defecto y se
  corrige la dirección, sin error.

## ListPage\<CustomerListItem\>

`ListPage<T>` de `types/api.ts` (006): `items`, `total`, `page`, `pageSize` (`CUSTOMERS_PAGE_SIZE`, 10).

En esta entrega, toda respuesta válida es `{ items: [], total: 0, page, pageSize: 10 }` (FR-009).

## Constantes (`constants/customers.ts`)

| Constante | Valor |
|---|---|
| `CUSTOMER_SEARCH_MAX_LENGTH` | 100 |
| `CUSTOMERS_PAGE_SIZE` | 10 |
| `CUSTOMER_RISK_THRESHOLDS` | `{ medium: 50, high: 80 }` |

## Estado del cliente (slice `customers`)

| Campo | Tipo | Notas |
|---|---|---|
| `items` | CustomerListItem[] | Vacío en esta entrega |
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
