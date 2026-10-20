import { NavLink } from 'react-router';
import styles from './Tabs.module.css';

export interface TabItem {
  to: string;
  label: string;
}

export interface TabsProps {
  /** Nombre accesible de la navegación. */
  label: string;
  tabs: readonly TabItem[];
}

/** Pestañas de navegación (enlaces); NavLink marca la activa con aria-current="page". */
export function Tabs({ label, tabs }: TabsProps) {
  return (
    <nav aria-label={label} className={styles.tabs}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
