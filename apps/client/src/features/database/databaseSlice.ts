import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  DATABASE_ERROR_CODES,
  DATABASE_MESSAGES,
  type DatabaseSaveResult,
  type DatabaseState,
  type DatabaseSummary,
  type DatabaseTestResult,
} from '@app/shared';
import * as databaseApi from './databaseApi';

// Estado de la base de datos del escritorio (data-model.md, «Estado en el cliente»).

export interface DatabaseSliceState {
  summary: DatabaseSummary | null;
  /** Lo que muestra el indicador del login; checking mientras se espera la respuesta. */
  state: 'checking' | DatabaseState;
  /** Resultado de «Probar conexión» o del último «Guardar» rechazado. */
  test: { status: 'idle' | 'running' | 'done'; result: DatabaseTestResult | null };
  saving: boolean;
}

const initialState: DatabaseSliceState = {
  summary: null,
  state: 'checking',
  test: { status: 'idle', result: null },
  saving: false,
};

/** Si el puente falla (p. ej. el proceso principal rechaza la llamada), se muestra como sin respuesta. */
const BRIDGE_FAILURE: DatabaseTestResult = {
  ok: false,
  code: DATABASE_ERROR_CODES.unreachable,
  message: DATABASE_MESSAGES.unreachable,
};

export const loadDatabaseSummary = createAsyncThunk(
  'database/loadSummary',
  databaseApi.getDatabaseSummary,
);

export const testDatabase = createAsyncThunk<DatabaseTestResult, string>('database/test', (uri) =>
  databaseApi.testDatabase(uri).catch(() => BRIDGE_FAILURE),
);

export const saveDatabase = createAsyncThunk<DatabaseSaveResult, string>('database/save', (uri) =>
  databaseApi.saveDatabase(uri).catch(() => BRIDGE_FAILURE),
);

const databaseSlice = createSlice({
  name: 'database',
  initialState,
  reducers: {
    /** Al abrir la pantalla de configuración no se arrastra el resultado de una visita anterior. */
    testCleared(state) {
      state.test = { status: 'idle', result: null };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDatabaseSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        if (!action.payload.configured) state.state = 'unconfigured';
      })
      .addCase(testDatabase.pending, (state) => {
        state.test = { status: 'running', result: null };
      })
      .addCase(testDatabase.fulfilled, (state, action) => {
        state.test = { status: 'done', result: action.payload };
      })
      .addCase(saveDatabase.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveDatabase.fulfilled, (state, action) => {
        state.saving = false;
        const { summary, ...result } = action.payload;
        if (!result.ok) {
          state.test = { status: 'done', result };
          return;
        }
        if (summary) state.summary = summary;
        // Base de datos nueva: el estado real se comprueba al volver al login (FR-005).
        state.state = 'checking';
        state.test = { status: 'idle', result: null };
      });
  },
});

export const { testCleared } = databaseSlice.actions;
export const databaseReducer = databaseSlice.reducer;
