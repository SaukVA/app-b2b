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

function FieldLabel({
  htmlFor,
  label,
  action,
}: {
  htmlFor: string;
  label: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.labelRow}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {action}
    </div>
  );
}

function inputClassName(size: 'md' | 'lg', withAdornment: boolean, extra?: string): string {
  return [styles.input, styles[size], withAdornment && styles.withAdornment, extra]
    .filter(Boolean)
    .join(' ');
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
  return (
    <div className={styles.field}>
      <FieldLabel htmlFor={inputId} label={label} action={labelAction} />
      <div className={styles.control}>
        <input
          id={inputId}
          className={inputClassName(controlSize, Boolean(endAdornment), className)}
          aria-invalid={isInvalid || undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {endAdornment && <div className={styles.adornment}>{endAdornment}</div>}
      </div>
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
