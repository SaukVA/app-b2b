import {
  PRODUCT_FILTER_ID_PATTERN,
  PRODUCT_SEARCH_MAX_LENGTH,
  PRODUCT_STATUSES,
  PRODUCTS_PAGE_SIZE,
  productStatus,
} from './products';

describe('productStatus (FR-011a)', () => {
  it.each([
    [0, 10, 'Sin stock'],
    [0, 0, 'Sin stock'],
    [3, 10, 'Stock bajo'],
    [10, 10, 'Disponible'],
    [140, 80, 'Disponible'],
  ] as const)('stock %i con mínimo %i → %s', (stock, minStock, expected) => {
    expect(productStatus(stock, minStock)).toBe(expected);
  });
});

describe('constantes del listado de productos', () => {
  it('la búsqueda admite 100 caracteres y la página tiene 10 referencias', () => {
    expect(PRODUCT_SEARCH_MAX_LENGTH).toBe(100);
    expect(PRODUCTS_PAGE_SIZE).toBe(10);
  });

  it('los estados van en el orden del diseño', () => {
    expect(PRODUCT_STATUSES).toEqual(['Disponible', 'Stock bajo', 'Sin stock']);
  });

  it.each(['alimentacion', 'prov-12', 'A_1'])('el identificador de filtro «%s» es válido', (id) => {
    expect(PRODUCT_FILTER_ID_PATTERN.test(id)).toBe(true);
  });

  it.each(['', 'a b', 'ñ', 'a'.repeat(65)])('el identificador de filtro «%s» no es válido', (id) => {
    expect(PRODUCT_FILTER_ID_PATTERN.test(id)).toBe(false);
  });
});
