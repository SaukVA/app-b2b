import { useId, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react';
import { NavLink } from 'react-router';
import { IconButton } from './IconButton';
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
  /** Marca del menú plegado: solo el logotipo. */
  brandCollapsed?: ReactNode;
  items: NavBarItem[];
  /** Datos del usuario y «Cerrar sesión». */
  footer?: ReactNode;
  collapsed?: boolean;
  /** Sin él no se pinta el botón de plegar (contrato N5). */
  onToggleCollapsed?: () => void;
  /** Icono del botón de plegar. */
  toggleIcon?: ReactNode;
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
        <span className={styles.icon}>
          {item.icon}
          <span className={styles.dot} aria-hidden="true" />
        </span>
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

interface NavBarToggleProps {
  navId: string;
  collapsed: boolean;
  icon: ReactNode;
  onToggle: () => void;
}

/** Botón de plegar (contrato N5): no aparece por debajo de 760 px. */
function NavBarToggle({ navId, collapsed, icon, onToggle }: NavBarToggleProps) {
  return (
    <IconButton
      aria-label={collapsed ? 'Desplegar menú' : 'Plegar menú'}
      aria-expanded={!collapsed}
      aria-controls={navId}
      icon={icon}
      className={styles.toggle}
      onClick={onToggle}
    />
  );
}

function NavBarList({ items, className }: { items: NavBarItem[]; className: string }) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <NavBarEntry key={item.to} item={item} />
      ))}
    </ul>
  );
}

/**
 * Barra lateral de «Albarán» (contrato navigation-ui.md §1). Genérica: recibe los elementos ya filtrados
 * y no sabe nada de permisos. Plegada, las etiquetas se ocultan solo visualmente (contrato N4).
 */
export function NavBar(props: NavBarProps) {
  const {
    label,
    brand,
    brandCollapsed,
    items,
    footer,
    collapsed = false,
    onToggleCollapsed,
  } = props;
  const navId = useId();
  const showCollapsed = collapsed && brandCollapsed !== undefined;
  return (
    <nav
      id={navId}
      aria-label={label}
      className={collapsed ? `${styles.nav} ${styles.collapsed}` : styles.nav}
    >
      <div className={styles.brand}>{showCollapsed ? brandCollapsed : brand}</div>
      <NavBarList
        items={items.filter((item) => item.section !== 'footer')}
        className={styles.list}
      />
      <NavBarList
        items={items.filter((item) => item.section === 'footer')}
        className={`${styles.list} ${styles.bottom}`}
      />
      {onToggleCollapsed && (
        <NavBarToggle
          navId={navId}
          collapsed={collapsed}
          icon={props.toggleIcon}
          onToggle={onToggleCollapsed}
        />
      )}
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
}
