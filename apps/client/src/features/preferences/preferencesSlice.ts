import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  DEFAULT_MONEY_FORMAT,
  DEFAULT_TABLE_DENSITY,
  DEFAULT_THEME,
  type AppearancePreferences,
  type AuthUser,
  type UpdatePreferencesRequest,
} from '@app/shared';
import { authPreferencesSaved, login, logout, sessionCleared } from '../auth/authSlice';
import { PREFERENCES_SAVE_ERROR, updatePreferences } from './preferencesApi';

export interface PreferencesState {
  /** Lo que se ve; `null` sin sesión (el tema sale entonces de `appearance.lastTheme`). */
  applied: AppearancePreferences | null;
  saveStatus: 'idle' | 'saving' | 'failed';
  saveError: string | null;
  /** Campos aplicados que aún no se han podido guardar; se reenvían con la siguiente elección (FR-004). */
  pendingChange: UpdatePreferencesRequest;
}

const initialState: PreferencesState = {
  applied: null,
  saveStatus: 'idle',
  saveError: null,
  pendingChange: {},
};

/** Aplica un cambio; `null` vuelve al valor por defecto (en `homeScreen`, a "sin elegir"). */
function withChange(
  applied: AppearancePreferences,
  change: UpdatePreferencesRequest,
): AppearancePreferences {
  const next = { ...applied, ...change };
  return {
    theme: next.theme ?? DEFAULT_THEME,
    tableDensity: next.tableDensity ?? DEFAULT_TABLE_DENSITY,
    moneyFormat: next.moneyFormat ?? DEFAULT_MONEY_FORMAT,
    homeScreen: next.homeScreen ?? null,
  };
}

/** Quita de lo pendiente lo que ya se ha guardado con el mismo valor. */
function withoutSaved(
  pending: UpdatePreferencesRequest,
  saved: UpdatePreferencesRequest,
): UpdatePreferencesRequest {
  const entries = Object.entries(pending).filter(
    ([key, value]) => saved[key as keyof UpdatePreferencesRequest] !== value,
  );
  return Object.fromEntries(entries);
}

/**
 * Aplica el cambio al momento y lo guarda en segundo plano junto con lo que quedase pendiente (research
 * R6). Si falla, el cambio se sigue viendo y se avisa, pero lo guardado (`auth.user`) no cambia.
 */
export const savePreference = createAsyncThunk<
  UpdatePreferencesRequest,
  UpdatePreferencesRequest,
  { rejectValue: string; state: { preferences: PreferencesState } }
>('preferences/save', async (change, { dispatch, getState, rejectWithValue }) => {
  dispatch(preferencesSlice.actions.preferenceApplied(change));
  const body = getState().preferences.pendingChange;
  try {
    dispatch(authPreferencesSaved(await updatePreferences(body)));
    return body;
  } catch {
    // Conexión o servidor: el aviso es el mismo (FR-004).
    return rejectWithValue(PREFERENCES_SAVE_ERROR);
  }
});

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    /** Al terminar de restaurar la sesión al arrancar o recargar (no en la renovación periódica). */
    sessionRestored: (_state, action: PayloadAction<AuthUser | null>) => ({
      ...initialState,
      applied: action.payload?.preferences ?? null,
    }),
    preferenceApplied: (state, action: PayloadAction<UpdatePreferencesRequest>) => {
      if (state.applied) state.applied = withChange(state.applied, action.payload);
      state.pendingChange = { ...state.pendingChange, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (_state, action) => ({
        ...initialState,
        applied: action.payload.user.preferences,
      }))
      .addCase(logout.fulfilled, () => initialState)
      .addCase(sessionCleared, () => initialState)
      .addCase(savePreference.pending, (state) => {
        state.saveStatus = 'saving';
        state.saveError = null;
      })
      .addCase(savePreference.fulfilled, (state, action) => {
        state.saveStatus = 'idle';
        state.pendingChange = withoutSaved(state.pendingChange, action.payload);
      })
      .addCase(savePreference.rejected, (state, action) => {
        state.saveStatus = 'failed';
        state.saveError = action.payload ?? null;
      });
  },
});

export const { sessionRestored } = preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;
