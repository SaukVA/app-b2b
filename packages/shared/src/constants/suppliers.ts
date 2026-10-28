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

/**
 * Formatos que comprueban igual el servidor (zod) y el formulario (FR-004). El CIF español y el IBAN tienen
 * sus propios validadores (utils/taxId, utils/iban).
 */
export const SUPPLIER_PATTERNS = {
  /** Identificador fiscal extranjero ya normalizado: 3–20 letras y números. */
  foreignTaxId: /^[A-Z0-9]{3,20}$/,
  spanishPostalCode: /^\d{5}$/,
  /** 3–10 letras, números, espacios o guiones. */
  foreignPostalCode: /^[A-Za-z0-9 -]{3,10}$/,
  /** 6–20 dígitos, espacios, «+», «-» o paréntesis. */
  phone: /^[\d\s+()-]{6,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Dirección web con o sin http(s)://: un dominio con punto y, opcionalmente, una ruta. */
  web: /^(https?:\/\/)?[^\s./]+(\.[^\s./]+)+(\/\S*)?$/i,
  leadTimeDays: /^\d+$/,
} as const;

/** Textos de error de los datos del proveedor (contracts/suppliers-ui.md), comunes a servidor y cliente. */
export const SUPPLIER_MESSAGES = {
  nameRequired: 'Escribe el nombre del proveedor.',
  cifRequired: 'Escribe el CIF.',
  cifInvalid:
    'No es un NIF o CIF español válido. Si el proveedor es extranjero, marca «Proveedor extranjero».',
  foreignCifInvalid: 'Escribe un identificador fiscal de 3 a 20 letras y números.',
  addressRequired: 'Escribe la dirección.',
  postalCodeRequired: 'Escribe el código postal.',
  postalCodeSpanish: 'El código postal español tiene 5 cifras.',
  postalCodeForeign: 'Escribe un código postal de 3 a 10 letras, números, espacios o guiones.',
  cityRequired: 'Escribe la población.',
  ibanInvalid: 'El IBAN no es válido. Revisa que esté completo y bien escrito.',
  webInvalid: 'Escribe una dirección web, por ejemplo www.proveedor.es.',
  leadTimeInvalid: 'Escribe un número de días entre 0 y 365.',
  minOrderInvalid: 'Escribe un importe mayor que 0, con 2 decimales como mucho.',
  phoneInvalid: 'Escribe un teléfono de 6 a 20 cifras.',
  emailInvalid: 'Escribe un correo válido, por ejemplo nombre@proveedor.es.',
} as const;

/** Importe con 2 decimales como mucho y mayor que 0 (pedido mínimo, FR-004). */
export function isValidMinOrder(value: number): boolean {
  return value > 0 && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;
}

/** Trimestre (1–4) de una fecha. Se calcula en cada uso, nunca al cargar el módulo (research R4). */
export function currentQuarter(date: Date): Quarter {
  return (Math.floor(date.getMonth() / 3) + 1) as Quarter;
}
