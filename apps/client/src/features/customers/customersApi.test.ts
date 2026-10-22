import type { CustomerListItem, ListPage } from '@app/shared';
import { httpClient } from '../../utils/httpClient';
import { fetchCustomers } from './customersApi';

jest.mock('../../utils/httpClient', () => ({ httpClient: { get: jest.fn() } }));

const mockedGet = jest.mocked(httpClient.get);
const EMPTY_PAGE: ListPage<CustomerListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockResolvedValue({ data: { success: true, data: EMPTY_PAGE } });
});

describe('fetchCustomers', () => {
  it('con los criterios por defecto pide GET /customers sin parámetros', async () => {
    await fetchCustomers({ page: 1 });
    expect(mockedGet).toHaveBeenCalledWith('/customers', { params: {} });
  });

  it('envía solo los criterios que no son los de por defecto', async () => {
    await fetchCustomers({ q: 'ferreteria', page: 2 });
    expect(mockedGet).toHaveBeenCalledWith('/customers', {
      params: { q: 'ferreteria', page: 2 },
    });
  });

  it('devuelve el data del envelope', async () => {
    await expect(fetchCustomers({ page: 1 })).resolves.toEqual(EMPTY_PAGE);
  });
});
