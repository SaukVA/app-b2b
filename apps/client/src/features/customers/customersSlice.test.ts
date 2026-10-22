import type { CustomerListItem, ListPage } from '@app/shared';
import { setupStore } from '../../store/store';
import { fetchCustomers } from './customersApi';
import { loadCustomers } from './customersSlice';

jest.mock('./customersApi', () => ({ fetchCustomers: jest.fn() }));

const mockedFetch = jest.mocked(fetchCustomers);
const EMPTY_PAGE: ListPage<CustomerListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

beforeEach(() => mockedFetch.mockReset());

describe('customersSlice', () => {
  it('arranca sin elementos, en idle y sin petición en curso', () => {
    expect(setupStore().getState().customers).toEqual({
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      requestId: null,
    });
  });

  it('loadCustomers.pending pasa a loading', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    void store.dispatch(loadCustomers({ page: 1 }));
    expect(store.getState().customers.status).toBe('loading');
  });

  it('loadCustomers.fulfilled con la página vacía pasa a succeeded con total 0', async () => {
    mockedFetch.mockResolvedValue(EMPTY_PAGE);
    const store = setupStore();
    await store.dispatch(loadCustomers({ page: 1 }));
    expect(store.getState().customers).toMatchObject({ status: 'succeeded', total: 0, items: [] });
    expect(mockedFetch).toHaveBeenCalledWith({ page: 1 });
  });
});
