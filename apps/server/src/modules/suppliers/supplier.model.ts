import { model, Schema, type HydratedDocument } from 'mongoose';
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  SUPPLIER_LIMITS,
  type AuditUser,
  type PaymentMethod,
  type SupplierContact,
} from '@app/shared';

export interface SupplierFields {
  name: string;
  /** Normalizado (mayúsculas, sin espacios, puntos ni guiones) y único entre activos y bajas (FR-005). */
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
  active: boolean;
  /** Concurrencia optimista: +1 en cada escritura (research R6). */
  version: number;
  createdBy: AuditUser;
  updatedBy: AuditUser;
  createdAt: Date;
  updatedAt: Date;
}

export type SupplierDocument = HydratedDocument<SupplierFields>;

// Las reglas de formato (CIF, IBAN, código postal…) las valida zod en la entrada (supplier.validation.ts);
// el esquema solo fija tipos, obligatorios y límites como red de seguridad.
const contactSchema = new Schema<SupplierContact>(
  {
    label: { type: String, default: null, maxlength: SUPPLIER_LIMITS.contactLabel },
    value: { type: String, required: true },
  },
  { _id: false },
);

const auditUserSchema = new Schema<AuditUser>(
  { id: { type: String, required: true }, login: { type: String, required: true } },
  { _id: false },
);

const supplierSchema = new Schema<SupplierFields>(
  {
    name: { type: String, required: true, trim: true, maxlength: SUPPLIER_LIMITS.name },
    cif: { type: String, required: true, unique: true },
    foreign: { type: Boolean, default: false },
    address: { type: String, required: true, maxlength: SUPPLIER_LIMITS.address },
    postalCode: { type: String, required: true },
    city: { type: String, required: true, maxlength: SUPPLIER_LIMITS.city },
    contactPerson: { type: String, default: null, maxlength: SUPPLIER_LIMITS.contactPerson },
    phones: { type: [contactSchema], default: [] },
    emails: { type: [contactSchema], default: [] },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS.map((method) => method.value),
      default: DEFAULT_PAYMENT_METHOD,
    },
    iban: { type: String, default: null },
    web: { type: String, default: null },
    leadTimeDays: { type: Number, default: null, min: 0, max: SUPPLIER_LIMITS.leadTimeDaysMax },
    minOrder: { type: Number, default: null, min: 0 },
    notes: { type: String, default: null, maxlength: SUPPLIER_LIMITS.notes },
    active: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 0 },
    createdBy: { type: auditUserSchema, required: true },
    updatedBy: { type: auditUserSchema, required: true },
  },
  { timestamps: true, versionKey: false },
);

// Orden y búsqueda por nombre sin distinguir mayúsculas ni acentos (FR-020, research R1).
supplierSchema.index({ name: 1 }, { collation: { locale: 'es', strength: 1 } });

export const SupplierModel = model<SupplierFields>('Supplier', supplierSchema);
