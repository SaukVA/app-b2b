import { useId, useState, type FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH } from '@app/shared';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { PasswordField } from '../../../components/PasswordField';
import styles from './UserForm.module.css';

export interface ResetPasswordDialogProps {
  userName: string;
  /** Envía la contraseña nueva; quien monta el diálogo decide cerrarlo al terminar. */
  onSubmit: (password: string) => Promise<void>;
  onClose: () => void;
  /** Error del servidor (envelope), mostrado en un Alert dentro del diálogo. */
  error?: string | null;
}

const PASSWORD_HINT = 'Mínimo 8 caracteres.';

function notice(userName: string): string {
  return `Pon una contraseña nueva a ${userName} y comunícasela por tu cuenta. Sus sesiones abiertas se cerrarán y la contraseña anterior dejará de servir.`;
}

function useResetForm(onSubmit: (password: string) => Promise<void>) {
  const [password, setPassword] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const tooShort = password.length < MIN_PASSWORD_LENGTH;
    setInvalid(tooShort);
    if (tooShort) return;
    setPending(true);
    await onSubmit(password);
    setPending(false);
  };
  return { password, setPassword, invalid, pending, submit };
}

type ResetForm = ReturnType<typeof useResetForm>;

/** La ayuda se queda visible: también es el motivo cuando la contraseña es demasiado corta. */
function NewPasswordField({ form }: { form: ResetForm }) {
  const hintId = useId();
  return (
    <div className={styles.withHint}>
      <PasswordField
        label="Contraseña nueva"
        autoComplete="new-password"
        value={form.password}
        invalid={form.invalid}
        aria-describedby={hintId}
        onChange={(event) => form.setPassword(event.target.value)}
      />
      <span id={hintId} className={styles.hint}>
        {PASSWORD_HINT}
      </span>
    </div>
  );
}

function ResetActions(props: { formId: string; pending: boolean; onClose: () => void }) {
  return (
    <>
      <Button variant="secondary" onClick={props.onClose}>
        Cancelar
      </Button>
      <Button type="submit" form={props.formId} disabled={props.pending} aria-busy={props.pending}>
        Restablecer
      </Button>
    </>
  );
}

/** «Restablecer contraseña» del menú por fila (tablero «Ajustes», US5). */
export function ResetPasswordDialog(props: ResetPasswordDialogProps) {
  const form = useResetForm(props.onSubmit);
  const formId = useId();
  return (
    <Dialog
      title="Restablecer contraseña"
      description={notice(props.userName)}
      onClose={props.onClose}
      actions={<ResetActions formId={formId} pending={form.pending} onClose={props.onClose} />}
    >
      <form id={formId} className={styles.form} onSubmit={(e) => void form.submit(e)} noValidate>
        {props.error && <Alert>{props.error}</Alert>}
        <NewPasswordField form={form} />
      </form>
    </Dialog>
  );
}
