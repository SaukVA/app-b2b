import { CUSTOMER_SEARCH_MAX_LENGTH, type CustomerListQuery } from '@app/shared';

// La dirección de la pantalla es la fuente de verdad de los criterios (FR-007a, research R8). Un valor no
// válido se ignora y queda el de por defecto, sin mostrar error.

function parseSearch(value: string | null): string | undefined {
  const search = value?.trim();
  if (!search || search.length > CUSTOMER_SEARCH_MAX_LENGTH) return undefined;
  return search;
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(Number(value), 1);
}

export function parseCustomerCriteria(params: URLSearchParams): CustomerListQuery {
  const q = parseSearch(params.get('q'));
  const page = parsePage(params.get('page'));
  return q ? { q, page } : { page };
}

/** Dirección de unos criterios, sin los valores por defecto. */
export function serializeCustomerCriteria({ q, page }: CustomerListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page !== 1) params.set('page', String(page));
  return params;
}
