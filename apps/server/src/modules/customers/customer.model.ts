import { model, Schema, type HydratedDocument } from 'mongoose';

// Provisional (rama de demo): solo los campos del listado, hasta cerrar con el cliente qué datos se migran
// del sistema anterior. El riesgo usado no se guarda: se calcula con `customerRiskUsed`.

export interface CustomerFields {
  name: string;
  city: string | null;
  /** Euros; `null` o 0 = sin límite. */
  maxRisk: number | null;
  /** Saldo pendiente en euros. */
  balance: number;
  lastOrderDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerDocument = HydratedDocument<CustomerFields>;

const customerSchema = new Schema<CustomerFields>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: null },
    maxRisk: { type: Number, min: 0, default: null },
    balance: { type: Number, default: 0 },
    lastOrderDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export const CustomerModel = model<CustomerFields>('Customer', customerSchema);
