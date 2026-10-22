import type { AuthUser } from '@app/shared';
import { NavBar } from '../../../components/NavBar';
import { useAppSelector } from '../../../store/store';
import { isDesktop } from '../../../utils/desktop';
import { selectUser } from '../../auth/authSelectors';
import { LogoutButton } from '../../auth/components/LogoutButton';
import { CollapseIcon, LogoutIcon } from '../NavIcons';
import { buildNavItems } from '../navItems';
import { useNavCollapsed } from '../useNavCollapsed';
import styles from './AppNav.module.css';

/**
 * Pie del menú: quién soy, por qué canal y «Cerrar sesión» (FR-007, FR-008). Plegado deja solo «Cerrar
 * sesión» como icono, con su texto oculto visualmente para que conserve el nombre accesible (FR-013).
 */
function NavFooter({ user, collapsed }: { user: AuthUser; collapsed: boolean }) {
  const channel = isDesktop() ? 'Escritorio' : 'Web';
  return (
    <div className={collapsed ? `${styles.footer} ${styles.collapsed}` : styles.footer}>
      <span className={styles.name} title={user.name}>
        {user.name}
      </span>
      <span className={styles.role}>
        {user.roleName} · {channel}
      </span>
      <LogoutButton className={styles.logout}>
        <span className={styles.logoutIcon}>
          <LogoutIcon />
        </span>
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
