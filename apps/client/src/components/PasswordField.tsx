import { useState } from 'react';
import styles from './PasswordField.module.css';
import { TextField, type TextFieldProps } from './TextField';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'endAdornment'>;

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Campo de contraseña con botón de 44×44 para mostrarla u ocultarla (FR-025). */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const toggle = (
    <button
      type="button"
      className={styles.toggle}
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={visible}
      onClick={() => setVisible((value) => !value)}
    >
      <EyeIcon />
    </button>
  );
  return <TextField {...props} type={visible ? 'text' : 'password'} endAdornment={toggle} />;
}
