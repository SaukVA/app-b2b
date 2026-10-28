# Data Model: Gestión de proveedores

**Feature**: `010-suppliers-management` · **Fecha**: 2026-10-26 · **Spec**: [spec.md](spec.md)

## Documento `Supplier` (colección `suppliers`)

| Campo | Tipo | Reglas (FR-004) |
|---|---|---|
| `_id` | ObjectId | |
| `name` | string | Obligatorio, 1–120 tras recortar. Índice con collation `es` (fuerza 1). |
| `cif` | string | Obligatorio, normalizado (mayúsculas, sin espacios, puntos ni guiones). **Único**. Español válido salvo `foreign`; extranjero: 3–20 letras y números. |
| `foreign` | boolean | Por defecto `false`. |
| `address` | string | Obligatorio, 1–200. |
| `postalCode` | string | Obligatorio. Español: 5 cifras. Extranjero: 3–10 letras, números, espacios o guiones. |
| `city` | string | Obligatorio, 1–100. |
| `contactPerson` | string \| null | Hasta 120. |
| `phones` | `{ label: string \| null, value: string }[]` | 0–5. `value`: 6–20 de dígitos, espacios, `+`, `-`, `()`. `label`: hasta 40. |
| `emails` | `{ label: string \| null, value: string }[]` | 0–5. `value`: correo válido. `label`: hasta 40. |
| `paymentMethod` | enum | `TRANSFER_30`, `TRANSFER_60`, `DIRECT_DEBIT`, `PROMISSORY_NOTE`, `CASH`. Por defecto `TRANSFER_30`. |
| `iban` | string \| null | Normalizado (mayúsculas, sin espacios). IBAN válido (formato y módulo 97). |
| `web` | string \| null | URL `http(s)`; si llega sin protocolo se guarda con `https://`. |
| `leadTimeDays` | number \| null | Entero 0–365. |
| `minOrder` | number \| null | Euros, > 0, 2 decimales. `null` = sin pedido mínimo. |
| `notes` | string \| null | Hasta 2.000, conserva saltos de línea. |
| `active` | boolean | Por defecto `true`. Índice. |
| `version` | number | Empieza en 0; +1 en cada escritura (R6). |
| `createdBy` | `{ id: string, login: string }` | Usuario que lo dio de alta (FR-012b). |
| `updatedBy` | `{ id: string, login: string }` | Último usuario que lo cambió (incluye baja y reactivación). |
| `createdAt` / `updatedAt` | Date | `timestamps` de Mongoose. |

No se guardan las compras: se calculan (R7).

### Transiciones de estado

```text
          alta (POST)                      PATCH status {active:false}
(nada) ─────────────► Activo ──────────────────────────────► Dado de baja
                        ▲                                          │
                        └────────── PATCH status {active:true} ────┘
```

Nunca se borra (FR-018). La edición (PUT) es válida en los dos estados (FR-019). Toda escritura sube `version` y
actualiza `updatedBy`.

## Tipos compartidos (`packages/shared/src/types/supplier.ts`)

```ts
type PaymentMethod = 'TRANSFER_30' | 'TRANSFER_60' | 'DIRECT_DEBIT' | 'PROMISSORY_NOTE' | 'CASH';
type Quarter = 1 | 2 | 3 | 4;
interface SupplierContact { label: string | null; value: string }
interface AuditUser { id: string; login: string }          // nuevo en shared; no se toca el UserRef interno de users (003)

interface SupplierListItem {                               // ampliado respecto a 009
  id: string; name: string; cif: string; city: string;
  leadTimeDays: number | null;
  quarterPurchases: number;                                // del trimestre pedido, sin IVA
  yearPurchases: number;                                   // del año en curso, sin IVA
  active: boolean;
}
interface SupplierListQuery { q?: string; includeInactive: boolean; quarter: Quarter; page: number }

interface SupplierInput {
  name: string; cif: string; foreign: boolean;
  address: string; postalCode: string; city: string;
  contactPerson: string | null; phones: SupplierContact[]; emails: SupplierContact[];
  paymentMethod: PaymentMethod; iban: string | null;
  web: string | null; leadTimeDays: number | null; minOrder: number | null;
  notes: string | null;
}
interface SupplierUpdateInput extends SupplierInput { version: number }
interface SupplierStatusInput { active: boolean; version: number }

interface SupplierDetail extends SupplierInput {
  id: string; active: boolean; version: number;
  yearPurchases: number; quarterPurchases: [number, number, number, number];
  createdBy: AuditUser; createdAt: string; updatedBy: AuditUser; updatedAt: string;
}
```

`ListPage<SupplierListItem>` se reutiliza de `types/api.ts`.

## Constantes (`packages/shared/src/constants/suppliers.ts`)

- Existentes: `SUPPLIER_SEARCH_MAX_LENGTH = 100`, `SUPPLIERS_PAGE_SIZE = 10`.
- Nuevas: `SUPPLIER_LIMITS` (longitudes y máximos de FR-004, `maxContacts: 5`), `PAYMENT_METHODS` (valor y texto
  visible: «Transferencia 30 días», «Transferencia 60 días», «Domiciliación bancaria», «Pagaré», «Contado»),
  `DEFAULT_PAYMENT_METHOD = 'TRANSFER_30'` y `SUPPLIER_ERROR_CODES`:

| Clave | Código | Status |
|---|---|---|
| `notFound` | `SUPPLIER_NOT_FOUND` | 404 |
| `cifTaken` | `SUPPLIER_CIF_TAKEN` | 409 |
| `versionConflict` | `SUPPLIER_VERSION_CONFLICT` | 409 |

## Validadores compartidos (`packages/shared/src/utils/`)

| Función | Qué hace |
|---|---|
| `normalizeTaxId(v)` | Mayúsculas y sin espacios, puntos ni guiones. |
| `isValidSpanishTaxId(v)` | NIF (DNI), NIE o CIF con su carácter de control. |
| `normalizeIban(v)` / `formatIban(v)` | Sin espacios en mayúsculas / en grupos de 4. |
| `isValidIban(v)` | Longitud por país conocida o 15–34, y módulo 97 = 1. |

## Estado del cliente (`features/suppliers/suppliersSlice.ts`)

```ts
interface SuppliersState {
  list: …;                                   // el de 009, sin cambios de forma
  detail: { status: 'idle' | 'loading' | 'ready' | 'notFound' | 'error'; data: SupplierDetail | null };
  save: { status: 'idle' | 'saving' | 'saved' | 'error'; error: string | null; conflict: boolean };
}
```

- `save.conflict` = respuesta 409 `SUPPLIER_VERSION_CONFLICT` (aviso «Otro usuario ha cambiado…»).
- `SUPPLIER_CIF_TAKEN` se lleva al error del campo CIF, no a `save.error`.
- `save.status = 'saved'` hace que la ficha muestre el aviso breve de guardado (FR-009).

## Valores del formulario (`features/suppliers/supplierForm.ts`)

Todos los campos como texto (lo que escribe el usuario), contactos como filas `{ label, value }` y `foreign`
como booleano. `toSupplierInput(values)` recorta, normaliza CIF e IBAN, convierte números y descarta filas de
contacto vacías; `fromSupplierDetail(detail)` hace lo contrario; `validateSupplierForm(values, { cifOwnerName })`
devuelve `Partial<Record<campo, mensaje>>` con los textos de [contracts/suppliers-ui.md](contracts/suppliers-ui.md).
