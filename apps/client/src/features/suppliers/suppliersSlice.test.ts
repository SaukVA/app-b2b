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

describe('suppliersSlice · solo cuenta la última petición (US2, research R9)', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => (resolve = res));
    return { promise, resolve };
  }

  it('un pending posterior sustituye el requestId', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    const first = store.dispatch(loadSuppliers(DEFAULT_QUERY));
    const second = store.dispatch(loadSuppliers({ ...DEFAULT_QUERY, q: 'levante' }));
    expect(store.getState().suppliers.requestId).toBe(second.requestId);
    expect(first.requestId).not.toBe(second.requestId);
  });

  it('ignora el fulfilled de una petición que ya no es la última', async () => {
    const stale = deferred<ListPage<SupplierListItem>>();
    mockedFetch.mockReturnValueOnce(stale.promise).mockReturnValueOnce(new Promise(() => {}));
    const store = setupStore();
    const first = store.dispatch(loadSuppliers({ ...DEFAULT_QUERY, q: 'lev' }));
    void store.dispatch(loadSuppliers({ ...DEFAULT_QUERY, q: 'levante' }));
    stale.resolve({ ...EMPTY_PAGE, total: 7 });
    await first;
    expect(store.getState().suppliers).toMatchObject({ status: 'loading', total: 0 });
  });
});
