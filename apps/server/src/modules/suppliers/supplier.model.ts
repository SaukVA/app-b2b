import { model, Schema, type HydratedDocument } from 'mongoose';

// Provisional (rama de demo): solo los campos del listado y el CIF de la búsqueda, hasta cerrar con el
// cliente qué datos se migran del sistema anterior.

export interface SupplierFields {
  name: string;
  cif: string;
  /** Días naturales; `null` si no se conoce. */
  leadTimeDays: number | null;
  /** Euros sin IVA del año en curso. */
  yearPurchases: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SupplierDocument = HydratedDocument<SupplierFields>;

const supplierSchema = new Schema<SupplierFields>(
  {
    name: { type: String, required: true, trim: true },
    cif: { type: String, required: true, unique: true, uppercase: true, trim: true },
    leadTimeDays: { type: Number, min: 0, default: null },
    yearPurchases: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const SupplierModel = model<SupplierFields>('Supplier', supplierSchema);
