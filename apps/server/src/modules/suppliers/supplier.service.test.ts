import { listSuppliers } from './supplier.service';

describe('listSuppliers (provisional, FR-009)', () => {
  it('sin búsqueda devuelve una página vacía de 10 proveedores', async () => {
    await expect(listSuppliers({ includeInactive: false, page: 1 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('con búsqueda y bajas devuelve igualmente vacío, con la página pedida', async () => {
    const page = await listSuppliers({ q: 'levante', includeInactive: true, page: 3 });
    expect(page).toEqual({ items: [], total: 0, page: 3, pageSize: 10 });
  });

  it('no importa Mongoose: no lee ni escribe proveedores en la base de datos', () => {
    jest.isolateModules(() => {
      jest.doMock('mongoose', () => {
        throw new Error('el servicio de proveedores no debe importar Mongoose');
      });
      expect(() => jest.requireActual('./supplier.service')).not.toThrow();
    });
  });
});
