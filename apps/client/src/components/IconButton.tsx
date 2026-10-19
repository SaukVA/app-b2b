import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: es el único nombre accesible del botón. */
  'aria-label': string;
  icon: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** Botón de solo icono con objetivo táctil de 44 px. */
export function IconButton({ icon, type = 'button', className, ref, ...rest }: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={[styles.iconButton, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </button>
  );
}
