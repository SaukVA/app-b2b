import type { InputHTMLAttributes } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/** Casilla con la etiqueta como objetivo táctil de al menos 44 px. */
export function Checkbox({ label, className, ...inputProps }: CheckboxProps) {
  return (
    <label className={[styles.checkbox, className].filter(Boolean).join(' ')}>
      <input type="checkbox" className={styles.input} {...inputProps} />
      {label}
    </label>
  );
}
