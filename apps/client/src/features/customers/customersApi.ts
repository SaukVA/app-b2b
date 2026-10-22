import type { ApiSuccess, CustomerListItem, CustomerListQuery, ListPage } from '@app/shared';
import { httpClient } from '../../utils/httpClient';

// Llamadas a /customers (contracts/customers-api.openapi.yaml). Los componentes nunca llaman a la API: lo
// hacen los thunks de customersSlice (ADR 0001).

type CustomerListParams = Partial<Record<keyof CustomerListQuery, string | number>>;

/** Solo los criterios que no son los de por defecto: así la petición coincide con la dirección (FR-007a). */
function toParams({ q, page }: CustomerListQuery): CustomerListParams {
  const params: CustomerListParams = {};
  if (q) params.q = q;
  if (page !== 1) params.page = page;
  return params;
}

/** Página del listado de clientes (GET /customers). Provisional: siempre vacía (FR-009). */
export async function fetchCustomers(
  query: CustomerListQuery,
): Promise<ListPage<CustomerListItem>> {
  const { data } = await httpClient.get<ApiSuccess<ListPage<CustomerListItem>>>('/customers', {
    params: toParams(query),
  });
  return data.data;
}
