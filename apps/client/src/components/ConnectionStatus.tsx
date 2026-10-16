import { Link } from 'react-router';
import styles from './ServerStatus.module.css';

export interface ServerStatusProps {
  url: string;
  /** `null` mientras se comprueba la conexión. */
  reachable: boolean | null;
  settingsHref: string;
}

const STATUS_TEXT = { checking: 'Comprobando…', ok: 'Conectado', down: 'Sin conexión' } as const;

function statusKey(reachable: boolean | null): keyof typeof STATUS_TEXT {
  if (reachable === null) return 'checking';
  return reachable ? 'ok' : 'down';
}

/** Indicador de servidor del login de escritorio: el estado va en texto además de en color (FR-018). */
export function ServerStatus({ url, reachable, settingsHref }: ServerStatusProps) {
  const status = statusKey(reachable);
  return (
    <div className={styles.status}>
      <span className={styles.server}>
        <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
        Servidor: <code className={styles.url}>{url}</code>
        <span className={styles.state} role="status">
          {STATUS_TEXT[status]}
        </span>
      </span>
      <Link to={settingsHref} className={styles.link}>
        Cambiar servidor
      </Link>
    </div>
  );
}
