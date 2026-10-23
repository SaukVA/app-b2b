import {
  SUPPLIERS_PAGE_SIZE,
  type ListPage,
  type SupplierListItem,
  type SupplierListQuery,
} from '@app/shared';

/**
 * Provisional hasta la migración de proveedores desde la base de datos antigua (FR-009): valida el contrato
 * del listado pero no lee ni escribe proveedores, así que siempre devuelve la página pedida vacía.
 */
export async function listSuppliers(
  criteria: SupplierListQuery,
): Promise<ListPage<SupplierListItem>> {
  return { items: [], total: 0, page: criteria.page, pageSize: SUPPLIERS_PAGE_SIZE };
}
