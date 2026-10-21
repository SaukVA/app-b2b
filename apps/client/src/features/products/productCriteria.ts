import { PRODUCT_SEARCH_MAX_LENGTH, type ProductListQuery } from '@app/shared';

// La dirección de la pantalla es la fuente de verdad de los criterios (FR-008a, research R6). Un valor no
// válido se ignora y queda el de por defecto. Mientras no haya catálogo, categoría, subcategoría y proveedor
// no se leen: los filtros no podrían mostrarlos y la petición filtraría sin que se viera.

export const DEFAULT_PRODUCT_CRITERIA: ProductListQuery = { lowStock: false, page: 1 };

function parseSearch(value: string | null): string | undefined {
  const search = value?.trim();
  if (!search || search.length > PRODUCT_SEARCH_MAX_LENGTH) return undefined;
  return search;
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(Number(value), 1);
}

export function parseProductCriteria(params: URLSearchParams): ProductListQuery {
  const q = parseSearch(params.get('q'));
  const criteria: ProductListQuery = {
    lowStock: params.get('lowStock') === 'true',
    page: parsePage(params.get('page')),
  };
  return q ? { q, ...criteria } : criteria;
}

/** Dirección de unos criterios, sin los valores por defecto. */
export function serializeProductCriteria({ q, lowStock, page }: ProductListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (lowStock) params.set('lowStock', 'true');
  if (page !== 1) params.set('page', String(page));
  return params;
}
