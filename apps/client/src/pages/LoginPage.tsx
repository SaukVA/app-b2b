import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ConnectionStatus, type ConnectionState } from '../components/ConnectionStatus';
import { selectIsAuthenticated, selectUser } from '../features/auth/authSelectors';
import { LoginForm } from '../features/auth/components/LoginForm';
import { LoginHero } from '../features/auth/components/LoginHero';
import { loadDatabaseSummary, type DatabaseSliceState } from '../features/database/databaseSlice';
import { resolveHomeRoute } from '../routes/homeRoute';
import { useAppDispatch, useAppSelector } from '../store/store';
import { isDesktop } from '../utils/desktop';
import styles from './LoginPage.module.css';

/** Pantalla de configuración de la base de datos: pública y solo en escritorio (FR-007). */
export const DATABASE_SETTINGS_PATH = '/ajustes/base-de-datos';

const INDICATOR_STATE: Record<DatabaseSliceState['state'], ConnectionState> = {
  checking: 'checking',
  connected: 'ok',
  disconnected: 'down',
  unconfigured: 'unconfigured',
};

/** Solo en escritorio: servidor de la base de datos y su estado (FR-005); en web no se pinta (FR-008). */
function DatabaseIndicator() {
  const dispatch = useAppDispatch();
  const { summary, state } = useAppSelector((root) => root.database);
  useEffect(() => {
    void dispatch(loadDatabaseSummary());
  }, [dispatch]);
  if (!summary) return null;
  return (
    <ConnectionStatus
      label="Base de datos"
      value={summary.host}
      state={summary.configured ? INDICATOR_STATE[state] : 'unconfigured'}
      linkText={summary.configured ? 'Cambiar base de datos' : 'Configurar base de datos'}
      href={DATABASE_SETTINGS_PATH}
    />
  );
}

/** Pantalla «Login» del diseño «Albarán»: hero + formulario. Con sesión, lleva a su pantalla de inicio. */
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const from = (useLocation().state as { from?: string } | null)?.from ?? null;
  if (isAuthenticated && user) return <Navigate to={resolveHomeRoute(user, from)} replace />;
  return (
    <div className={styles.page}>
      <LoginHero />
      <main className={styles.main}>
        <div className={styles.column}>
          <LoginForm />
          {isDesktop() && <DatabaseIndicator />}
        </div>
      </main>
    </div>
  );
}
