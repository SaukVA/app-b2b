import { listProducts } from './product.service';

describe('listProducts (provisional, FR-010)', () => {
  it('sin criterios devuelve una página vacía de 10 referencias', async () => {
    await expect(listProducts({ lowStock: false, page: 1 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('con todos los criterios devuelve igualmente vacío, con la página pedida', async () => {
    const page = await listProducts({
      q: 'aceite',
      category: 'alimentacion',
      subcategory: 'aceites',
      supplier: 'prov-12',
      lowStock: true,
      page: 3,
    });
    expect(page).toEqual({ items: [], total: 0, page: 3, pageSize: 10 });
  });

  it('no importa Mongoose: no lee ni escribe productos en la base de datos', () => {
    jest.isolateModules(() => {
      jest.doMock('mongoose', () => {
        throw new Error('el servicio de productos no debe importar Mongoose');
      });
      expect(() => jest.requireActual('./product.service')).not.toThrow();
    });
  });
});
