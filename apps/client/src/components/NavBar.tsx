import type { KeyboardEvent, ReactNode, SyntheticEvent } from 'react';
import { NavLink } from 'react-router';
import styles from './NavBar.module.css';
import { StatusStamp } from './StatusStamp';

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

const blockActivation = (event: SyntheticEvent) => event.preventDefault();

function blockKeyActivation(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
}

/**
 * Módulo sin implementar (contrato N3): se puede enfocar y se anuncia como enlace deshabilitado, pero no
 * tiene destino y ni el clic ni el teclado lo abren (FR-009).
 */
function NavBarPending({ item }: { item: NavBarItem }) {
  return (
    <li>
      <span
        role="link"
        aria-disabled="true"
        tabIndex={0}
        className={`${styles.item} ${styles.pending}`}
        onClick={blockActivation}
        onKeyDown={blockKeyActivation}
      >
        {item.icon}
        <span className={styles.label}>{item.label}</span>
        <span className={styles.stamp}>
          <StatusStamp tone="warning">Pendiente</StatusStamp>
        </span>
      </span>
    </li>
  );
}

function NavBarEntry({ item }: { item: NavBarItem }) {
  return item.pending ? <NavBarPending item={item} /> : <NavBarLink item={item} />;
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
          <NavBarEntry key={item.to} item={item} />
        ))}
      </ul>
      <ul className={`${styles.list} ${styles.bottom}`}>
        {bottom.map((item) => (
          <NavBarEntry key={item.to} item={item} />
        ))}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
}
