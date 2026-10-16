import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { DatabaseState, DatabaseSummary, DatabaseTestResult } from '@app/shared';
import { getDatabaseSummary } from './databaseApi';

// Estado de la base de datos del escritorio (data-model.md, «Estado en el cliente»).

export interface DatabaseSliceState {
  summary: DatabaseSummary | null;
  /** Lo que muestra el indicador del login; checking mientras se espera la respuesta. */
  state: 'checking' | DatabaseState;
  test: { status: 'idle' | 'running' | 'done'; result: DatabaseTestResult | null };
  saving: boolean;
}

const initialState: DatabaseSliceState = {
  summary: null,
  state: 'checking',
  test: { status: 'idle', result: null },
  saving: false,
};

export const loadDatabaseSummary = createAsyncThunk('database/loadSummary', getDatabaseSummary);

const databaseSlice = createSlice({
  name: 'database',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadDatabaseSummary.fulfilled, (state, action) => {
      state.summary = action.payload;
      if (!action.payload.configured) state.state = 'unconfigured';
    });
  },
});

export const databaseReducer = databaseSlice.reducer;
