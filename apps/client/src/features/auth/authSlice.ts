import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AuthUser, LoginRequest, LoginResponse } from '@app/shared';
import { getDesktopBridge, isDesktop } from '../../utils/desktop';
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  refreshRequest,
  toAuthErrorMessage,
} from './authApi';

export interface AuthState {
  user: AuthUser | null;
  /** Solo en memoria (research R2): nunca en localStorage. */
  accessToken: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export type LoginCredentials = Omit<LoginRequest, 'client'>;

const initialState: AuthState = { user: null, accessToken: null, status: 'idle', error: null };

export const login = createAsyncThunk<LoginResponse, LoginCredentials, { rejectValue: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      return await loginRequest({ ...credentials, client: isDesktop() ? 'desktop' : 'web' });
    } catch (err) {
      return rejectWithValue(toAuthErrorMessage(err));
    }
  },
);

export const loadMe = createAsyncThunk<AuthUser, void, { rejectValue: string }>(
  'auth/loadMe',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMe();
    } catch (err) {
      return rejectWithValue(toAuthErrorMessage(err));
    }
  },
);

/** Renueva el access token con el refresh token (al arrancar y cuando caduca, research R8). */
export const refreshSession = createAsyncThunk<LoginResponse, void, { rejectValue: string }>(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      return await refreshRequest();
    } catch (err) {
      return rejectWithValue(toAuthErrorMessage(err));
    }
  },
);

/** Cierra la sesión en el servidor y en el equipo (FR-013). */
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await logoutRequest();
  } catch {
    // Aunque el servidor falle o no responda, la sesión se cierra en este equipo.
  }
  await getDesktopBridge()?.clearRefreshToken();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? null;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      // Sin sesión válida: RequireAuth redirige a /login conservando la ruta de origen.
      .addCase(refreshSession.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(loadMe.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const authReducer = authSlice.reducer;
