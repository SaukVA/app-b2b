import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { CreateUserRequest, CreateUserResponse, UserSummary } from '@app/shared';
import { createUserRequest, toUsersErrorMessage } from './usersApi';

export interface UsersState {
  items: UserSummary[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Alta o cambio en curso: evita envíos duplicados. */
  saving: boolean;
}

const initialState: UsersState = { items: [], status: 'idle', error: null, saving: false };

/** Mismo orden que el listado del servidor (collation `es`: Á antes de B). */
function byName(a: UserSummary, b: UserSummary): number {
  return a.name.localeCompare(b.name, 'es');
}

export const createUser = createAsyncThunk<
  CreateUserResponse,
  CreateUserRequest,
  { rejectValue: string }
>('users/create', async (body, { rejectWithValue }) => {
  try {
    return await createUserRequest(body);
  } catch (err) {
    return rejectWithValue(toUsersErrorMessage(err));
  }
});

// Los thunks updateUser, loadUsers, setUserStatus y resetUserPassword llegan con cada historia.
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createUser.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [...state.items, action.payload.user].sort(byName);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload ?? null;
      });
  },
});

export const usersReducer = usersSlice.reducer;
