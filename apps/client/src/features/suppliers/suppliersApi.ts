import {
  currentQuarter,
  type ApiSuccess,
  type ListPage,
  type SupplierDetail,
  type SupplierInput,
  type SupplierStatusInput,
  type SupplierUpdateInput,
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

/** Ficha de un proveedor (GET /suppliers/:id). */
export async function fetchSupplier(id: string): Promise<SupplierDetail> {
  const { data } = await httpClient.get<ApiSuccess<SupplierDetail>>(`/suppliers/${id}`);
  return data.data;
}

/** Alta de un proveedor (POST /suppliers); devuelve su ficha. */
export async function createSupplier(input: SupplierInput): Promise<SupplierDetail> {
  const { data } = await httpClient.post<ApiSuccess<SupplierDetail>>('/suppliers', input);
  return data.data;
}

/** Edición (PUT /suppliers/:id) con la `version` leída; devuelve la ficha con la versión siguiente. */
export async function updateSupplier(
  id: string,
  input: SupplierUpdateInput,
): Promise<SupplierDetail> {
  const { data } = await httpClient.put<ApiSuccess<SupplierDetail>>(`/suppliers/${id}`, input);
  return data.data;
}

/** Baja o reactivación (PATCH /suppliers/:id/status) con la `version` leída. */
export async function setSupplierStatus(
  id: string,
  input: SupplierStatusInput,
): Promise<SupplierDetail> {
  const { data } = await httpClient.patch<ApiSuccess<SupplierDetail>>(
    `/suppliers/${id}/status`,
    input,
  );
  return data.data;
}
