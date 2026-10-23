/** Fila del listado de proveedores (columnas de FR-004 y estado de FR-004a). */
export interface SupplierListItem {
  id: string;
  name: string;
  /** Plazo de entrega en días naturales, entero ≥ 0; `null` si no se conoce («—»). */
  leadTimeDays: number | null;
  /** Euros sin IVA con 2 decimales, del 1 de enero del año en curso hasta hoy; se muestra con `UserMoney`. */
  yearPurchases: number;
  /** `false` = dado de baja → sello «Baja». El CIF no viaja en el listado: solo se usa para buscar. */
  active: boolean;
}

/** Criterios del listado (GET /suppliers). Sin `q` equivale a sin búsqueda. */
export interface SupplierListQuery {
  /** Busca en el nombre y el CIF del proveedor. */
  q?: string;
  /** `true` incluye también los proveedores dados de baja. */
  includeInactive: boolean;
  page: number;
}
