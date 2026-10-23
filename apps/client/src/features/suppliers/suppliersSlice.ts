import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ListPage, SupplierListItem, SupplierListQuery } from '@app/shared';
import { fetchSuppliers } from './suppliersApi';

// Los criterios no viven aquí: la dirección de la pantalla es su fuente de verdad (research R8).

export interface SuppliersState {
  items: SupplierListItem[];
  total: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Última petición lanzada; las respuestas de otras se ignoran (research R9). */
  requestId: string | null;
}

const initialState: SuppliersState = {
  items: [],
  total: 0,
  status: 'idle',
  error: null,
  requestId: null,
};

/** Mensaje fijo del error de carga (FR-013): nunca se muestran los detalles técnicos del servidor. */
export const SUPPLIERS_LOAD_ERROR_MESSAGE = 'No se ha podido cargar el listado de proveedores.';

export const loadSuppliers = createAsyncThunk<ListPage<SupplierListItem>, SupplierListQuery>(
  'suppliers/load',
  (query) => fetchSuppliers(query),
);

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {},
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
      });
  },
});

export const suppliersReducer = suppliersSlice.reducer;
