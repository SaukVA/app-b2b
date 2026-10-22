import type { AuthUser } from '@app/shared';
import { NavBar } from '../../../components/NavBar';
import { useAppSelector } from '../../../store/store';
import { isDesktop } from '../../../utils/desktop';
import { selectUser } from '../../auth/authSelectors';
import { LogoutButton } from '../../auth/components/LogoutButton';
import { CollapseIcon, LogoutIcon, PersonIcon } from '../NavIcons';
import { buildNavItems } from '../navItems';
import { useNavCollapsed } from '../useNavCollapsed';
import styles from './AppNav.module.css';

/** Nombre y «rol · canal», recortados con puntos suspensivos y con el texto completo en title (008 FR-006). */
function NavUser({ user }: { user: AuthUser }) {
  const roleLine = `${user.roleName} · ${isDesktop() ? 'Escritorio' : 'Web'}`;
  return (
    <span className={styles.who}>
      <span className={styles.name} title={user.name}>
        {user.name}
      </span>
      <span className={styles.role} title={roleLine}>
        {roleLine}
      </span>
    </span>
  );
}

/**
 * Pie del menú en una fila (008 US2): avatar, quién soy y «Cerrar sesión» como icono de 44×44. El texto
 * del botón está oculto visualmente para que conserve el nombre accesible; plegado flota con el foco.
 */
function NavFooter({ user, collapsed }: { user: AuthUser; collapsed: boolean }) {
  return (
    <div className={collapsed ? `${styles.footer} ${styles.collapsed}` : styles.footer}>
      <span className={styles.avatar} aria-hidden="true">
        <PersonIcon />
      </span>
      <NavUser user={user} />
      <LogoutButton className={styles.logout} title="Cerrar sesión">
        <LogoutIcon />
        <span className={styles.logoutLabel}>Cerrar sesión</span>
      </LogoutButton>
    </div>
  );
}

/**
 * Menú principal de la aplicación: los módulos del rol de la sesión. Lee los permisos del usuario en cada
 * render, así que un cambio de rol traído por la renovación de la sesión se ve sin recargar (FR-005).
 */
export function AppNav() {
  const user = useAppSelector(selectUser);
  const { collapsed, toggle } = useNavCollapsed();
  if (!user) return null;
  return (
    <NavBar
      label="Principal"
      items={buildNavItems(user.permissions)}
      footer={<NavFooter user={user} collapsed={collapsed} />}
      collapsed={collapsed}
      onToggleCollapsed={toggle}
      toggleIcon={<CollapseIcon collapsed={collapsed} />}
    />
  );
}
