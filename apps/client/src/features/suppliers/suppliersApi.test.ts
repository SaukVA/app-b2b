import type { ListPage, SupplierDetail, SupplierListItem } from '@app/shared';
import { httpClient } from '../../utils/httpClient';
import { fetchSupplier, fetchSuppliers } from './suppliersApi';

jest.mock('../../utils/httpClient', () => ({ httpClient: { get: jest.fn() } }));

const mockedGet = jest.mocked(httpClient.get);
const EMPTY_PAGE: ListPage<SupplierListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

// Fecha fija en el 2T: el trimestre en curso no se envía (FR-021a).
beforeAll(() => jest.useFakeTimers({ now: new Date('2026-05-10T10:00:00Z') }));
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  mockedGet.mockReset();
  mockedGet.mockResolvedValue({ data: { success: true, data: EMPTY_PAGE } });
});

describe('fetchSuppliers', () => {
  it('con los criterios por defecto pide GET /suppliers sin parámetros', async () => {
    await fetchSuppliers({ includeInactive: false, quarter: 2, page: 1 });
    expect(mockedGet).toHaveBeenCalledWith('/suppliers', { params: {} });
  });

  it('envía solo los criterios que no son los de por defecto', async () => {
    await fetchSuppliers({ q: 'levante', includeInactive: true, quarter: 4, page: 2 });
    expect(mockedGet).toHaveBeenCalledWith('/suppliers', {
      params: { q: 'levante', includeInactive: 'true', quarter: 4, page: 2 },
    });
  });

  it('devuelve el data del envelope', async () => {
    await expect(fetchSuppliers({ includeInactive: false, quarter: 2, page: 1 })).resolves.toEqual(
      EMPTY_PAGE,
    );
  });
});

describe('fetchSupplier', () => {
  it('pide GET /suppliers/:id y devuelve el data del envelope', async () => {
    const detail = { id: 's1', name: 'Aceites del Sur' } as SupplierDetail;
    mockedGet.mockResolvedValue({ data: { success: true, data: detail } });
    await expect(fetchSupplier('s1')).resolves.toEqual(detail);
    expect(mockedGet).toHaveBeenCalledWith('/suppliers/s1');
  });
});
