import type { ProductStatus } from '../types/product';

/** Longitud máxima de la búsqueda, sin contar los espacios del principio y del final (FR-009). */
export const PRODUCT_SEARCH_MAX_LENGTH = 100;

/** Referencias por página del listado (diseño «Albarán»). */
export const PRODUCTS_PAGE_SIZE = 10;

/** Formato de los identificadores de categoría, subcategoría y proveedor de los filtros (FR-009). */
export const PRODUCT_FILTER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const PRODUCT_STATUSES: readonly ProductStatus[] = ['Disponible', 'Stock bajo', 'Sin stock'];

/** Sin stock si el stock es 0; Stock bajo si es mayor que 0 y menor que el mínimo; Disponible en el resto. */
export function productStatus(stock: number, minStock: number): ProductStatus {
  if (stock === 0) return 'Sin stock';
  if (stock < minStock) return 'Stock bajo';
  return 'Disponible';
}
