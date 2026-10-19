import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './OptionGroup.module.css';

export interface OptionGroupOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  /** Vista previa de la variante `cards` (p. ej. los colores de un tema). */
  preview?: ReactNode;
}

export interface OptionGroupProps<T extends string> {
  /** Nombre accesible del grupo; o bien `labelledBy` con el id de una etiqueta visible. */
  label?: string;
  labelledBy?: string;
  options: OptionGroupOption<T>[];
  value: T;
  /** Se llama también al pulsar la opción ya marcada (permite reintentar un guardado, 004 FR-004). */
  onChange: (value: T) => void;
  variant?: 'cards' | 'buttons';
}

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp'];

/** Paso de las flechas (+1, -1) o 0 si la tecla no mueve la selección. */
function arrowStep(key: string): number {
  if (NEXT_KEYS.includes(key)) return 1;
  return PREVIOUS_KEYS.includes(key) ? -1 : 0;
}

/**
 * Grupo de opciones excluyentes (radiogroup) de «Albarán»: tarjetas con vista previa o botones de 44 px.
 * Navegación por flechas con tabindex itinerante; la opción marcada también se indica como texto.
 */
export function OptionGroup<T extends string>({
  label,
  labelledBy,
  options,
  value,
  onChange,
  variant = 'buttons',
}: OptionGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const step = arrowStep(event.key);
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={styles[variant]}
    >
      {options.map((option, index) => (
        <OptionButton
          key={option.value}
          option={option}
          checked={option.value === value}
          variant={variant}
          buttonRef={(element) => {
            refs.current[index] = element;
          }}
          onSelect={() => onChange(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        />
      ))}
    </div>
  );
}

interface OptionButtonProps<T extends string> {
  option: OptionGroupOption<T>;
  checked: boolean;
  variant: 'cards' | 'buttons';
  buttonRef: (element: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

function OptionButton<T extends string>(props: OptionButtonProps<T>) {
  const { option, checked, variant } = props;
  return (
    <button
      ref={props.buttonRef}
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={checked ? 0 : -1}
      className={[styles.option, checked && styles.checked].filter(Boolean).join(' ')}
      onClick={props.onSelect}
      onKeyDown={props.onKeyDown}
    >
      {variant === 'cards' && option.preview}
      <span className={styles.text}>
        <span className={styles.label}>{option.label}</span>
        {option.description && <span className={styles.description}>{option.description}</span>}
      </span>
      {checked && <span className={styles.srOnly}>Seleccionado</span>}
    </button>
  );
}
