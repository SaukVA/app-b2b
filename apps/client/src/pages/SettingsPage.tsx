import { Navigate, Outlet } from 'react-router';
import { Tabs, type TabItem } from '../components/Tabs';
import { selectCan } from '../features/auth/authSelectors';
import { useAppSelector } from '../store/store';
import styles from './SettingsPage.module.css';

const APPEARANCE_TAB: TabItem = { to: '/ajustes/apariencia', label: 'Apariencia' };
const USERS_TAB: TabItem = { to: '/ajustes/usuarios', label: 'Usuarios' };

/**
 * Pestañas de Ajustes que el rol puede abrir. Apariencia es para todos (004, FR-001); la fila «Ajustes»
 * de la matriz cubre la pestaña de Usuarios.
 */
function useSettingsTabs(): TabItem[] {
  const canManageUsers = useAppSelector(selectCan('ajustes', 'edit'));
  return canManageUsers ? [APPEARANCE_TAB, USERS_TAB] : [APPEARANCE_TAB];
}

/** Índice de /ajustes: la primera pestaña, Apariencia. */
export function SettingsIndexRedirect() {
  const [first] = useSettingsTabs();
  return <Navigate to={first.to} replace />;
}

/** Layout de Ajustes: título, pestañas y la pestaña activa. */
export function SettingsPage() {
  const tabs = useSettingsTabs();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajustes</h1>
        <p className={styles.subtitle}>Preferencias de la aplicación y acceso de usuarios.</p>
      </header>
      <Tabs label="Secciones de ajustes" tabs={tabs} />
      {/* Sin permiso, el RequireAuth de cada pestaña es quien redirige (quickstart §3.4 de 003). */}
      <Outlet />
    </main>
  );
}
