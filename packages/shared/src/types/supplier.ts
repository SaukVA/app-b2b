/** Forma de pago al proveedor (010 FR-004); los textos visibles están en `PAYMENT_METHODS`. */
export type PaymentMethod =
  | 'TRANSFER_30'
  | 'TRANSFER_60'
  | 'DIRECT_DEBIT'
  | 'PROMISSORY_NOTE'
  | 'CASH';

/** Trimestre del año en curso (010 FR-021a). */
export type Quarter = 1 | 2 | 3 | 4;

/** Teléfono o correo del proveedor con una etiqueta libre opcional («Pedidos», «Facturación»…). */
export interface SupplierContact {
  label: string | null;
  value: string;
}

/** Quién creó o cambió por última vez un proveedor (010 FR-012b). */
export interface AuditUser {
  id: string;
  login: string;
}

/** Fila del listado de proveedores (009 FR-004, 010 FR-021, FR-021a, FR-021b). */
export interface SupplierListItem {
  id: string;
  name: string;
  /** CIF normalizado: mayúsculas, sin espacios, puntos ni guiones. */
  cif: string;
  city: string;
  /** Plazo de entrega en días naturales, entero ≥ 0; `null` si no se conoce («—»). */
  leadTimeDays: number | null;
  /** Euros sin IVA del trimestre pedido en `quarter`; se muestra con `UserMoney`. */
  quarterPurchases: number;
  /** Euros sin IVA con 2 decimales, del 1 de enero del año en curso hasta hoy; se muestra con `UserMoney`. */
  yearPurchases: number;
  /** `false` = dado de baja → sello «Baja». */
  active: boolean;
}

/** Criterios del listado (GET /suppliers). Sin `q` equivale a sin búsqueda. */
export interface SupplierListQuery {
  /** Busca en el nombre y el CIF del proveedor. */
  q?: string;
  /** `true` incluye también los proveedores dados de baja. */
  includeInactive: boolean;
  /** Trimestre del año en curso para `quarterPurchases`. */
  quarter: Quarter;
  page: number;
}

/** Datos que se envían al dar de alta o editar un proveedor (data-model.md). */
export interface SupplierInput {
  name: string;
  cif: string;
  foreign: boolean;
  address: string;
  postalCode: string;
  city: string;
  contactPerson: string | null;
  phones: SupplierContact[];
  emails: SupplierContact[];
  paymentMethod: PaymentMethod;
  iban: string | null;
  web: string | null;
  leadTimeDays: number | null;
  /** Euros; `null` = sin pedido mínimo. */
  minOrder: number | null;
  notes: string | null;
}

/** Edición: `version` es la que devolvió la última lectura (concurrencia optimista, research R6). */
export interface SupplierUpdateInput extends SupplierInput {
  version: number;
}

/** Baja (`active: false`) o reactivación (`active: true`). */
export interface SupplierStatusInput {
  active: boolean;
  version: number;
}

/** Ficha completa de un proveedor (GET /suppliers/:id). */
export interface SupplierDetail extends SupplierInput {
  id: string;
  active: boolean;
  version: number;
  /** Euros sin IVA del año en curso. */
  yearPurchases: number;
  /** Euros sin IVA de 1T a 4T del año en curso; suman `yearPurchases`. */
  quarterPurchases: [number, number, number, number];
  createdBy: AuditUser;
  createdAt: string;
  updatedBy: AuditUser;
  updatedAt: string;
}
