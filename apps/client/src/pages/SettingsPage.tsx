import { Navigate, Outlet } from 'react-router';
import { Tabs, type TabItem } from '../components/Tabs';
import { selectCan } from '../features/auth/authSelectors';
import { useAppSelector } from '../store/store';
import styles from './SettingsPage.module.css';

/**
 * Pestañas de Ajustes que el rol puede abrir. La fila «Ajustes» de la matriz cubre las pestañas de
 * administración (Base de datos y Usuarios); Apariencia (004) será para todos.
 */
function useSettingsTabs(): TabItem[] {
  const canManageUsers = useAppSelector(selectCan('ajustes', 'edit'));
  return canManageUsers ? [{ to: '/ajustes/usuarios', label: 'Usuarios' }] : [];
}

/** Índice de /ajustes: primera pestaña permitida (si no hay ninguna, SettingsPage ya lo indica). */
export function SettingsIndexRedirect() {
  const [first] = useSettingsTabs();
  return first ? <Navigate to={first.to} replace /> : null;
}

/** Layout de Ajustes: título, pestañas y la pestaña activa. */
export function SettingsPage() {
  const tabs = useSettingsTabs();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajustes</h1>
        <p className={styles.subtitle}>
          Preferencias de la aplicación, conexión de datos y acceso de usuarios.
        </p>
      </header>
      {tabs.length > 0 ? (
        <>
          <Tabs label="Secciones de ajustes" tabs={tabs} />
          <Outlet />
        </>
      ) : (
        <p className={styles.empty}>No hay ajustes disponibles para tu rol.</p>
      )}
    </main>
  );
}
