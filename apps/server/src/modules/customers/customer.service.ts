import {
  CUSTOMERS_PAGE_SIZE,
  type CustomerListItem,
  type CustomerListQuery,
  type ListPage,
} from '@app/shared';

/**
 * Provisional hasta la migración de la cartera desde la base de datos antigua (FR-009): valida el contrato
 * del listado pero no lee ni escribe clientes, así que siempre devuelve la página pedida vacía.
 */
export async function listCustomers(
  criteria: CustomerListQuery,
): Promise<ListPage<CustomerListItem>> {
  return { items: [], total: 0, page: criteria.page, pageSize: CUSTOMERS_PAGE_SIZE };
}
