import { parseProductCriteria, serializeProductCriteria } from './productCriteria';

const parse = (search: string) => parseProductCriteria(new URLSearchParams(search));
const DEFAULTS = { lowStock: false, page: 1 };

describe('parseProductCriteria (FR-008a)', () => {
  it('sin parámetros devuelve los criterios por defecto', () => {
    expect(parse('')).toEqual(DEFAULTS);
  });

  it('lee la búsqueda recortada, «solo stock bajo» y la página', () => {
    expect(parse('q=%20aceite%20&lowStock=true&page=2')).toEqual({
      q: 'aceite',
      lowStock: true,
      page: 2,
    });
  });

  it('mientras no haya catálogo ignora categoría, subcategoría y proveedor aunque sean válidos', () => {
    expect(parse('category=alimentacion&subcategory=aceites&supplier=prov-12')).toEqual(DEFAULTS);
  });

  it.each([
    ['una búsqueda de 101 caracteres', `q=${'a'.repeat(101)}`],
    ['una búsqueda solo de espacios', 'q=%20%20'],
    ['lowStock=yes', 'lowStock=yes'],
    ['page=0', 'page=0'],
    ['page=-1', 'page=-1'],
    ['page=abc', 'page=abc'],
    ['page=1.5', 'page=1.5'],
  ])('ignora %s y deja el valor por defecto', (_case, search) => {
    expect(parse(search)).toEqual(DEFAULTS);
  });
});

describe('serializeProductCriteria', () => {
  it('omite los valores por defecto', () => {
    expect(serializeProductCriteria(DEFAULTS).toString()).toBe('');
  });

  it.each([
    { q: 'aceite', lowStock: false, page: 1 },
    { lowStock: true, page: 1 },
    { q: 'café', lowStock: true, page: 3 },
  ])('es la inversa de parseProductCriteria para %o', (criteria) => {
    expect(parseProductCriteria(serializeProductCriteria(criteria))).toEqual(criteria);
  });
});
