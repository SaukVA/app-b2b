import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  /** `error` se anuncia de inmediato (role="alert"); `info` de forma educada (role="status"). */
  variant?: 'error' | 'info';
  children: ReactNode;
}

function AlertIcon() {
  return (
    <svg
      className={styles.icon}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.01" />
    </svg>
  );
}

export function Alert({ variant = 'error', children }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`${styles.alert} ${styles[variant]}`}
    >
      <AlertIcon />
      <span>{children}</span>
    </div>
  );
}
