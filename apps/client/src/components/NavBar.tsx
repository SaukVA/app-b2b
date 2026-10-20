import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import styles from './NavBar.module.css';

export interface NavBarItem {
  /** Destino; se ignora si `pending`. */
  to: string;
  /** Texto visible y nombre accesible. */
  label: string;
  /** SVG de 18 px con `aria-hidden`. */
  icon: ReactNode;
  /** Muestra «Pendiente» y no navega. */
  pending?: boolean;
  /** `footer` va separado al final (Ajustes). */
  section?: 'main' | 'footer';
}

export interface NavBarProps {
  /** `aria-label` del `<nav>`, p. ej. «Principal». */
  label: string;
  brand: ReactNode;
  items: NavBarItem[];
  /** Datos del usuario y «Cerrar sesión». */
  footer?: ReactNode;
}

function NavBarLink({ item }: { item: NavBarItem }) {
  return (
    <li>
      <NavLink to={item.to} className={styles.item}>
        {item.icon}
        <span className={styles.label}>{item.label}</span>
      </NavLink>
    </li>
  );
}

/**
 * Barra lateral de «Albarán» (contrato navigation-ui.md §1). Genérica: recibe los elementos ya filtrados
 * y no sabe nada de permisos.
 */
export function NavBar({ label, brand, items, footer }: NavBarProps) {
  const main = items.filter((item) => item.section !== 'footer');
  const bottom = items.filter((item) => item.section === 'footer');
  return (
    <nav aria-label={label} className={styles.nav}>
      <div className={styles.brand}>{brand}</div>
      <ul className={styles.list}>
        {main.map((item) => (
          <NavBarLink key={item.to} item={item} />
        ))}
      </ul>
      <ul className={`${styles.list} ${styles.bottom}`}>
        {bottom.map((item) => (
          <NavBarLink key={item.to} item={item} />
        ))}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
}
