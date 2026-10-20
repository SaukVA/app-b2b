import type { MoneyFormat } from '@app/shared';
import { formatMoney } from '../utils/money';
import styles from './Money.module.css';

export interface MoneyProps {
  value: number;
  format: MoneyFormat;
}

/**
 * Importe monetario con cifras tabulares (IBM Plex Mono). Genérico: recibe el formato por prop
 * (constitución VIII); las pantallas usan UserMoney, que pasa el del usuario.
 */
export function Money({ value, format }: MoneyProps) {
  return <span className={styles.money}>{formatMoney(value, format)}</span>;
}
