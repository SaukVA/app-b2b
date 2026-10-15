import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { refreshSession } from './features/auth/authSlice';
import { AppRouter } from './routes/AppRouter';
import { store, useAppDispatch } from './store/store';

/** Intenta restaurar la sesión con el refresh token antes de pintar las rutas protegidas (FR-010). */
function SessionRestore({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    void dispatch(refreshSession()).finally(() => setRestored(true));
  }, [dispatch]);
  return restored ? children : null;
}

export function App() {
  return (
    <Provider store={store}>
      <SessionRestore>
        <AppRouter />
      </SessionRestore>
    </Provider>
  );
}
