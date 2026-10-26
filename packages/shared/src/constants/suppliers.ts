import type { PaymentMethod, Quarter } from '../types/supplier';

/** Longitud máxima de la búsqueda, sin contar los espacios del principio y del final (FR-008). */
export const SUPPLIER_SEARCH_MAX_LENGTH = 100;

/** Proveedores por página del listado: 10, como Productos y Clientes. */
export const SUPPLIERS_PAGE_SIZE = 10;

/** Límites de los datos de un proveedor (010 FR-004, data-model.md). */
export const SUPPLIER_LIMITS = {
  name: 120,
  address: 200,
  city: 100,
  contactPerson: 120,
  contactLabel: 40,
  notes: 2000,
  maxContacts: 5,
  leadTimeDaysMax: 365,
  foreignTaxId: { min: 3, max: 20 },
  foreignPostalCode: { min: 3, max: 10 },
  phone: { min: 6, max: 20 },
} as const;

/** Formas de pago con su texto visible, en el orden del desplegable. */
export const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'TRANSFER_30', label: 'Transferencia 30 días' },
  { value: 'TRANSFER_60', label: 'Transferencia 60 días' },
  { value: 'DIRECT_DEBIT', label: 'Domiciliación bancaria' },
  { value: 'PROMISSORY_NOTE', label: 'Pagaré' },
  { value: 'CASH', label: 'Contado' },
];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'TRANSFER_30';

/** Códigos de error de la gestión de proveedores (contracts/suppliers-api.openapi.yaml). */
export const SUPPLIER_ERROR_CODES = {
  notFound: 'SUPPLIER_NOT_FOUND',
  cifTaken: 'SUPPLIER_CIF_TAKEN',
  versionConflict: 'SUPPLIER_VERSION_CONFLICT',
} as const;

/** Trimestre (1–4) de una fecha. Se calcula en cada uso, nunca al cargar el módulo (research R4). */
export function currentQuarter(date: Date): Quarter {
  return (Math.floor(date.getMonth() / 3) + 1) as Quarter;
}
