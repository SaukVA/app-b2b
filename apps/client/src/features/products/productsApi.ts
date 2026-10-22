import type { ApiSuccess, ListPage, ProductListItem, ProductListQuery } from '@app/shared';
import { httpClient } from '../../utils/httpClient';

// Llamadas a /products (contracts/products-api.openapi.yaml). Los componentes nunca llaman a la API: lo
// hacen los thunks de productsSlice (ADR 0001).

type ProductListParams = Partial<Record<keyof ProductListQuery, string | number>>;

/** Solo los criterios que no son los de por defecto: así la petición coincide con la dirección (FR-008a). */
function toParams({ lowStock, page, ...filters }: ProductListQuery): ProductListParams {
  const params: ProductListParams = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) params[key as keyof ProductListQuery] = value;
  }
  if (lowStock) params.lowStock = 'true';
  if (page !== 1) params.page = page;
  return params;
}

/** Página del listado de productos (GET /products). Provisional: siempre vacía (FR-010). */
export async function fetchProducts(query: ProductListQuery): Promise<ListPage<ProductListItem>> {
  const { data } = await httpClient.get<ApiSuccess<ListPage<ProductListItem>>>('/products', {
    params: toParams(query),
  });
  return data.data;
}
