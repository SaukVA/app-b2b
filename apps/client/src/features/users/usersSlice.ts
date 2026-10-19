import { createAsyncThunk, createSlice, isPending, isRejected } from '@reduxjs/toolkit';
import type {
  AuthUser,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UserStatus,
  UserSummary,
} from '@app/shared';
import { getDesktopBridge } from '../../utils/desktop';
import { loadMe, sessionCleared } from '../auth/authSlice';
import {
  createUserRequest,
  fetchUsers,
  resetUserPasswordRequest,
  setUserStatusRequest,
  toUsersErrorMessage,
  updateUserRequest,
} from './usersApi';

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

export const loadUsers = createAsyncThunk<UserSummary[], void, { rejectValue: string }>(
  'users/load',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchUsers();
    } catch (err) {
      return rejectWithValue(toUsersErrorMessage(err));
    }
  },
);

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

/**
 * Si cambia el rol del usuario actual, se recarga su sesión al momento (research R1): sus permisos
 * (y si puede seguir en Ajustes) dependen del rol nuevo.
 */
export const updateUser = createAsyncThunk<
  UserSummary,
  { id: string; body: UpdateUserRequest },
  { rejectValue: string; state: { auth: { user: AuthUser | null } } }
>('users/update', async ({ id, body }, { dispatch, getState, rejectWithValue }) => {
  try {
    const user = await updateUserRequest(id, body);
    if (body.role !== undefined && getState().auth.user?.id === id) await dispatch(loadMe());
    return user;
  } catch (err) {
    return rejectWithValue(toUsersErrorMessage(err));
  }
});

export const setUserStatus = createAsyncThunk<
  UserSummary,
  { id: string; status: UserStatus },
  { rejectValue: string }
>('users/setStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await setUserStatusRequest(id, status);
  } catch (err) {
    return rejectWithValue(toUsersErrorMessage(err));
  }
});

/**
 * Restablece la contraseña (US5). Si el afectado es el usuario actual, el servidor ya ha cerrado su
 * sesión: se limpia también la local (y el refresh token de escritorio) y `signedOut` avisa a la página
 * para que lleve al login.
 */
export const resetUserPassword = createAsyncThunk<
  { signedOut: boolean },
  { id: string; password: string },
  { rejectValue: string; state: { auth: { user: AuthUser | null } } }
>('users/resetPassword', async ({ id, password }, { dispatch, getState, rejectWithValue }) => {
  try {
    await resetUserPasswordRequest(id, password);
  } catch (err) {
    return rejectWithValue(toUsersErrorMessage(err));
  }
  if (getState().auth.user?.id !== id) return { signedOut: false };
  await getDesktopBridge()?.clearRefreshToken();
  dispatch(sessionCleared());
  return { signedOut: true };
});

function replaceItem(items: UserSummary[], user: UserSummary): UserSummary[] {
  return items.map((item) => (item.id === user.id ? user : item)).sort(byName);
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(loadUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.saving = false;
        state.items = [...state.items, action.payload.user].sort(byName);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.saving = false;
        state.items = replaceItem(state.items, action.payload);
      })
      .addCase(setUserStatus.fulfilled, (state, action) => {
        state.items = replaceItem(state.items, action.payload);
      })
      // Alta y edición comparten `saving` (evita envíos duplicados) y el mensaje de error.
      .addMatcher(isPending(createUser, updateUser), (state) => {
        state.saving = true;
        state.error = null;
      })
      .addMatcher(isRejected(createUser, updateUser), (state, action) => {
        state.saving = false;
        state.error = action.payload ?? null;
      });
  },
});

export const usersReducer = usersSlice.reducer;
