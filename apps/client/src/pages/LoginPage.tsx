import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ServerStatus } from '../components/ServerStatus';
import { selectIsAuthenticated, selectUser } from '../features/auth/authSelectors';
import { LoginForm } from '../features/auth/components/LoginForm';
import { LoginHero } from '../features/auth/components/LoginHero';
import { resolveHomeRoute } from '../routes/homeRoute';
import { useAppSelector } from '../store/store';
import { getDesktopBridge } from '../utils/desktop';
import styles from './LoginPage.module.css';

export const SERVER_SETTINGS_PATH = '/ajustes/servidor';

interface ServerInfo {
  url: string;
  reachable: boolean | null;
}

/** Solo en escritorio: URL configurada y estado real de la conexión (FR-018); en web, null (FR-019). */
function useServerInfo(): ServerInfo | null {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;
    let active = true;
    void bridge.getServerUrl().then((url) => {
      if (active) setInfo({ url, reachable: null });
      return bridge.checkServer().then(({ reachable }) => active && setInfo({ url, reachable }));
    });
    return () => {
      active = false;
    };
  }, []);
  return info;
}

/** Pantalla «Login» del diseño «Albarán»: hero + formulario. Con sesión, lleva a su pantalla de inicio. */
export function LoginPage() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const from = (useLocation().state as { from?: string } | null)?.from ?? null;
  const server = useServerInfo();
  if (isAuthenticated && user) return <Navigate to={resolveHomeRoute(user, from)} replace />;
  return (
    <div className={styles.page}>
      <LoginHero />
      <main className={styles.main}>
        <div className={styles.column}>
          <LoginForm />
          {server && <ServerStatus {...server} settingsHref={SERVER_SETTINGS_PATH} />}
        </div>
      </main>
    </div>
  );
}
