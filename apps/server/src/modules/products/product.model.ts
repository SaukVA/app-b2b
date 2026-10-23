import { model, Schema, type HydratedDocument, type Types } from 'mongoose';

// Provisional (rama de demo): solo los campos del listado, hasta cerrar con el cliente qué datos se migran
// del sistema anterior. El estado no se guarda: se calcula con `productStatus`.

export interface ProductFields {
  code: string;
  name: string;
  /** Identificador del filtro de categoría (PRODUCT_FILTER_ID_PATTERN) y su nombre visible. */
  categoryId: string;
  category: string;
  subcategoryId: string | null;
  subcategory: string | null;
  /** Proveedor principal. */
  supplier: Types.ObjectId | null;
  stock: number;
  minStock: number;
  /** Euros con 2 decimales. */
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDocument = HydratedDocument<ProductFields>;

const productSchema = new Schema<ProductFields>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    categoryId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    subcategoryId: { type: String, default: null, index: true },
    subcategory: { type: String, default: null },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null, index: true },
    stock: { type: Number, required: true, min: 0 },
    minStock: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export const ProductModel = model<ProductFields>('Product', productSchema);
