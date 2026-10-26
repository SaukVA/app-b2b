import {
  currentQuarter,
  type ApiSuccess,
  type ListPage,
  type SupplierListItem,
  type SupplierListQuery,
} from '@app/shared';
import { httpClient } from '../../utils/httpClient';

// Llamadas a /suppliers (contracts/suppliers-api.openapi.yaml). Los componentes nunca llaman a la API: lo
// hacen los thunks de suppliersSlice (ADR 0001).

type SupplierListParams = Partial<Record<keyof SupplierListQuery, string | number>>;

/** Solo los criterios que no son los de por defecto: así la petición coincide con la dirección (FR-007a). */
function toParams({ q, includeInactive, quarter, page }: SupplierListQuery): SupplierListParams {
  const params: SupplierListParams = {};
  if (q) params.q = q;
  if (includeInactive) params.includeInactive = 'true';
  if (quarter !== currentQuarter(new Date())) params.quarter = quarter;
  if (page !== 1) params.page = page;
  return params;
}

/** Página del listado de proveedores (GET /suppliers). */
export async function fetchSuppliers(
  query: SupplierListQuery,
): Promise<ListPage<SupplierListItem>> {
  const { data } = await httpClient.get<ApiSuccess<ListPage<SupplierListItem>>>('/suppliers', {
    params: toParams(query),
  });
  return data.data;
}
