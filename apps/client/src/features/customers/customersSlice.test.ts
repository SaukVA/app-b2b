import type { CustomerListItem, ListPage } from '@app/shared';
import { setupStore } from '../../store/store';
import { fetchCustomers } from './customersApi';
import { CUSTOMERS_LOAD_ERROR_MESSAGE, loadCustomers } from './customersSlice';

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

describe('customersSlice · solo cuenta la última petición (US2, research R9)', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => (resolve = res));
    return { promise, resolve };
  }

  it('un pending posterior sustituye el requestId', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    const first = store.dispatch(loadCustomers({ page: 1 }));
    const second = store.dispatch(loadCustomers({ q: 'ferreteria', page: 1 }));
    expect(store.getState().customers.requestId).toBe(second.requestId);
    expect(first.requestId).not.toBe(second.requestId);
  });

  it('ignora el fulfilled de una petición que ya no es la última', async () => {
    const stale = deferred<ListPage<CustomerListItem>>();
    mockedFetch.mockReturnValueOnce(stale.promise).mockReturnValueOnce(new Promise(() => {}));
    const store = setupStore();
    const first = store.dispatch(loadCustomers({ q: 'fer', page: 1 }));
    void store.dispatch(loadCustomers({ q: 'ferreteria', page: 1 }));
    stale.resolve({ ...EMPTY_PAGE, total: 7 });
    await first;
    expect(store.getState().customers).toMatchObject({ status: 'loading', total: 0 });
  });
});

describe('customersSlice · error al cargar (US3, FR-013)', () => {
  const serverError = Object.assign(new Error('Request failed with status code 500'), {
    response: {
      status: 500,
      data: { success: false, error: { code: 'X', message: 'detalle técnico' } },
    },
  });

  it.each([
    ['sin respuesta del servidor', new Error('Network Error')],
    ['con un envelope de error del servidor', serverError],
  ])('%s pasa a failed con el mensaje fijo, nunca el del servidor', async (_case, error) => {
    mockedFetch.mockRejectedValue(error);
    const store = setupStore();
    await store.dispatch(loadCustomers({ page: 1 }));
    expect(CUSTOMERS_LOAD_ERROR_MESSAGE).toBe('No se ha podido cargar el listado de clientes.');
    expect(store.getState().customers).toMatchObject({
      status: 'failed',
      error: CUSTOMERS_LOAD_ERROR_MESSAGE,
    });
  });

  it('un pending posterior limpia el error', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network Error'));
    const store = setupStore();
    await store.dispatch(loadCustomers({ page: 1 }));
    mockedFetch.mockReturnValue(new Promise(() => {}));
    void store.dispatch(loadCustomers({ page: 1 }));
    expect(store.getState().customers).toMatchObject({ status: 'loading', error: null });
  });

  it('abortar una petición no la marca como error', async () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    const request = store.dispatch(loadCustomers({ page: 1 }));
    request.abort();
    await request;
    expect(store.getState().customers.status).not.toBe('failed');
    expect(store.getState().customers.error).toBeNull();
  });
});
