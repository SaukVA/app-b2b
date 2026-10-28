import {
  currentQuarter,
  SUPPLIER_SEARCH_MAX_LENGTH,
  type Quarter,
  type SupplierListQuery,
} from '@app/shared';

// La dirección de la pantalla es la fuente de verdad de los criterios (FR-007a, research R8). Un valor no
// válido se ignora y queda el de por defecto. El trimestre por defecto es el en curso, calculado en cada
// llamada (010 FR-021a).

/** Criterios por defecto: sin búsqueda, sin bajas, trimestre en curso y página 1. */
export function defaultSupplierCriteria(): SupplierListQuery {
  return { includeInactive: false, quarter: currentQuarter(new Date()), page: 1 };
}

function parseSearch(value: string | null): string | undefined {
  const search = value?.trim();
  if (!search || search.length > SUPPLIER_SEARCH_MAX_LENGTH) return undefined;
  return search;
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  return Math.max(Number(value), 1);
}

function parseQuarter(value: string | null): Quarter {
  return value && /^[1-4]$/.test(value) ? (Number(value) as Quarter) : currentQuarter(new Date());
}

export function parseSupplierCriteria(params: URLSearchParams): SupplierListQuery {
  const q = parseSearch(params.get('q'));
  const criteria: SupplierListQuery = {
    includeInactive: params.get('includeInactive') === 'true',
    quarter: parseQuarter(params.get('quarter')),
    page: parsePage(params.get('page')),
  };
  return q ? { q, ...criteria } : criteria;
}

/** Dirección de unos criterios, sin los valores por defecto. */
export function serializeSupplierCriteria({
  q,
  includeInactive,
  quarter,
  page,
}: SupplierListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (includeInactive) params.set('includeInactive', 'true');
  if (quarter !== currentQuarter(new Date())) params.set('quarter', String(quarter));
  if (page !== 1) params.set('page', String(page));
  return params;
}
