import type { ListPage, ProductListItem } from '@app/shared';
import { setupStore } from '../../store/store';
import { fetchProducts } from './productsApi';
import { loadProducts } from './productsSlice';

jest.mock('./productsApi', () => ({ fetchProducts: jest.fn() }));

const mockedFetch = jest.mocked(fetchProducts);
const EMPTY_PAGE: ListPage<ProductListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

beforeEach(() => mockedFetch.mockReset());

describe('productsSlice', () => {
  it('arranca sin elementos, en idle y sin petición en curso', () => {
    expect(setupStore().getState().products).toEqual({
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      requestId: null,
    });
  });

  it('loadProducts.pending pasa a loading', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    void store.dispatch(loadProducts({ lowStock: false, page: 1 }));
    expect(store.getState().products.status).toBe('loading');
  });

  it('loadProducts.fulfilled con la página vacía pasa a succeeded con total 0', async () => {
    mockedFetch.mockResolvedValue(EMPTY_PAGE);
    const store = setupStore();
    await store.dispatch(loadProducts({ lowStock: false, page: 1 }));
    expect(store.getState().products).toMatchObject({ status: 'succeeded', total: 0, items: [] });
    expect(mockedFetch).toHaveBeenCalledWith({ lowStock: false, page: 1 });
  });
});

describe('productsSlice · solo cuenta la última petición (US2, research R7)', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => (resolve = res));
    return { promise, resolve };
  }

  it('un pending posterior sustituye el requestId', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    const first = store.dispatch(loadProducts({ lowStock: false, page: 1 }));
    const second = store.dispatch(loadProducts({ lowStock: true, page: 1 }));
    expect(store.getState().products.requestId).toBe(second.requestId);
    expect(first.requestId).not.toBe(second.requestId);
  });

  it('ignora el fulfilled de una petición que ya no es la última', async () => {
    const stale = deferred<ListPage<ProductListItem>>();
    mockedFetch.mockReturnValueOnce(stale.promise).mockReturnValueOnce(new Promise(() => {}));
    const store = setupStore();
    const first = store.dispatch(loadProducts({ q: 'ace', lowStock: false, page: 1 }));
    void store.dispatch(loadProducts({ q: 'aceite', lowStock: false, page: 1 }));
    stale.resolve({ ...EMPTY_PAGE, total: 7 });
    await first;
    expect(store.getState().products).toMatchObject({ status: 'loading', total: 0 });
  });
});
