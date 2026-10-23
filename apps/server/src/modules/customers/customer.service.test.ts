import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { CustomerModel } from './customer.model';
import { listCustomers } from './customer.service';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function seedCustomers(): Promise<void> {
  await CustomerModel.create([
    {
      name: 'Bar Casa Pepe',
      city: 'Gandia',
      maxRisk: 2000,
      balance: 1700,
      lastOrderDate: new Date('2026-10-20'),
    },
    { name: 'Ultramarinos Álvarez', city: 'Alzira', maxRisk: null, balance: 350 },
    { name: 'restaurante El Puerto', city: null, maxRisk: 1000, balance: -50 },
  ]);
}

describe('listCustomers', () => {
  it('sin clientes devuelve una página vacía de 10 fichas', async () => {
    await expect(listCustomers({ page: 1 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
  });

  it('ordena por nombre en español, sin que influyan acentos ni mayúsculas', async () => {
    await seedCustomers();
    const page = await listCustomers({ page: 1 });
    expect(page.items.map((item) => item.name)).toEqual([
      'Bar Casa Pepe',
      'restaurante El Puerto',
      'Ultramarinos Álvarez',
    ]);
  });

  it('calcula el riesgo usado y da la fecha del último pedido como YYYY-MM-DD', async () => {
    await seedCustomers();
    const [pepe, puerto, alvarez] = (await listCustomers({ page: 1 })).items;
    expect(pepe).toMatchObject({ riskUsed: 85, lastOrderDate: '2026-10-20', city: 'Gandia' });
    expect(puerto).toMatchObject({ riskUsed: 0, lastOrderDate: null, city: null });
    expect(alvarez).toMatchObject({ riskUsed: null, maxRisk: null });
  });
});

describe('listCustomers · búsqueda y paginación', () => {
  it('busca por nombre o población', async () => {
    await seedCustomers();
    expect((await listCustomers({ q: 'pepe', page: 1 })).total).toBe(1);
    expect((await listCustomers({ q: 'ALZIRA', page: 1 })).items[0].name).toBe(
      'Ultramarinos Álvarez',
    );
  });

  it('devuelve la página pedida con el total de todas las páginas', async () => {
    await CustomerModel.create(
      Array.from({ length: 11 }, (_, index) => ({
        name: `Cliente ${String(index).padStart(2, '0')}`,
      })),
    );
    const second = await listCustomers({ page: 2 });
    expect(second).toMatchObject({ total: 11, page: 2, pageSize: 10 });
    expect(second.items.map((item) => item.name)).toEqual(['Cliente 10']);
  });
});
