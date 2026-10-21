import type { ListPage, ProductListItem } from '@app/shared';
import { httpClient } from '../../utils/httpClient';
import { fetchProducts } from './productsApi';

jest.mock('../../utils/httpClient', () => ({ httpClient: { get: jest.fn() } }));

const mockedGet = jest.mocked(httpClient.get);
const EMPTY_PAGE: ListPage<ProductListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockResolvedValue({ data: { success: true, data: EMPTY_PAGE } });
});

describe('fetchProducts', () => {
  it('con los criterios por defecto pide GET /products sin parámetros', async () => {
    await fetchProducts({ lowStock: false, page: 1 });
    expect(mockedGet).toHaveBeenCalledWith('/products', { params: {} });
  });

  it('envía solo los criterios que no son los de por defecto', async () => {
    await fetchProducts({ q: 'aceite', lowStock: true, page: 2 });
    expect(mockedGet).toHaveBeenCalledWith('/products', {
      params: { q: 'aceite', lowStock: 'true', page: 2 },
    });
  });

  it('devuelve el data del envelope', async () => {
    await expect(fetchProducts({ lowStock: false, page: 1 })).resolves.toEqual(EMPTY_PAGE);
  });
});
