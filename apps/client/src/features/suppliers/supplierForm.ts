import {
  DEFAULT_PAYMENT_METHOD,
  formatIban,
  isValidIban,
  isValidMinOrder,
  isValidSpanishTaxId,
  normalizeIban,
  normalizeTaxId,
  SUPPLIER_LIMITS,
  SUPPLIER_MESSAGES as MSG,
  SUPPLIER_PATTERNS,
  type PaymentMethod,
  type SupplierContact,
  type SupplierDetail,
  type SupplierInput,
} from '@app/shared';

// Valores del formulario de alta y edición ↔ SupplierInput (data-model.md › Valores del formulario). Las
// reglas y los textos son los mismos que valida el servidor (@app/shared).

/** Fila de teléfono o correo tal como se escribe. */
export interface ContactRow {
  label: string;
  value: string;
}

export interface SupplierFormValues {
  name: string;
  cif: string;
  foreign: boolean;
  address: string;
  postalCode: string;
  city: string;
  contactPerson: string;
  phones: ContactRow[];
  emails: ContactRow[];
  paymentMethod: PaymentMethod;
  iban: string;
  web: string;
  leadTimeDays: string;
  /** Lo devuelve UserMoneyField: euros o `null` si está vacío. */
  minOrder: number | null;
  notes: string;
}

/** Errores por campo; los contactos usan la ruta del servidor («phones.1.value»). */
export type SupplierFormErrors = Record<string, string>;

export const EMPTY_SUPPLIER_FORM: SupplierFormValues = {
  name: '',
  cif: '',
  foreign: false,
  address: '',
  postalCode: '',
  city: '',
  contactPerson: '',
  phones: [],
  emails: [],
  paymentMethod: DEFAULT_PAYMENT_METHOD,
  iban: '',
  web: '',
  leadTimeDays: '',
  minOrder: null,
  notes: '',
};

const textOrNull = (value: string): string | null => value.trim() || null;

const toContacts = (rows: ContactRow[]): SupplierContact[] =>
  rows
    .filter((row) => row.value.trim() !== '')
    .map((row) => ({ label: textOrNull(row.label), value: row.value.trim() }));

/** Recorta, normaliza CIF e IBAN, convierte números y descarta las filas de contacto vacías. */
export function toSupplierInput(values: SupplierFormValues): SupplierInput {
  const leadTimeDays = values.leadTimeDays.trim();
  return {
    name: values.name.trim(),
    cif: normalizeTaxId(values.cif.trim()),
    foreign: values.foreign,
    address: values.address.trim(),
    postalCode: values.postalCode.trim(),
    city: values.city.trim(),
    contactPerson: textOrNull(values.contactPerson),
    phones: toContacts(values.phones),
    emails: toContacts(values.emails),
    paymentMethod: values.paymentMethod,
    iban: values.iban.trim() ? normalizeIban(values.iban) : null,
    web: textOrNull(values.web),
    leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
    minOrder: values.minOrder,
    notes: textOrNull(values.notes),
  };
}

const toRows = (contacts: SupplierContact[]): ContactRow[] =>
  contacts.map(({ label, value }) => ({ label: label ?? '', value }));

/** Ficha → valores del formulario de edición. */
export function fromSupplierDetail(detail: SupplierDetail): SupplierFormValues {
  return {
    name: detail.name,
    cif: detail.cif,
    foreign: detail.foreign,
    address: detail.address,
    postalCode: detail.postalCode,
    city: detail.city,
    contactPerson: detail.contactPerson ?? '',
    phones: toRows(detail.phones),
    emails: toRows(detail.emails),
    paymentMethod: detail.paymentMethod,
    iban: detail.iban ? formatIban(detail.iban) : '',
    web: detail.web ?? '',
    leadTimeDays: detail.leadTimeDays === null ? '' : String(detail.leadTimeDays),
    minOrder: detail.minOrder,
    notes: detail.notes ?? '',
  };
}

function cifError({ cif, foreign }: SupplierFormValues): string | undefined {
  const normalized = normalizeTaxId(cif.trim());
  if (!normalized) return MSG.cifRequired;
  if (foreign)
    return SUPPLIER_PATTERNS.foreignTaxId.test(normalized) ? undefined : MSG.foreignCifInvalid;
  return isValidSpanishTaxId(normalized) ? undefined : MSG.cifInvalid;
}

function postalCodeError({ postalCode, foreign }: SupplierFormValues): string | undefined {
  const value = postalCode.trim();
  if (!value) return MSG.postalCodeRequired;
  const pattern = foreign
    ? SUPPLIER_PATTERNS.foreignPostalCode
    : SUPPLIER_PATTERNS.spanishPostalCode;
  if (pattern.test(value)) return undefined;
  return foreign ? MSG.postalCodeForeign : MSG.postalCodeSpanish;
}

function leadTimeError(text: string): string | undefined {
  const value = text.trim();
  if (!value) return undefined;
  const valid =
    SUPPLIER_PATTERNS.leadTimeDays.test(value) && Number(value) <= SUPPLIER_LIMITS.leadTimeDaysMax;
  return valid ? undefined : MSG.leadTimeInvalid;
}

/** Error si el texto no está vacío y no cumple la condición. */
const unless = (text: string, ok: (value: string) => boolean, message: string) =>
  text.trim() && !ok(text.trim()) ? message : undefined;

function contactErrors(values: SupplierFormValues): SupplierFormErrors {
  const errors: SupplierFormErrors = {};
  values.phones.forEach((row, index) => {
    const message = unless(row.value, (v) => SUPPLIER_PATTERNS.phone.test(v), MSG.phoneInvalid);
    if (message) errors[`phones.${index}.value`] = message;
  });
  values.emails.forEach((row, index) => {
    const message = unless(row.value, (v) => SUPPLIER_PATTERNS.email.test(v), MSG.emailInvalid);
    if (message) errors[`emails.${index}.value`] = message;
  });
  return errors;
}

/** Errores por campo con los textos de contracts/suppliers-ui.md; vacío si se puede guardar. */
export function validateSupplierForm(values: SupplierFormValues): SupplierFormErrors {
  const errors: Record<string, string | undefined> = {
    name: values.name.trim() ? undefined : MSG.nameRequired,
    cif: cifError(values),
    address: values.address.trim() ? undefined : MSG.addressRequired,
    postalCode: postalCodeError(values),
    city: values.city.trim() ? undefined : MSG.cityRequired,
    iban: unless(values.iban, (v) => isValidIban(normalizeIban(v)), MSG.ibanInvalid),
    web: unless(values.web, (v) => SUPPLIER_PATTERNS.web.test(v), MSG.webInvalid),
    leadTimeDays: leadTimeError(values.leadTimeDays),
    minOrder:
      values.minOrder !== null && !isValidMinOrder(values.minOrder)
        ? MSG.minOrderInvalid
        : undefined,
    ...contactErrors(values),
  };
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

const FORM_FIELDS = new Set(Object.keys(EMPTY_SUPPLIER_FORM));

/** Índice de la fila del formulario que corresponde a la n-ésima fila con valor (las vacías no se envían). */
function formRowIndex(rows: ContactRow[], sentIndex: number): number {
  const filled = rows.flatMap((row, index) => (row.value.trim() ? [index] : []));
  return filled[sentIndex] ?? sentIndex;
}

/** «phones.0.value» del servidor → la clave del formulario, o `null` si no es un campo. */
function toFormKey(path: string, values: SupplierFormValues): string | null {
  const contact = /^(phones|emails)\.(\d+)\.(value|label)$/.exec(path);
  if (contact) {
    const [, list, index, part] = contact;
    const rows = values[list as 'phones' | 'emails'];
    return `${list}.${formRowIndex(rows, Number(index))}.${part}`;
  }
  return FORM_FIELDS.has(path) ? path : null;
}

/**
 * Traduce el VALIDATION_ERROR del servidor («ruta: motivo; …») a errores por campo; lo que no corresponde a
 * un campo del formulario va al resumen (FR-006, research R4).
 */
export function parseValidationMessage(
  message: string,
  values: SupplierFormValues,
): { fields: SupplierFormErrors; other: string[] } {
  const fields: SupplierFormErrors = {};
  const other: string[] = [];
  for (const part of message.split('; ')) {
    const separator = part.indexOf(': ');
    const path = separator === -1 ? '' : part.slice(0, separator);
    const text = separator === -1 ? part : part.slice(separator + 2);
    const key = toFormKey(path, values);
    if (key) fields[key] = text;
    else other.push(text);
  }
  return { fields, other };
}
