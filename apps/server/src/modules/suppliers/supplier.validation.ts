import { z } from 'zod';
import {
  currentQuarter,
  DEFAULT_PAYMENT_METHOD,
  isValidIban,
  isValidMinOrder,
  isValidSpanishTaxId,
  normalizeIban,
  normalizeTaxId,
  PAYMENT_METHODS,
  SUPPLIER_LIMITS,
  SUPPLIER_MESSAGES as MSG,
  SUPPLIER_PATTERNS,
  SUPPLIER_SEARCH_MAX_LENGTH,
  type PaymentMethod,
  type Quarter,
} from '@app/shared';

// contracts/suppliers-api.openapi.yaml › GET /suppliers. Sin .strict(): los parámetros desconocidos se
// descartan. includeInactive sigue el patrón de lowStock en Productos: solo 'true' o 'false'.

export const supplierListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(SUPPLIER_SEARCH_MAX_LENGTH)
    .transform((value) => value || undefined)
    .optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // El trimestre por defecto se calcula en cada petición, nunca al cargar el módulo (research R4).
  quarter: z.coerce
    .number()
    .int()
    .min(1)
    .max(4)
    .default(() => currentQuarter(new Date()))
    .transform((value) => value as Quarter),
  page: z.coerce.number().int().min(1).default(1),
});

export type SupplierListQueryInput = z.infer<typeof supplierListQuerySchema>;

export const supplierIdParams = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/) });

export type SupplierIdParams = z.infer<typeof supplierIdParams>;

// contracts/suppliers-api.openapi.yaml › SupplierInput y data-model.md. Los mensajes son los del formulario:
// el cliente los muestra junto a cada campo (research R4).

const required = (max: number, message: string) => z.string().trim().min(1, message).max(max);

/** Texto opcional: recortado y, si queda vacío, null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const withProtocol = (web: string) => (/^https?:\/\//i.test(web) ? web : `https://${web}`);

const contact = (pattern: RegExp, message: string) =>
  z.object({
    label: optionalText(SUPPLIER_LIMITS.contactLabel),
    value: z.string().trim().regex(pattern, message),
  });

/** Las filas sin valor se descartan antes de validar y de contar el máximo (research R4). */
const contacts = (pattern: RegExp, message: string) =>
  z.preprocess(
    (rows) =>
      Array.isArray(rows)
        ? rows.filter((row) => String((row as { value?: unknown })?.value ?? '').trim() !== '')
        : rows,
    z.array(contact(pattern, message)).max(SUPPLIER_LIMITS.maxContacts).default([]),
  );

const paymentMethods = PAYMENT_METHODS.map((method) => method.value) as [
  PaymentMethod,
  ...PaymentMethod[],
];

const supplierFields = z.object({
  name: required(SUPPLIER_LIMITS.name, MSG.nameRequired),
  cif: z.string().transform(normalizeTaxId).pipe(z.string().min(1, MSG.cifRequired)),
  foreign: z.boolean().default(false),
  address: required(SUPPLIER_LIMITS.address, MSG.addressRequired),
  postalCode: z.string().trim().min(1, MSG.postalCodeRequired),
  city: required(SUPPLIER_LIMITS.city, MSG.cityRequired),
  contactPerson: optionalText(SUPPLIER_LIMITS.contactPerson),
  phones: contacts(SUPPLIER_PATTERNS.phone, MSG.phoneInvalid),
  emails: contacts(SUPPLIER_PATTERNS.email, MSG.emailInvalid),
  paymentMethod: z.enum(paymentMethods).default(DEFAULT_PAYMENT_METHOD),
  iban: optionalText(64)
    .transform((value) => value && normalizeIban(value))
    .refine((value) => value === null || isValidIban(value), MSG.ibanInvalid),
  web: optionalText(500)
    .refine((value) => value === null || SUPPLIER_PATTERNS.web.test(value), MSG.webInvalid)
    .transform((value) => value && withProtocol(value)),
  leadTimeDays: z
    .number({ invalid_type_error: MSG.leadTimeInvalid })
    .int(MSG.leadTimeInvalid)
    .min(0, MSG.leadTimeInvalid)
    .max(SUPPLIER_LIMITS.leadTimeDaysMax, MSG.leadTimeInvalid)
    .nullish()
    .transform((value) => value ?? null),
  minOrder: z
    .number({ invalid_type_error: MSG.minOrderInvalid })
    .refine(isValidMinOrder, MSG.minOrderInvalid)
    .nullish()
    .transform((value) => value ?? null),
  notes: optionalText(SUPPLIER_LIMITS.notes),
});

type SupplierFieldsInput = z.infer<typeof supplierFields>;

type AddIssue = (path: 'cif' | 'postalCode', message: string) => void;

function taxIdIssue({ foreign, cif }: SupplierFieldsInput): string | null {
  if (foreign) return SUPPLIER_PATTERNS.foreignTaxId.test(cif) ? null : MSG.foreignCifInvalid;
  return isValidSpanishTaxId(cif) ? null : MSG.cifInvalid;
}

function postalCodeIssue({ foreign, postalCode }: SupplierFieldsInput): string | null {
  if (foreign) {
    return SUPPLIER_PATTERNS.foreignPostalCode.test(postalCode) ? null : MSG.postalCodeForeign;
  }
  return SUPPLIER_PATTERNS.spanishPostalCode.test(postalCode) ? null : MSG.postalCodeSpanish;
}

/** CIF y código postal dependen de «Proveedor extranjero» (FR-004). Vacíos ya tienen su «Escribe…». */
function checkTaxIdAndPostalCode(input: SupplierFieldsInput, ctx: z.RefinementCtx): void {
  const issue: AddIssue = (path, message) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  const cifMessage = input.cif ? taxIdIssue(input) : null;
  const postalMessage = input.postalCode ? postalCodeIssue(input) : null;
  if (cifMessage) issue('cif', cifMessage);
  if (postalMessage) issue('postalCode', postalMessage);
}

export const supplierInputSchema = supplierFields.superRefine(checkTaxIdAndPostalCode);

export type SupplierInputBody = z.infer<typeof supplierInputSchema>;

/** Edición: los mismos datos y la `version` de la última lectura (research R6). */
export const supplierUpdateSchema = supplierFields
  .extend({ version: z.number().int().min(0) })
  .superRefine(checkTaxIdAndPostalCode);

export type SupplierUpdateBody = z.infer<typeof supplierUpdateSchema>;
