import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RoleSummary } from '@app/shared';
import { toAuthErrorMessage } from '../auth/authApi';
import { fetchRoles } from './rolesApi';

export interface RolesState {
  items: RoleSummary[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: RolesState = { items: [], status: 'idle', error: null };

export const loadRoles = createAsyncThunk<RoleSummary[], void, { rejectValue: string }>(
  'roles/load',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchRoles();
    } catch (err) {
      return rejectWithValue(toAuthErrorMessage(err));
    }
  },
);

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadRoles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadRoles.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = 'succeeded';
      })
      .addCase(loadRoles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? null;
      });
  },
});

export const rolesReducer = rolesSlice.reducer;
