import styles from './BrandMark.module.css';

export interface BrandMarkProps {
  name?: string;
  subtitle?: string;
  /** `lg` = 40 px (login); `md` = 36 px (barra lateral). */
  size?: 'md' | 'lg';
}

/** Logotipo provisional «Albarán»: cuadrado de acento con la inicial «M». */
export function BrandMark({ name, subtitle, size = 'md' }: BrandMarkProps) {
  return (
    <div className={styles.brand}>
      <span className={`${styles.logo} ${styles[size]}`} aria-hidden={Boolean(name)}>
        M
      </span>
      {name && (
        <span className={styles.text}>
          <span className={styles.name}>{name}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
      )}
    </div>
  );
}
