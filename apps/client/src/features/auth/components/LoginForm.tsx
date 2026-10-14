import { useState, type FormEvent } from 'react';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Checkbox } from '../../../components/Checkbox';
import { PasswordField } from '../../../components/PasswordField';
import { TextField } from '../../../components/TextField';
import { useAppDispatch, useAppSelector } from '../../../store/store';
import { CONNECTION_ERROR_MESSAGE } from '../authApi';
import { selectAuthError, selectAuthStatus } from '../authSelectors';
import { login } from '../authSlice';
import styles from './LoginForm.module.css';

interface FieldErrors {
  login?: string;
  password?: string;
}

const FORGOT_PASSWORD_MESSAGE = 'Contacta con un administrador para restablecer tu contraseña.';

function validateFields(loginValue: string, password: string): FieldErrors {
  return {
    login: loginValue.trim() ? undefined : 'Introduce tu email',
    password: password ? undefined : 'Introduce tu contraseña',
  };
}

function useLoginForm() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);
  const [values, setValues] = useState({ login: '', password: '', persistent: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showForgot, setShowForgot] = useState(false);
  const loading = status === 'loading';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const errors = validateFields(values.login, values.password);
    setFieldErrors(errors);
    if (errors.login || errors.password) return;
    void dispatch(login(values));
  };
  const update = (patch: Partial<typeof values>) => setValues((current) => ({ ...current, ...patch }));
  return { values, update, fieldErrors, showForgot, setShowForgot, loading, submit };
}

function LoginHeader() {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>Iniciar sesión</h2>
      <span className={styles.subtitle}>Accede con tu cuenta de empresa.</span>
    </div>
  );
}

export function LoginForm() {
  const form = useLoginForm();
  const serverError = useAppSelector(selectAuthError);
  const credentialsInvalid = Boolean(serverError) && serverError !== CONNECTION_ERROR_MESSAGE;
  const forgotLink = (
    <button type="button" className={styles.forgot} onClick={() => form.setShowForgot(true)}>
      ¿La has olvidado?
    </button>
  );
  return (
    <form className={styles.form} onSubmit={form.submit} noValidate>
      <LoginHeader />
      {serverError && <Alert>{serverError}</Alert>}
      {form.showForgot && <Alert variant="info">{FORGOT_PASSWORD_MESSAGE}</Alert>}
      <TextField
        label="Email" type="text" inputMode="email" autoComplete="username" controlSize="lg"
        placeholder="nombre@empresa.es" value={form.values.login} error={form.fieldErrors.login}
        invalid={credentialsInvalid} onChange={(event) => form.update({ login: event.target.value })}
      />
      <PasswordField
        label="Contraseña" autoComplete="current-password" controlSize="lg" labelAction={forgotLink}
        value={form.values.password} error={form.fieldErrors.password} invalid={credentialsInvalid}
        onChange={(event) => form.update({ password: event.target.value })}
      />
      <Checkbox
        label="Mantener la sesión iniciada en este equipo" checked={form.values.persistent}
        onChange={(event) => form.update({ persistent: event.target.checked })}
      />
      <Button type="submit" size="lg" fullWidth disabled={form.loading} aria-busy={form.loading}>
        Entrar
      </Button>
    </form>
  );
}
