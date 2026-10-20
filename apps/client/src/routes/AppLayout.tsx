import { Outlet } from 'react-router';
import { AppNav } from '../features/navigation/components/AppNav';
import styles from './AppLayout.module.css';
import { RequireAuth } from './RequireAuth';

/** Pantallas con sesión: menú lateral y, a su derecha, la pantalla abierta (FR-001). */
export function AppLayout() {
  return (
    <RequireAuth>
      <div className={styles.layout}>
        <div className={styles.nav}>
          <AppNav />
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </RequireAuth>
  );
}
