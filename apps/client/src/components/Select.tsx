import { useId, type SelectHTMLAttributes } from 'react';
// Etiqueta, contenedor y error comparten estilo con TextField: no se duplican (constitución VIII).
import fieldStyles from './TextField.module.css';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
  /** Mensaje bajo el campo; también marca el campo como no válido. */
  error?: string;
}

export function Select({ label, options, error, id, className, ...selectProps }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  return (
    <div className={fieldStyles.field}>
      <label htmlFor={selectId} className={fieldStyles.label}>
        {label}
      </label>
      <select
        id={selectId}
        className={[styles.select, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className={fieldStyles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
