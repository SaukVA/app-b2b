import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { refreshSession } from './features/auth/authSlice';
import { sessionRestored } from './features/preferences/preferencesSlice';
import { useApplyAppearance } from './features/preferences/useApplyAppearance';
import { AppRouter } from './routes/AppRouter';
import { store, useAppDispatch } from './store/store';

/** Intenta restaurar la sesión con el refresh token antes de pintar las rutas protegidas (FR-010). */
function SessionRestore({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    void dispatch(refreshSession())
      .then((result) => {
        const user = refreshSession.fulfilled.match(result) ? result.payload.user : null;
        dispatch(sessionRestored(user));
      })
      .finally(() => setRestored(true));
  }, [dispatch]);
  return restored ? children : null;
}

/** Aplica tema y densidad en <html>; va por encima de las rutas para actuar en el mismo commit (004). */
function AppearanceRoot({ children }: { children: ReactNode }) {
  useApplyAppearance();
  return children;
}

export function App() {
  return (
    <Provider store={store}>
      <AppearanceRoot>
        <SessionRestore>
          <AppRouter />
        </SessionRestore>
      </AppearanceRoot>
    </Provider>
  );
}
