import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ListPage, SupplierDetail, SupplierListItem, SupplierListQuery } from '@app/shared';
import { fetchSupplier, fetchSuppliers } from './suppliersApi';

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
}

const initialState: SuppliersState = {
  items: [],
  total: 0,
  status: 'idle',
  error: null,
  requestId: null,
  detail: { status: 'idle', data: null },
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

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    /** Al salir de la ficha: un estado final (notFound, error) no debe valer para la próxima que se abra. */
    closeSupplier(state) {
      state.detail.status = 'idle';
    },
  },
  extraReducers: (builder) => {
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
      })
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
  },
});

export const { closeSupplier } = suppliersSlice.actions;
export const suppliersReducer = suppliersSlice.reducer;
