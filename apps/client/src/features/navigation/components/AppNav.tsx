import type { AuthUser } from '@app/shared';
import { BrandMark } from '../../../components/BrandMark';
import { NavBar } from '../../../components/NavBar';
import { useAppSelector } from '../../../store/store';
import { isDesktop } from '../../../utils/desktop';
import { selectUser } from '../../auth/authSelectors';
import { LogoutButton } from '../../auth/components/LogoutButton';
import { buildNavItems } from '../navItems';
import styles from './AppNav.module.css';

/** Pie del menú: quién soy, por qué canal y «Cerrar sesión» (FR-007, FR-008). */
function NavFooter({ user }: { user: AuthUser }) {
  const channel = isDesktop() ? 'Escritorio' : 'Web';
  return (
    <div className={styles.footer}>
      <span className={styles.name} title={user.name}>
        {user.name}
      </span>
      <span className={styles.role}>
        {user.roleName} · {channel}
      </span>
      <LogoutButton className={styles.logout} />
    </div>
  );
}

/**
 * Menú principal de la aplicación: los módulos del rol de la sesión. Lee los permisos del usuario en cada
 * render, así que un cambio de rol traído por la renovación de la sesión se ve sin recargar (FR-005).
 */
export function AppNav() {
  const user = useAppSelector(selectUser);
  if (!user) return null;
  return (
    <NavBar
      label="Principal"
      brand={<BrandMark name="Venta a mayoristas" />}
      items={buildNavItems(user.permissions)}
      footer={<NavFooter user={user} />}
    />
  );
}
