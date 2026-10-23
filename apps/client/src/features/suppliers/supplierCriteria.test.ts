import { parseSupplierCriteria, serializeSupplierCriteria } from './supplierCriteria';

const parse = (search: string) => parseSupplierCriteria(new URLSearchParams(search));
const DEFAULTS = { includeInactive: false, page: 1 };

describe('parseSupplierCriteria (FR-007a)', () => {
  it('sin parámetros devuelve los criterios por defecto', () => {
    expect(parse('')).toEqual(DEFAULTS);
  });

  it('lee la búsqueda recortada, el filtro de bajas y la página', () => {
    expect(parse('q=%20levante%20&includeInactive=true&page=2')).toEqual({
      q: 'levante',
      includeInactive: true,
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
  ])('ignora %s y deja el valor por defecto', (_case, search) => {
    expect(parse(search)).toEqual(DEFAULTS);
  });
});

describe('serializeSupplierCriteria', () => {
  it('omite los valores por defecto', () => {
    expect(serializeSupplierCriteria(DEFAULTS).toString()).toBe('');
  });

  it.each([
    { q: 'levante', includeInactive: false, page: 1 },
    { includeInactive: true, page: 1 },
    { includeInactive: false, page: 3 },
    { q: 'café', includeInactive: true, page: 2 },
  ])('es la inversa de parseSupplierCriteria para %o', (criteria) => {
    expect(parseSupplierCriteria(serializeSupplierCriteria(criteria))).toEqual(criteria);
  });
});
