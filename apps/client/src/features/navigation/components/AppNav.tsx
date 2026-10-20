import { BrandMark } from '../../../components/BrandMark';
import { NavBar } from '../../../components/NavBar';
import { useAppSelector } from '../../../store/store';
import { selectUser } from '../../auth/authSelectors';
import { buildNavItems } from '../navItems';

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
    />
  );
}
