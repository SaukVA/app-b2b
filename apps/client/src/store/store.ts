import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { authReducer } from '../features/auth/authSlice';
import { setAccessTokenGetter } from '../utils/httpClient';

// Cada dominio registra aquí su slice (features/<dominio>/<dominio>Slice.ts).
const rootReducer = combineReducers({
  auth: authReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/** Crea una store; los tests la usan con un estado precargado. */
export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export const store = setupStore();

// httpClient no importa la store (evita el ciclo store → slice → api → httpClient → store).
setAccessTokenGetter(() => store.getState().auth.accessToken);

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
