import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './TextField.module.css';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Mensaje bajo el campo; también marca el campo como no válido. */
  error?: string;
  /** Marca el campo como no válido sin mensaje propio (p. ej. error mostrado en un Alert). */
  invalid?: boolean;
  /** Elemento a la derecha de la etiqueta (p. ej. "¿La has olvidado?"). */
  labelAction?: ReactNode;
  /** Elemento superpuesto a la derecha del input (p. ej. botón de mostrar contraseña). */
  endAdornment?: ReactNode;
  controlSize?: 'md' | 'lg';
}

export function TextField({
  label,
  error,
  invalid = false,
  labelAction,
  endAdornment,
  controlSize = 'md',
  id,
  className,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isInvalid = invalid || Boolean(error);
  const inputClasses = [styles.input, styles[controlSize], endAdornment && styles.withAdornment, className];
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>{label}</label>
        {labelAction}
      </div>
      <div className={styles.control}>
        <input
          id={inputId}
          className={inputClasses.filter(Boolean).join(' ')}
          aria-invalid={isInvalid || undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {endAdornment && <div className={styles.adornment}>{endAdornment}</div>}
      </div>
      {error && <span id={errorId} className={styles.error}>{error}</span>}
    </div>
  );
}
