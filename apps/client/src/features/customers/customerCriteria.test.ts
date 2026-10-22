import { parseCustomerCriteria, serializeCustomerCriteria } from './customerCriteria';

const parse = (search: string) => parseCustomerCriteria(new URLSearchParams(search));
const DEFAULTS = { page: 1 };

describe('parseCustomerCriteria (FR-007a)', () => {
  it('sin parámetros devuelve los criterios por defecto', () => {
    expect(parse('')).toEqual(DEFAULTS);
  });

  it('lee la búsqueda recortada y la página', () => {
    expect(parse('q=%20ferreteria%20&page=2')).toEqual({ q: 'ferreteria', page: 2 });
  });

  it('ignora parámetros que no son de Clientes', () => {
    expect(parse('lowStock=true&category=alimentacion')).toEqual(DEFAULTS);
  });

  it.each([
    ['una búsqueda de 101 caracteres', `q=${'a'.repeat(101)}`],
    ['una búsqueda solo de espacios', 'q=%20%20'],
    ['page=0', 'page=0'],
    ['page=-1', 'page=-1'],
    ['page=abc', 'page=abc'],
    ['page=1.5', 'page=1.5'],
  ])('ignora %s y deja el valor por defecto', (_case, search) => {
    expect(parse(search)).toEqual(DEFAULTS);
  });
});

describe('serializeCustomerCriteria', () => {
  it('omite los valores por defecto', () => {
    expect(serializeCustomerCriteria(DEFAULTS).toString()).toBe('');
  });

  it.each([{ q: 'ferreteria', page: 1 }, { page: 3 }, { q: 'café', page: 2 }])(
    'es la inversa de parseCustomerCriteria para %o',
    (criteria) => {
      expect(parseCustomerCriteria(serializeCustomerCriteria(criteria))).toEqual(criteria);
    },
  );
});
