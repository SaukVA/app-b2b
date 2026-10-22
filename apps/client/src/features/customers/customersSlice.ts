import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CustomerListItem, CustomerListQuery, ListPage } from '@app/shared';
import { fetchCustomers } from './customersApi';

// Los criterios no viven aquí: la dirección de la pantalla es su fuente de verdad (research R8).

export interface CustomersState {
  items: CustomerListItem[];
  total: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Última petición lanzada; las respuestas de otras se ignoran (research R9). */
  requestId: string | null;
}

const initialState: CustomersState = {
  items: [],
  total: 0,
  status: 'idle',
  error: null,
  requestId: null,
};

/** Mensaje fijo del error de carga (FR-013): nunca se muestran los detalles técnicos del servidor. */
export const CUSTOMERS_LOAD_ERROR_MESSAGE = 'No se ha podido cargar el listado de clientes.';

export const loadCustomers = createAsyncThunk<ListPage<CustomerListItem>, CustomerListQuery>(
  'customers/load',
  (query) => fetchCustomers(query),
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomers.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(loadCustomers.rejected, (state, action) => {
        // Una petición abortada (criterios nuevos o pantalla cerrada) no es un error.
        if (action.meta.aborted || action.meta.requestId !== state.requestId) return;
        state.status = 'failed';
        state.error = CUSTOMERS_LOAD_ERROR_MESSAGE;
      });
  },
});

export const customersReducer = customersSlice.reducer;
