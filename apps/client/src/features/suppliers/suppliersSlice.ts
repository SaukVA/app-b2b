import { createAsyncThunk, createSlice, type ActionReducerMapBuilder } from '@reduxjs/toolkit';
import {
  SUPPLIER_ERROR_CODES,
  type ApiError,
  type ListPage,
  type SupplierDetail,
  type SupplierListItem,
  type SupplierListQuery,
} from '@app/shared';
import {
  parseValidationMessage,
  toSupplierInput,
  type SupplierFormErrors,
  type SupplierFormValues,
} from './supplierForm';
import { createSupplier as postSupplier, fetchSupplier, fetchSuppliers } from './suppliersApi';

// Los criterios no viven aquí: la dirección de la pantalla es su fuente de verdad (research R8).

export interface SuppliersState {
  items: SupplierListItem[];
  total: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Última petición lanzada; las respuestas de otras se ignoran (research R9). */
  requestId: string | null;
  /**
   * Ficha abierta (010 US2). `data` se conserva mientras carga otra: el listado enfoca la fila del último
   * proveedor abierto al volver (FR-014).
   */
  detail: {
    status: 'idle' | 'loading' | 'ready' | 'notFound' | 'error';
    data: SupplierDetail | null;
  };
  /** Guardado del formulario (010 US1). `notice` es el aviso breve que muestra la ficha (FR-009). */
  save: {
    status: 'idle' | 'saving' | 'saved' | 'error';
    /** Aviso general del formulario (red, permiso); los errores de campo van en `fieldErrors`. */
    error: string | null;
    fieldErrors: SupplierFormErrors;
    otherErrors: string[];
    notice: string | null;
  };
}

const INITIAL_SAVE: SuppliersState['save'] = {
  status: 'idle',
  error: null,
  fieldErrors: {},
  otherErrors: [],
  notice: null,
};

const initialState: SuppliersState = {
  items: [],
  total: 0,
  status: 'idle',
  error: null,
  requestId: null,
  detail: { status: 'idle', data: null },
  save: INITIAL_SAVE,
};

/** Mensaje fijo del error de carga (FR-013): nunca se muestran los detalles técnicos del servidor. */
export const SUPPLIERS_LOAD_ERROR_MESSAGE = 'No se ha podido cargar el listado de proveedores.';

export const loadSuppliers = createAsyncThunk<ListPage<SupplierListItem>, SupplierListQuery>(
  'suppliers/load',
  (query) => fetchSuppliers(query),
);

const isNotFound = (err: unknown): boolean =>
  (err as { response?: { status?: number } }).response?.status === 404;

/** Un 404 se rechaza con `'notFound'`; cualquier otro fallo es un error de carga (FR-015). */
export const loadSupplier = createAsyncThunk<SupplierDetail, string, { rejectValue: 'notFound' }>(
  'suppliers/loadOne',
  async (id, { rejectWithValue }) => {
    try {
      return await fetchSupplier(id);
    } catch (err) {
      if (isNotFound(err)) return rejectWithValue('notFound');
      throw err;
    }
  },
);

export const SUPPLIER_SAVE_ERROR_MESSAGE =
  'No se ha podido guardar el proveedor. Lo que has escrito sigue aquí; vuelve a intentarlo.';
export const SUPPLIER_FORBIDDEN_MESSAGE = 'Ya no tienes permiso para editar proveedores.';

type SaveFailure = Pick<SuppliersState['save'], 'error' | 'fieldErrors' | 'otherErrors'>;

/** Respuesta de error → lo que muestra el formulario, sin perder lo escrito (FR-006, FR-010). */
function toSaveFailure(err: unknown, values: SupplierFormValues): SaveFailure {
  const response = (err as { response?: { status?: number; data?: ApiError } }).response;
  const error = response?.data?.error;
  const none = { error: null, fieldErrors: {}, otherErrors: [] };
  if (error?.code === SUPPLIER_ERROR_CODES.cifTaken) {
    return { ...none, fieldErrors: { cif: error.message } };
  }
  if (response?.status === 400 && error) {
    const { fields, other } = parseValidationMessage(error.message, values);
    return { ...none, fieldErrors: fields, otherErrors: other };
  }
  if (response?.status === 403) return { ...none, error: SUPPLIER_FORBIDDEN_MESSAGE };
  return { ...none, error: SUPPLIER_SAVE_ERROR_MESSAGE };
}

/** Alta desde el formulario: envía los valores normalizados y deja la ficha lista (FR-009). */
export const createSupplier = createAsyncThunk<
  SupplierDetail,
  SupplierFormValues,
  { rejectValue: SaveFailure }
>('suppliers/create', async (values, { rejectWithValue }) => {
  try {
    return await postSupplier(toSupplierInput(values));
  } catch (err) {
    return rejectWithValue(toSaveFailure(err, values));
  }
});

type Builder = ActionReducerMapBuilder<SuppliersState>;

function addListCases(builder: Builder): void {
  builder
    .addCase(loadSuppliers.pending, (state, action) => {
      state.status = 'loading';
      state.error = null;
      state.requestId = action.meta.requestId;
    })
    .addCase(loadSuppliers.fulfilled, (state, action) => {
      if (action.meta.requestId !== state.requestId) return;
      state.status = 'succeeded';
      state.items = action.payload.items;
      state.total = action.payload.total;
    })
    .addCase(loadSuppliers.rejected, (state, action) => {
      // Una petición abortada (criterios nuevos o pantalla cerrada) no es un error.
      if (action.meta.aborted || action.meta.requestId !== state.requestId) return;
      state.status = 'failed';
      state.error = SUPPLIERS_LOAD_ERROR_MESSAGE;
    });
}

function addDetailCases(builder: Builder): void {
  builder
    .addCase(loadSupplier.pending, (state) => {
      state.detail.status = 'loading';
    })
    .addCase(loadSupplier.fulfilled, (state, action) => {
      state.detail = { status: 'ready', data: action.payload };
    })
    .addCase(loadSupplier.rejected, (state, action) => {
      if (action.meta.aborted) return;
      if (action.payload === 'notFound') state.detail = { status: 'notFound', data: null };
      else state.detail.status = 'error';
    });
}

function addSaveCases(builder: Builder): void {
  builder
    .addCase(createSupplier.pending, (state) => {
      state.save = { ...INITIAL_SAVE, status: 'saving' };
    })
    .addCase(createSupplier.fulfilled, (state, action) => {
      state.save = { ...INITIAL_SAVE, status: 'saved', notice: 'Proveedor creado.' };
      state.detail = { status: 'ready', data: action.payload };
    })
    .addCase(createSupplier.rejected, (state, action) => {
      const failure = action.payload ?? { ...INITIAL_SAVE, error: SUPPLIER_SAVE_ERROR_MESSAGE };
      state.save = { ...INITIAL_SAVE, ...failure, status: 'error' };
    });
}

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    /** Al salir de la ficha: un estado final (notFound, error) no debe valer para la próxima que se abra. */
    closeSupplier(state) {
      state.detail.status = 'idle';
    },
    /** La ficha ya ha recogido el aviso de guardado: no se repite al volver a abrirla. */
    clearSaveNotice(state) {
      state.save.notice = null;
    },
    /** Al abrir el formulario: sin errores ni avisos de un guardado anterior. */
    resetSave(state) {
      state.save = INITIAL_SAVE;
    },
  },
  extraReducers: (builder) => {
    addListCases(builder);
    addDetailCases(builder);
    addSaveCases(builder);
  },
});

export const { clearSaveNotice, closeSupplier, resetSave } = suppliersSlice.actions;
export const suppliersReducer = suppliersSlice.reducer;
