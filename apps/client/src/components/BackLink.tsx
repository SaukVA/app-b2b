import type { ReactNode } from 'react';
import { Link, type To } from 'react-router';
import styles from './BackLink.module.css';

export interface BackLinkProps {
  /** Destino, con su query (p. ej. el listado con los mismos criterios). */
  to: To;
  /** Nombre accesible completo («Volver al listado de proveedores»). */
  label: string;
  /** Texto visible junto a la flecha («Proveedores»). */
  children: ReactNode;
  state?: unknown;
}

/** Flecha de retorno de «Albarán»: enlace con flecha y texto, objetivo táctil de 44 px (010 FR-014). */
export function BackLink({ to, label, children, state }: BackLinkProps) {
  return (
    <Link to={to} state={state} aria-label={label} className={styles.backLink}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}
