import type { ReactNode } from 'react';
import styles from './StatusStamp.module.css';

export type StatusTone = 'ok' | 'danger' | 'warning' | 'neutral';

export interface StatusStampProps {
  tone?: StatusTone;
  /** Texto del estado: siempre visible, el color nunca es la única señal. */
  children: ReactNode;
}

/** Sello de estado «Albarán»: Plex Mono en mayúsculas con marcador cuadrado del color del texto. */
export function StatusStamp({ tone = 'neutral', children }: StatusStampProps) {
  return (
    <span className={`${styles.stamp} ${styles[tone]}`} data-tone={tone}>
      <span className={styles.marker} aria-hidden="true" />
      {children}
    </span>
  );
}
