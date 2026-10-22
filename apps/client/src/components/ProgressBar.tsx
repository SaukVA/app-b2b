import styles from './ProgressBar.module.css';

export type ProgressTone = 'ok' | 'warning' | 'danger';

export interface ProgressBarProps {
  /** Porcentaje; el relleno se limita a 0–100, pero `aria-valuetext` anuncia el valor real. */
  value: number;
  /** Color del semáforo (docs/design/README.md › Sellos de estado). */
  tone: ProgressTone;
  /** Nombre accesible, p. ej. «Riesgo usado». */
  label: string;
}

const clamp = (value: number) => Math.min(Math.max(value, 0), 100);

/** Barra de progreso «Albarán» (stock / riesgo): 4 px, pista `surface2` y relleno del color del umbral. */
export function ProgressBar({ value, tone, label }: ProgressBarProps) {
  const filled = clamp(value);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={filled}
      aria-valuetext={`${value} %`}
      data-tone={tone}
      className={`${styles.track} ${styles[tone]}`}
    >
      <span className={styles.fill} style={{ width: `${filled}%` }} />
    </div>
  );
}
