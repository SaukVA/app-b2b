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
        state.requestId = action.meta.requestId;
      })
      .addCase(loadProducts.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return;
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.total = action.payload.total;
      });
  },
});

export const productsReducer = productsSlice.reducer;
