import { listCustomers } from './customer.service';

describe('listCustomers (provisional, FR-009)', () => {
  it('sin búsqueda devuelve una página vacía de 10 fichas', async () => {
    await expect(listCustomers({ page: 1 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('con búsqueda devuelve igualmente vacío, con la página pedida', async () => {
    const page = await listCustomers({ q: 'ferreteria', page: 3 });
    expect(page).toEqual({ items: [], total: 0, page: 3, pageSize: 10 });
  });

  it('no importa Mongoose: no lee ni escribe clientes en la base de datos', () => {
    jest.isolateModules(() => {
      jest.doMock('mongoose', () => {
        throw new Error('el servicio de clientes no debe importar Mongoose');
      });
      expect(() => jest.requireActual('./customer.service')).not.toThrow();
    });
  });
});
