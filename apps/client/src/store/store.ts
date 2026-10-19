import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { authReducer, refreshSession } from '../features/auth/authSlice';
import { databaseReducer } from '../features/database/databaseSlice';
import { rolesReducer } from '../features/roles/rolesSlice';
import { usersReducer } from '../features/users/usersSlice';
import { setAccessTokenGetter, setRefreshHandler } from '../utils/httpClient';

// Cada dominio registra aquí su slice (features/<dominio>/<dominio>Slice.ts).
const rootReducer = combineReducers({
  auth: authReducer,
  database: databaseReducer,
  roles: rolesReducer,
  users: usersReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/** Crea una store; los tests la usan con un estado precargado. */
export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

/** httpClient no importa la store (evita el ciclo store → slice → api → httpClient → store): se le inyecta. */
export function connectHttpClient(target: AppStore): void {
  setAccessTokenGetter(() => target.getState().auth.accessToken);
  setRefreshHandler(async () => (await target.dispatch(refreshSession()).unwrap()).accessToken);
}

export const store = setupStore();
connectHttpClient(store);

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
