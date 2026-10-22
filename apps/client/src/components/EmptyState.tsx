import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  children: ReactNode;
}

/**
 * Aviso de «sin datos» dentro de un panel. Se anuncia de forma educada al aparecer (role="status") y se
 * entiende por su texto, sin color de estado (docs/design/README.md › EmptyState).
 */
export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div role="status" className={styles.empty}>
      <p className={styles.title}>{title}</p>
      <p className={styles.text}>{children}</p>
    </div>
  );
}
