import { SUPPLIER_SEARCH_MAX_LENGTH, type SupplierListQuery } from '@app/shared';

// La dirección de la pantalla es la fuente de verdad de los criterios (FR-007a, research R8). Un valor no
// válido se ignora y queda el de por defecto.

export const DEFAULT_SUPPLIER_CRITERIA: SupplierListQuery = { includeInactive: false, page: 1 };

function parseSearch(value: string | null): string | undefined {
  const search = value?.trim();
  if (!search || search.length > SUPPLIER_SEARCH_MAX_LENGTH) return undefined;
  return search;
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(Number(value), 1);
}

export function parseSupplierCriteria(params: URLSearchParams): SupplierListQuery {
  const q = parseSearch(params.get('q'));
  const criteria: SupplierListQuery = {
    includeInactive: params.get('includeInactive') === 'true',
    page: parsePage(params.get('page')),
  };
  return q ? { q, ...criteria } : criteria;
}

/** Dirección de unos criterios, sin los valores por defecto. */
export function serializeSupplierCriteria({
  q,
  includeInactive,
  page,
}: SupplierListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (includeInactive) params.set('includeInactive', 'true');
  if (page !== 1) params.set('page', String(page));
  return params;
}
