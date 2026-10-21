import {
  PRODUCTS_PAGE_SIZE,
  type ListPage,
  type ProductListItem,
  type ProductListQuery,
} from '@app/shared';

/**
 * Provisional hasta la migración del catálogo desde la base de datos antigua (FR-010): valida el contrato
 * del listado pero no lee ni escribe productos, así que siempre devuelve la página pedida vacía.
 */
export async function listProducts(criteria: ProductListQuery): Promise<ListPage<ProductListItem>> {
  return { items: [], total: 0, page: criteria.page, pageSize: PRODUCTS_PAGE_SIZE };
}
