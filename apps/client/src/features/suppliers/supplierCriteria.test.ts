import type { SupplierListQuery } from '@app/shared';
import { parseSupplierCriteria, serializeSupplierCriteria } from './supplierCriteria';

// Fecha fija en el 2T: el trimestre por defecto es el en curso (FR-021a).
beforeAll(() => jest.useFakeTimers({ now: new Date('2026-05-10T10:00:00Z') }));
afterAll(() => jest.useRealTimers());

const parse = (search: string) => parseSupplierCriteria(new URLSearchParams(search));
const DEFAULTS: SupplierListQuery = { includeInactive: false, quarter: 2, page: 1 };

describe('parseSupplierCriteria (FR-007a, FR-021a)', () => {
  it('sin parámetros devuelve los criterios por defecto, con el trimestre en curso', () => {
    expect(parse('')).toEqual(DEFAULTS);
  });

  it('lee la búsqueda recortada, el filtro de bajas, el trimestre y la página', () => {
    expect(parse('q=%20levante%20&includeInactive=true&quarter=4&page=2')).toEqual({
      q: 'levante',
      includeInactive: true,
      quarter: 4,
      page: 2,
    });
  });

  it('ignora parámetros que no son de Proveedores', () => {
    expect(parse('lowStock=true&category=alimentacion')).toEqual(DEFAULTS);
  });

  it.each([
    ['una búsqueda de 101 caracteres', `q=${'a'.repeat(101)}`],
    ['una búsqueda solo de espacios', 'q=%20%20'],
    ['page=0', 'page=0'],
    ['page=-1', 'page=-1'],
    ['page=abc', 'page=abc'],
    ['includeInactive=si', 'includeInactive=si'],
    ['includeInactive=1', 'includeInactive=1'],
    ['quarter=0', 'quarter=0'],
    ['quarter=5', 'quarter=5'],
    ['quarter=2T', 'quarter=2T'],
  ])('ignora %s y deja el valor por defecto', (_case, search) => {
    expect(parse(search)).toEqual(DEFAULTS);
  });
});

describe('serializeSupplierCriteria', () => {
  it('omite los valores por defecto, incluido el trimestre en curso', () => {
    expect(serializeSupplierCriteria(DEFAULTS).toString()).toBe('');
  });

  it('incluye el trimestre si no es el en curso', () => {
    expect(serializeSupplierCriteria({ ...DEFAULTS, quarter: 1 }).toString()).toBe('quarter=1');
  });

  it.each<SupplierListQuery>([
    { q: 'levante', includeInactive: false, quarter: 2, page: 1 },
    { includeInactive: true, quarter: 2, page: 1 },
    { includeInactive: false, quarter: 3, page: 3 },
    { q: 'café', includeInactive: true, quarter: 1, page: 2 },
  ])('es la inversa de parseSupplierCriteria para %o', (criteria) => {
    expect(parseSupplierCriteria(serializeSupplierCriteria(criteria))).toEqual(criteria);
  });
});
