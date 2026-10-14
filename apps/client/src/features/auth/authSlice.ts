import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AuthUser, LoginRequest, LoginResponse } from '@app/shared';
import { isDesktop } from '../../utils/desktop';
import { fetchMe, loginRequest, toAuthErrorMessage } from './authApi';

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
      .addCase(loadMe.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const authReducer = authSlice.reducer;
