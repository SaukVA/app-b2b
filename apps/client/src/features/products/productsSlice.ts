import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { ListPage, ProductListItem, ProductListQuery } from '@app/shared';
import { fetchProducts } from './productsApi';

// Los criterios no viven aquí: la dirección de la pantalla es su fuente de verdad (research R6).

export interface ProductsState {
  items: ProductListItem[];
  total: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Última petición lanzada; las respuestas de otras se ignoran (research R7). */
  requestId: string | null;
}

const initialState: ProductsState = {
  items: [],
  total: 0,
  status: 'idle',
  error: null,
  requestId: null,
};

/** Mensaje fijo del error de carga (FR-014): nunca se muestran los detalles técnicos del servidor. */
export const PRODUCTS_LOAD_ERROR_MESSAGE = 'No se ha podido cargar el listado de productos.';

export const loadProducts = createAsyncThunk<ListPage<ProductListItem>, ProductListQuery>(
  'products/load',
  (query) => fetchProducts(query),
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadProducts.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(loadProducts.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
      })
      .addCase(loadProducts.rejected, (state, action) => {
        // Una petición abortada (criterios nuevos o pantalla cerrada) no es un error.
        if (action.meta.aborted || action.meta.requestId !== state.requestId) return;
        state.status = 'failed';
        state.error = PRODUCTS_LOAD_ERROR_MESSAGE;
      });
  },
});

export const productsReducer = productsSlice.reducer;
