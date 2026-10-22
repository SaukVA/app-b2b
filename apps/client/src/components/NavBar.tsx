import { useId, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react';
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
  items: NavBarItem[];
  /** Datos del usuario y «Cerrar sesión». */
  footer?: ReactNode;
  collapsed?: boolean;
  /** Sin él no se pinta el elemento de plegar (contrato 008 N5′). */
  onToggleCollapsed?: () => void;
  /** Icono del elemento de plegar. */
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

/**
 * Plegar o desplegar (contrato 008 N5′): un elemento más de la lista, bajo Ajustes, con su texto como
 * nombre accesible. No aparece por debajo de 760 px.
 */
function NavBarToggleItem({ navId, collapsed, icon, onToggle }: NavBarToggleProps) {
  const text = collapsed ? 'Desplegar menú' : 'Plegar menú';
  return (
    <li className={styles.toggleItem}>
      <button
        type="button"
        className={`${styles.item} ${styles.muted}`}
        aria-expanded={!collapsed}
        aria-controls={navId}
        title={text}
        onClick={onToggle}
      >
        <span className={styles.toggleIcon}>{icon}</span>
        <span className={styles.label}>{text}</span>
      </button>
    </li>
  );
}

interface NavBarListProps {
  items: NavBarItem[];
  className: string;
  /** Elemento extra al final de la lista (el de plegar). */
  children?: ReactNode;
}

function NavBarList({ items, className, children }: NavBarListProps) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <NavBarEntry key={item.to} item={item} />
      ))}
      {children}
    </ul>
  );
}

/**
 * Barra lateral de «Albarán» (contratos navigation-ui.md de 005 §1 y 008 §1). Genérica: recibe los
 * elementos ya filtrados y no sabe nada de permisos. Sin marca (008, FR-001). Plegada, las etiquetas se
 * ocultan solo visualmente (contrato N4′).
 */
export function NavBar(props: NavBarProps) {
  const { label, items, footer, collapsed = false, onToggleCollapsed } = props;
  const navId = useId();
  return (
    <nav
      id={navId}
      aria-label={label}
      className={collapsed ? `${styles.nav} ${styles.collapsed}` : styles.nav}
    >
      <NavBarList
        items={items.filter((item) => item.section !== 'footer')}
        className={styles.list}
      />
      <NavBarList
        items={items.filter((item) => item.section === 'footer')}
        className={`${styles.list} ${styles.bottom}`}
      >
        {onToggleCollapsed && (
          <NavBarToggleItem
            navId={navId}
            collapsed={collapsed}
            icon={props.toggleIcon}
            onToggle={onToggleCollapsed}
          />
        )}
      </NavBarList>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
}
