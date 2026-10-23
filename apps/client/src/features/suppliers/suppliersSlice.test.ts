import type { ListPage, SupplierListItem } from '@app/shared';
import { setupStore } from '../../store/store';
import { fetchSuppliers } from './suppliersApi';
import { loadSuppliers } from './suppliersSlice';

jest.mock('./suppliersApi', () => ({ fetchSuppliers: jest.fn() }));

const mockedFetch = jest.mocked(fetchSuppliers);
const EMPTY_PAGE: ListPage<SupplierListItem> = { items: [], total: 0, page: 1, pageSize: 10 };
const DEFAULT_QUERY = { includeInactive: false, page: 1 };

beforeEach(() => mockedFetch.mockReset());

describe('suppliersSlice', () => {
  it('arranca sin elementos, en idle y sin petición en curso', () => {
    expect(setupStore().getState().suppliers).toEqual({
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      requestId: null,
    });
  });

  it('loadSuppliers.pending pasa a loading', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    void store.dispatch(loadSuppliers(DEFAULT_QUERY));
    expect(store.getState().suppliers.status).toBe('loading');
  });

  it('loadSuppliers.fulfilled con la página vacía pasa a succeeded con total 0', async () => {
    mockedFetch.mockResolvedValue(EMPTY_PAGE);
    const store = setupStore();
    await store.dispatch(loadSuppliers(DEFAULT_QUERY));
    expect(store.getState().suppliers).toMatchObject({ status: 'succeeded', total: 0, items: [] });
    expect(mockedFetch).toHaveBeenCalledWith(DEFAULT_QUERY);
  });
});
