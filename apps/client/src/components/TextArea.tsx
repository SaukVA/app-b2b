import { useId, type TextareaHTMLAttributes } from 'react';
import fieldStyles from './TextField.module.css';
import styles from './TextArea.module.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Mensaje bajo el campo; también marca el campo como no válido. */
  error?: string;
}

/** Área de texto con la misma etiqueta, error y estilos que `TextField` (p. ej. «Observaciones»). */
export function TextArea({ label, error, id, className, ...textareaProps }: TextAreaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;
  return (
    <div className={fieldStyles.field}>
      <label htmlFor={textareaId} className={fieldStyles.label}>
        {label}
      </label>
      <textarea
        id={textareaId}
        className={[styles.textarea, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...textareaProps}
      />
      {error && (
        <span id={errorId} className={fieldStyles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
