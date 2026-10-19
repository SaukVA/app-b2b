import { createSlice } from '@reduxjs/toolkit';
import type { UserSummary } from '@app/shared';

export interface UsersState {
  items: UserSummary[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  /** Alta o cambio en curso: evita envíos duplicados. */
  saving: boolean;
}

const initialState: UsersState = { items: [], status: 'idle', error: null, saving: false };

// Los thunks (createUser, updateUser, loadUsers, setUserStatus, resetUserPassword) llegan con cada historia.
const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
});

export const usersReducer = usersSlice.reducer;
