import { useId, useRef, useState, type FormEvent, type ReactElement } from 'react';
import {
  ADMIN_ROLE_KEY,
  MIN_PASSWORD_LENGTH,
  USER_NAME_MAX_LENGTH,
  type CreateUserRequest,
  type RoleSummary,
  type UpdateUserRequest,
  type UserSummary,
} from '@app/shared';
import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { PasswordField } from '../../../components/PasswordField';
import { Select } from '../../../components/Select';
import { TextField } from '../../../components/TextField';
import styles from './UserForm.module.css';

/** Resultado del envío que decide qué se conserva en el formulario (T053). */
export type UserFormOutcome = 'saved' | 'connectionError' | 'error';

type SubmitResult = Promise<UserFormOutcome | void> | void;

interface CommonProps {
  /** Roles guardados (GET /roles), en su orden. */
  roles: readonly RoleSummary[];
  /** Error del servidor (envelope), mostrado en un Alert. */
  error?: string | null;
}

interface CreateProps extends CommonProps {
  mode?: 'create';
  /** Primer usuario con la cuenta inicial: el rol queda fijo en Administrador (FR-003). */
  firstAdmin?: boolean;
  /** Si devuelve una promesa, el formulario no admite otro envío hasta que se resuelva. */
  onSubmit: (values: CreateUserRequest) => SubmitResult;
}

interface EditProps extends CommonProps {
  mode: 'edit';
  user: UserSummary;
  /** Recibe solo los campos que cambian (FR-024). */
  onSubmit: (values: UpdateUserRequest) => SubmitResult;
}

export type UserFormProps = CreateProps | EditProps;

type Values = CreateUserRequest;
type FieldErrors = Partial<Record<keyof Values, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HINT = 'Mínimo 8 caracteres. No hace falta cambiarla en el primer acceso.';
const FIRST_ADMIN_HINT = 'El primer usuario tiene que ser Administrador.';
const NO_CHANGES = 'No hay cambios que guardar.';

function isEdit(props: UserFormProps): props is EditProps {
  return props.mode === 'edit';
}

function initialValues(props: UserFormProps): Values {
  if (isEdit(props)) {
    const { name, email, role } = props.user;
    return { name, email, role, password: '' };
  }
  return { name: '', email: '', role: props.firstAdmin ? ADMIN_ROLE_KEY : '', password: '' };
}

/** Los roles llegan tras montar: sin elección, vale el primero de la lista. */
function effectiveRole(values: Values, props: UserFormProps): string {
  return values.role || (props.roles[0]?.key ?? '');
}

/** Mismas reglas que user.validation.ts, con nombre y email ya normalizados. */
function normalize(values: Values, props: UserFormProps): Values {
  const role = !isEdit(props) && props.firstAdmin ? ADMIN_ROLE_KEY : effectiveRole(values, props);
  return { ...values, role, name: values.name.trim(), email: values.email.trim().toLowerCase() };
}

function validate(values: Values, withPassword: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name) errors.name = 'Introduce el nombre.';
  if (values.name.length > USER_NAME_MAX_LENGTH) errors.name = 'Máximo 100 caracteres.';
  if (!EMAIL_PATTERN.test(values.email)) errors.email = 'Introduce un email válido.';
  if (!values.role) errors.role = 'Elige un rol.';
  if (withPassword && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'Mínimo 8 caracteres.';
  }
  return errors;
}

function changedFields(values: Values, user: UserSummary): UpdateUserRequest {
  const changes: UpdateUserRequest = {};
  if (values.name !== user.name) changes.name = values.name;
  if (values.email !== user.email) changes.email = values.email;
  if (values.role !== user.role) changes.role = values.role;
  return changes;
}

/** Tras crear se limpia salvo el rol; sin conexión solo se borra la contraseña (T053). */
function valuesAfter(outcome: UserFormOutcome | void, values: Values): Values {
  if (outcome === 'saved') return { name: '', email: '', role: values.role, password: '' };
  if (outcome === 'connectionError') return { ...values, password: '' };
  return values;
}

function useSingleSubmit() {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const run = async (task: () => SubmitResult): Promise<UserFormOutcome | void> => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      return await task();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  return { pending, run };
}

function useUserForm(props: UserFormProps) {
  const [values, setValues] = useState(() => initialValues(props));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, run } = useSingleSubmit();

  const send = (normalized: Values): (() => SubmitResult) | null => {
    if (!isEdit(props)) return () => props.onSubmit(normalized);
    const changes = changedFields(normalized, props.user);
    return Object.keys(changes).length > 0 ? () => props.onSubmit(changes) : null;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalize(values, props);
    const fieldErrors = validate(normalized, !isEdit(props));
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    const task = send(normalized);
    setNotice(task ? null : NO_CHANGES);
    if (!task) return;
    const outcome = await run(task);
    if (!isEdit(props)) setValues((current) => valuesAfter(outcome, current));
  };
  const update = (patch: Partial<Values>) => setValues((current) => ({ ...current, ...patch }));
  return { values, errors, notice, pending, submit, update };
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
  if (!isEdit(props) && props.firstAdmin) {
    return (
      <WithHint hint={FIRST_ADMIN_HINT}>
        {(describedBy) => <TextField label="Rol" value="Administrador" readOnly {...describedBy} />}
      </WithHint>
    );
  }
  return (
    <Select
      label="Rol"
      options={props.roles.map((role) => ({ value: role.key, label: role.name }))}
      value={effectiveRole(form.values, props)}
      error={form.errors.role}
      onChange={(event) => form.update({ role: event.target.value })}
    />
  );
}

function PasswordInput({ form }: { form: FormState }) {
  return (
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
      {!isEdit(props) && <PasswordInput form={form} />}
    </>
  );
}

function submitLabel(props: UserFormProps): string {
  if (isEdit(props)) return 'Guardar cambios';
  return props.firstAdmin ? 'Crear Administrador' : 'Crear usuario';
}

/** Alta o edición de usuario de Ajustes › Usuarios (tablero «Ajustes»). */
export function UserForm(props: UserFormProps) {
  const form = useUserForm(props);
  return (
    <form className={styles.form} onSubmit={form.submit} noValidate>
      {props.error && <Alert>{props.error}</Alert>}
      {form.notice && <Alert variant="info">{form.notice}</Alert>}
      <UserFields form={form} props={props} />
      <div className={styles.actions}>
        <Button type="submit" disabled={form.pending} aria-busy={form.pending}>
          {submitLabel(props)}
        </Button>
      </div>
    </form>
  );
}
