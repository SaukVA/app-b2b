import { useId, useRef, useState, type FormEvent, type ReactElement } from 'react';
import {
  ADMIN_ROLE_KEY,
  MIN_PASSWORD_LENGTH,
  USER_NAME_MAX_LENGTH,
  type CreateUserRequest,
} from '@app/shared';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { PasswordField } from '../../../components/PasswordField';
import { Select, type SelectOption } from '../../../components/Select';
import { TextField } from '../../../components/TextField';
import styles from './UserForm.module.css';

export interface UserFormProps {
  roleOptions: readonly SelectOption[];
  /** Primer usuario con la cuenta inicial: el rol queda fijo en Administrador (FR-003). */
  firstAdmin?: boolean;
  /** Si devuelve una promesa, el formulario no admite otro envío hasta que se resuelva. */
  onSubmit: (values: CreateUserRequest) => Promise<unknown> | void;
  /** Error del servidor (envelope), mostrado en un Alert. */
  error?: string | null;
}

type FieldErrors = Partial<Record<keyof CreateUserRequest, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HINT = 'Mínimo 8 caracteres. No hace falta cambiarla en el primer acceso.';
const FIRST_ADMIN_HINT = 'El primer usuario tiene que ser Administrador.';

/** Mismas reglas que createUserSchema (user.validation.ts), con el email ya normalizado. */
function normalize(values: CreateUserRequest): CreateUserRequest {
  return { ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() };
}

function validate(values: CreateUserRequest): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name) errors.name = 'Introduce el nombre.';
  if (values.name.length > USER_NAME_MAX_LENGTH) errors.name = 'Máximo 100 caracteres.';
  if (!EMAIL_PATTERN.test(values.email)) errors.email = 'Introduce un email válido.';
  if (!values.role) errors.role = 'Elige un rol.';
  if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = 'Mínimo 8 caracteres.';
  return errors;
}

function useUserForm({ firstAdmin, roleOptions, onSubmit }: UserFormProps) {
  const initialRole = firstAdmin ? ADMIN_ROLE_KEY : (roleOptions[0]?.value ?? '');
  const [values, setValues] = useState({ name: '', email: '', role: initialRole, password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pendingRef.current) return;
    const normalized = normalize({ ...values, role: firstAdmin ? ADMIN_ROLE_KEY : values.role });
    const fieldErrors = validate(normalized);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onSubmit(normalized);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  const update = (patch: Partial<typeof values>) =>
    setValues((current) => ({ ...current, ...patch }));
  return { values, errors, pending, submit, update };
}

/** Texto de ayuda bajo un campo; mientras el campo tiene error, manda el mensaje de error. */
function WithHint({
  hint,
  error,
  children,
}: {
  hint: string;
  error?: string;
  children: (describedBy: { 'aria-describedby'?: string }) => ReactElement;
}) {
  const hintId = useId();
  return (
    <div className={styles.withHint}>
      {children(error ? {} : { 'aria-describedby': hintId })}
      {!error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}

type FormState = ReturnType<typeof useUserForm>;

function RoleField({ form, props }: { form: FormState; props: UserFormProps }) {
  if (props.firstAdmin) {
    return (
      <WithHint hint={FIRST_ADMIN_HINT}>
        {(describedBy) => <TextField label="Rol" value="Administrador" readOnly {...describedBy} />}
      </WithHint>
    );
  }
  return (
    <Select
      label="Rol"
      options={props.roleOptions}
      value={form.values.role}
      error={form.errors.role}
      onChange={(event) => form.update({ role: event.target.value })}
    />
  );
}

function UserFields({ form, props }: { form: FormState; props: UserFormProps }) {
  return (
    <>
      <TextField
        label="Nombre"
        autoComplete="off"
        placeholder="Nombre y apellidos"
        value={form.values.name}
        error={form.errors.name}
        onChange={(event) => form.update({ name: event.target.value })}
      />
      <TextField
        label="Email"
        type="text"
        inputMode="email"
        autoComplete="off"
        placeholder="nombre@empresa.es"
        value={form.values.email}
        error={form.errors.email}
        onChange={(event) => form.update({ email: event.target.value })}
      />
      <RoleField form={form} props={props} />
      <WithHint hint={PASSWORD_HINT} error={form.errors.password}>
        {(describedBy) => (
          <PasswordField
            label="Contraseña inicial"
            autoComplete="new-password"
            value={form.values.password}
            error={form.errors.password}
            onChange={(event) => form.update({ password: event.target.value })}
            {...describedBy}
          />
        )}
      </WithHint>
    </>
  );
}

/** Alta de usuario de Ajustes › Usuarios (tablero «Ajustes», sección «Nuevo usuario»). */
export function UserForm(props: UserFormProps) {
  const form = useUserForm(props);
  return (
    <form className={styles.form} onSubmit={form.submit} noValidate>
      {props.error && <Alert>{props.error}</Alert>}
      <UserFields form={form} props={props} />
      <div className={styles.actions}>
        <Button type="submit" disabled={form.pending} aria-busy={form.pending}>
          {props.firstAdmin ? 'Crear Administrador' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}
