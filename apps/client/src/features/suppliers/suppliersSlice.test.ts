import type { ListPage, SupplierDetail, SupplierListItem } from '@app/shared';
import { setupStore } from '../../store/store';
import {
  createSupplier as postSupplier,
  fetchSupplier,
  fetchSuppliers,
  updateSupplier as putSupplier,
} from './suppliersApi';
import { EMPTY_SUPPLIER_FORM, type SupplierFormValues } from './supplierForm';
import {
  SUPPLIERS_LOAD_ERROR_MESSAGE,
  closeSupplier,
  createSupplier,
  resetSave,
  updateSupplier,
  loadSupplier,
  loadSuppliers,
} from './suppliersSlice';

jest.mock('./suppliersApi', () => ({
  fetchSuppliers: jest.fn(),
  fetchSupplier: jest.fn(),
  createSupplier: jest.fn(),
  updateSupplier: jest.fn(),
}));

const mockedFetch = jest.mocked(fetchSuppliers);
const mockedFetchOne = jest.mocked(fetchSupplier);
const mockedPost = jest.mocked(postSupplier);
const mockedPut = jest.mocked(putSupplier);
const EMPTY_PAGE: ListPage<SupplierListItem> = { items: [], total: 0, page: 1, pageSize: 10 };
const DEFAULT_QUERY = { includeInactive: false, quarter: 1 as const, page: 1 };

beforeEach(() => {
  mockedFetch.mockReset();
  mockedFetchOne.mockReset();
  mockedPost.mockReset();
  mockedPut.mockReset();
});

describe('suppliersSlice', () => {
  it('arranca sin elementos, en idle y sin petición en curso', () => {
    expect(setupStore().getState().suppliers).toEqual({
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      requestId: null,
      detail: { status: 'idle', data: null },
      save: {
        status: 'idle',
        error: null,
        fieldErrors: {},
        otherErrors: [],
        notice: null,
        conflict: false,
      },
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

describe('suppliersSlice · error al cargar (US3, FR-013)', () => {
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
    await store.dispatch(loadSuppliers(DEFAULT_QUERY));
    expect(SUPPLIERS_LOAD_ERROR_MESSAGE).toBe('No se ha podido cargar el listado de proveedores.');
    expect(store.getState().suppliers).toMatchObject({
      status: 'failed',
      error: SUPPLIERS_LOAD_ERROR_MESSAGE,
    });
  });

  it('un pending posterior limpia el error', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network Error'));
    const store = setupStore();
    await store.dispatch(loadSuppliers(DEFAULT_QUERY));
    mockedFetch.mockReturnValue(new Promise(() => {}));
    void store.dispatch(loadSuppliers(DEFAULT_QUERY));
    expect(store.getState().suppliers).toMatchObject({ status: 'loading', error: null });
  });

  it('abortar una petición no la marca como error', async () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    const request = store.dispatch(loadSuppliers(DEFAULT_QUERY));
    request.abort();
    await request;
    expect(store.getState().suppliers.status).not.toBe('failed');
    expect(store.getState().suppliers.error).toBeNull();
  });
});

const DETAIL = { id: 's1', name: 'Aceites del Sur' } as SupplierDetail;
const httpError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { success: false, error: { code: 'X', message: 'detalle' } } },
  });

describe('suppliersSlice · ficha (US2, FR-012, FR-014)', () => {
  it('loadSupplier.pending pasa la ficha a loading', () => {
    mockedFetchOne.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    void store.dispatch(loadSupplier('s1'));
    expect(store.getState().suppliers.detail.status).toBe('loading');
    expect(mockedFetchOne).toHaveBeenCalledWith('s1');
  });

  it('loadSupplier.fulfilled pasa a ready con la ficha', async () => {
    mockedFetchOne.mockResolvedValue(DETAIL);
    const store = setupStore();
    await store.dispatch(loadSupplier('s1'));
    expect(store.getState().suppliers.detail).toEqual({ status: 'ready', data: DETAIL });
  });
});

describe('suppliersSlice · ficha inexistente, error y cierre (US2, FR-015)', () => {
  it('un 404 pasa a notFound sin ficha', async () => {
    mockedFetchOne.mockRejectedValue(httpError(404));
    const store = setupStore();
    await store.dispatch(loadSupplier('s1'));
    expect(store.getState().suppliers.detail).toEqual({ status: 'notFound', data: null });
  });

  it.each([
    ['sin respuesta del servidor', new Error('Network Error')],
    ['con un 500', httpError(500)],
  ])('%s pasa a error', async (_case, error) => {
    mockedFetchOne.mockRejectedValue(error);
    const store = setupStore();
    await store.dispatch(loadSupplier('s1'));
    expect(store.getState().suppliers.detail.status).toBe('error');
  });

  it('abrir otra ficha conserva el id de la anterior hasta que llega la nueva (foco al volver)', async () => {
    mockedFetchOne.mockResolvedValueOnce(DETAIL).mockReturnValueOnce(new Promise(() => {}));
    const store = setupStore();
    await store.dispatch(loadSupplier('s1'));
    void store.dispatch(loadSupplier('s2'));
    expect(store.getState().suppliers.detail).toEqual({ status: 'loading', data: DETAIL });
  });

  it('closeSupplier vuelve a idle conservando la última ficha', async () => {
    mockedFetchOne.mockResolvedValue(DETAIL);
    const store = setupStore();
    await store.dispatch(loadSupplier('s1'));
    store.dispatch(closeSupplier());
    expect(store.getState().suppliers.detail).toEqual({ status: 'idle', data: DETAIL });
  });
});

const FORM: SupplierFormValues = {
  ...EMPTY_SUPPLIER_FORM,
  name: 'Aceites del Sur',
  cif: 'b-12.345.674',
  address: 'Calle Mayor, 1',
  postalCode: '46001',
  city: 'Valencia',
  phones: [
    { label: '', value: '' },
    { label: '', value: '123' },
  ],
};

const apiError = (status: number, code: string, message: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { success: false, error: { code, message } } },
  });

describe('suppliersSlice · alta (US1, FR-009, FR-010)', () => {
  it('envía el alta normalizada y pasa a saving', () => {
    mockedPost.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    void store.dispatch(createSupplier(FORM));
    expect(store.getState().suppliers.save.status).toBe('saving');
    expect(mockedPost).toHaveBeenCalledWith(
      expect.objectContaining({ cif: 'B12345674', phones: [{ label: null, value: '123' }] }),
    );
  });

  it('al guardar deja la ficha lista y el aviso «Proveedor creado.»', async () => {
    mockedPost.mockResolvedValue(DETAIL);
    const store = setupStore();
    await store.dispatch(createSupplier(FORM));
    expect(store.getState().suppliers.save).toMatchObject({
      status: 'saved',
      notice: 'Proveedor creado.',
    });
    expect(store.getState().suppliers.detail).toEqual({ status: 'ready', data: DETAIL });
  });
});

describe('suppliersSlice · alta con errores (US1, FR-006, FR-010)', () => {
  it('un CIF duplicado va al error del campo CIF', async () => {
    const message = 'Ya existe un proveedor con este CIF: Levante.';
    mockedPost.mockRejectedValue(apiError(409, 'SUPPLIER_CIF_TAKEN', message));
    const store = setupStore();
    await store.dispatch(createSupplier(FORM));
    expect(store.getState().suppliers.save).toMatchObject({
      status: 'error',
      error: null,
      fieldErrors: { cif: message },
    });
  });

  it('un 400 se reparte entre los campos con la fila del formulario', async () => {
    mockedPost.mockRejectedValue(
      apiError(400, 'VALIDATION_ERROR', 'phones.0.value: Escribe un teléfono de 6 a 20 cifras.'),
    );
    const store = setupStore();
    await store.dispatch(createSupplier(FORM));
    expect(store.getState().suppliers.save.fieldErrors).toEqual({
      'phones.1.value': 'Escribe un teléfono de 6 a 20 cifras.',
    });
  });
});

describe('suppliersSlice · fallos al guardar y reinicio (US1, FR-010)', () => {
  it.each([
    [apiError(403, 'AUTH_FORBIDDEN', 'x'), 'Ya no tienes permiso para editar proveedores.'],
    [
      new Error('Network Error'),
      'No se ha podido guardar el proveedor. Lo que has escrito sigue aquí; vuelve a intentarlo.',
    ],
    [
      apiError(500, 'INTERNAL', 'detalle'),
      'No se ha podido guardar el proveedor. Lo que has escrito sigue aquí; vuelve a intentarlo.',
    ],
  ])('un fallo muestra su mensaje fijo (%#)', async (error, message) => {
    mockedPost.mockRejectedValue(error);
    const store = setupStore();
    await store.dispatch(createSupplier(FORM));
    expect(store.getState().suppliers.save).toMatchObject({ status: 'error', error: message });
  });

  it('resetSave vuelve al estado inicial del guardado', async () => {
    mockedPost.mockResolvedValue(DETAIL);
    const store = setupStore();
    await store.dispatch(createSupplier(FORM));
    store.dispatch(resetSave());
    expect(store.getState().suppliers.save).toEqual({
      status: 'idle',
      error: null,
      fieldErrors: {},
      otherErrors: [],
      notice: null,
      conflict: false,
    });
  });
});

const EDIT = { id: 's1', version: 3, values: FORM };

describe('suppliersSlice · edición (US3, FR-007, FR-009)', () => {
  it('envía el id, la versión leída y los datos normalizados', () => {
    mockedPut.mockReturnValue(new Promise(() => {}));
    const store = setupStore();
    void store.dispatch(updateSupplier(EDIT));
    expect(store.getState().suppliers.save.status).toBe('saving');
    expect(mockedPut).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ cif: 'B12345674', version: 3 }),
    );
  });

  it('al guardar deja la ficha nueva y el aviso «Cambios guardados.»', async () => {
    mockedPut.mockResolvedValue({ ...DETAIL, version: 4 });
    const store = setupStore();
    await store.dispatch(updateSupplier(EDIT));
    expect(store.getState().suppliers.save).toMatchObject({
      status: 'saved',
      notice: 'Cambios guardados.',
      conflict: false,
    });
    expect(store.getState().suppliers.detail.data).toMatchObject({ version: 4 });
  });
});

describe('suppliersSlice · edición con conflicto o sin permiso (US3, FR-011)', () => {
  it('un 409 de versión marca el conflicto, sin error general ni de campo', async () => {
    mockedPut.mockRejectedValue(
      apiError(409, 'SUPPLIER_VERSION_CONFLICT', 'Otro usuario ha cambiado este proveedor.'),
    );
    const store = setupStore();
    await store.dispatch(updateSupplier(EDIT));
    expect(store.getState().suppliers.save).toMatchObject({
      status: 'error',
      conflict: true,
      error: null,
      fieldErrors: {},
    });
  });

  it('un 403 muestra que ya no hay permiso', async () => {
    mockedPut.mockRejectedValue(apiError(403, 'AUTH_FORBIDDEN', 'x'));
    const store = setupStore();
    await store.dispatch(updateSupplier(EDIT));
    expect(store.getState().suppliers.save).toMatchObject({
      error: 'Ya no tienes permiso para editar proveedores.',
      conflict: false,
    });
  });
});
