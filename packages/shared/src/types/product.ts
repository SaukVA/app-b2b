/** Estado de un producto según su stock y su mínimo (FR-011a, regla en `productStatus`). */
export type ProductStatus = 'Disponible' | 'Stock bajo' | 'Sin stock';

/** Fila del listado de productos (columnas de FR-004). */
export interface ProductListItem {
  id: string;
  code: string;
  name: string;
  /** Proveedor principal, que se muestra bajo el nombre. */
  supplierName: string | null;
  category: string;
  subcategory: string | null;
  /** Cantidad entera ≥ 0, nunca un importe. */
  stock: number;
  /** Cantidad entera ≥ 0, nunca un importe. */
  minStock: number;
  /** Euros con 2 decimales; se muestra con `UserMoney`. */
  price: number;
  status: ProductStatus;
}

/** Criterios del listado (GET /products). Los ausentes equivalen a «Todas»/«Todos» o sin búsqueda. */
export interface ProductListQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  supplier?: string;
  /** Solo productos en estado Stock bajo o Sin stock. */
  lowStock: boolean;
  page: number;
}
