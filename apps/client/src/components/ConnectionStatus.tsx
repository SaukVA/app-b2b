import { Link } from 'react-router';
import styles from './ConnectionStatus.module.css';

export type ConnectionState = 'checking' | 'ok' | 'down' | 'unconfigured';

export interface ConnectionStatusProps {
  /** Qué se indica, p. ej. «Base de datos». */
  label: string;
  /** Destino de la conexión (sin credenciales); null si no hay ninguno. */
  value: string | null;
  state: ConnectionState;
  linkText: string;
  href: string;
}

const STATE_TEXT: Record<ConnectionState, string> = {
  checking: 'Comprobando…',
  ok: 'Conectado',
  down: 'Sin conexión',
  unconfigured: 'Sin configurar',
};

/** Indicador de conexión del login de escritorio: el estado va en texto además de en color (FR-005). */
export function ConnectionStatus({ label, value, state, linkText, href }: ConnectionStatusProps) {
  return (
    <div className={styles.status}>
      <span className={styles.target}>
        <span className={`${styles.dot} ${styles[state]}`} aria-hidden="true" />
        {label}:{value && <code className={styles.value}>{value}</code>}
        <span className={styles.state} role="status">
          {STATE_TEXT[state]}
        </span>
      </span>
      <Link to={href} className={styles.link}>
        {linkText}
      </Link>
    </div>
  );
}
