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
        state.requestId = action.meta.requestId;
      })
      .addCase(loadSuppliers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
      });
  },
});

export const suppliersReducer = suppliersSlice.reducer;
