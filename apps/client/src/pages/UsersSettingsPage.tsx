import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';
import type {
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UserSummary,
} from '@app/shared';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { isConnectionErrorMessage } from '../features/auth/authApi';
import { selectUser } from '../features/auth/authSelectors';
import { sessionCleared } from '../features/auth/authSlice';
import { loadRoles } from '../features/roles/rolesSlice';
import { ResetPasswordDialog } from '../features/users/components/ResetPasswordDialog';
import { UserForm, type UserFormOutcome } from '../features/users/components/UserForm';
import { UsersTable } from '../features/users/components/UsersTable';
import {
  createUser,
  loadUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from '../features/users/usersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import { getDesktopBridge } from '../utils/desktop';
import styles from './UsersSettingsPage.module.css';

const LOGIN_NOTICE = 'Entra con el usuario que acabas de crear.';

/** Qué conserva el formulario: tras un fallo de conexión, todo salvo la contraseña (T053). */
function failureOutcome(message: string | undefined): UserFormOutcome {
  return isConnectionErrorMessage(message ?? null) ? 'connectionError' : 'error';
}

/**
 * Alta con error propio del formulario (no el de `users.error`, que es el del listado).
 * `onCreated` recibe la respuesta para decidir qué hacer después (p. ej. volver al login).
 */
function useCreateSubmit(onCreated?: (response: CreateUserResponse) => Promise<void>) {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const submit = async (values: CreateUserRequest): Promise<UserFormOutcome> => {
    const result = await dispatch(createUser(values));
    if (!createUser.fulfilled.match(result)) {
      setError(result.payload ?? null);
      return failureOutcome(result.payload);
    }
    setError(null);
    await onCreated?.(result.payload);
    return 'saved';
  };
  return { submit, error };
}

/**
 * Primer Administrador: si retira la cuenta inicial, la sesión de `admin` ya no vale (FR-004).
 * Se limpia la sesión local y se vuelve al login con un aviso. React Router aplica `navigate` como
 * transición: el borrado de la sesión se aplica antes con flushSync (RequireAuth ya redirige al login)
 * y la navegación con el aviso va después, para que sea la última y no la pise esa redirección.
 */
function useLeaveBootstrapSession() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return async ({ bootstrapRetired }: CreateUserResponse) => {
    if (!bootstrapRetired) return;
    await getDesktopBridge()?.clearRefreshToken();
    flushSync(() => dispatch(sessionCleared()));
    navigate('/login', { replace: true, state: { notice: LOGIN_NOTICE } });
  };
}

function FirstAccessNotice() {
  return (
    <Alert variant="warning">
      <strong>Has entrado con la cuenta inicial «admin».</strong> Crea el primer usuario: tiene que
      ser Administrador. En cuanto lo guardes, la cuenta inicial dejará de funcionar y tendrás que
      entrar con el usuario nuevo.
    </Alert>
  );
}

function SectionHeader({ id, title, aside }: { id: string; title: string; aside?: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h3 id={id} className={styles.sectionTitle}>
        {title}
      </h3>
      {aside && <span className={styles.aside}>{aside}</span>}
    </div>
  );
}

/** Primer acceso con la cuenta inicial: aviso, alta del Administrador y sin listado (US1). */
function FirstAccess() {
  const { submit, error } = useCreateSubmit(useLeaveBootstrapSession());
  return (
    <>
      <FirstAccessNotice />
      <div className={styles.columns}>
        <section aria-labelledby="users-new-title" className={styles.panel}>
          <SectionHeader id="users-new-title" title="Nuevo usuario" />
          <UserForm firstAdmin roles={[]} onSubmit={submit} error={error} />
        </section>
        <section aria-labelledby="users-list-title" className={styles.panel}>
          <SectionHeader id="users-list-title" title="Usuarios" aside="0 usuarios" />
          <p className={styles.empty}>
            Todavía no hay usuarios. El primero que des de alta será el Administrador.
          </p>
        </section>
      </div>
    </>
  );
}

/** Alta directa: el usuario queda Activo y puede entrar al momento (FR-006, FR-009, FR-010). */
function NewUserSection() {
  const roles = useAppSelector((state) => state.roles.items);
  const { submit, error } = useCreateSubmit();
  return (
    <section aria-labelledby="users-new-title" className={styles.panel}>
      <SectionHeader id="users-new-title" title="Nuevo usuario" />
      <p className={styles.subtitle}>
        Queda Activo y puede entrar en cuanto lo guardes. Comunícale la contraseña por tu cuenta: la
        aplicación no envía correos.
      </p>
      <UserForm roles={roles} onSubmit={submit} error={error} />
    </section>
  );
}

const ROLE_CHANGE_NOTICE =
  'Un cambio de rol se aplica a sus sesiones abiertas en 15 minutos como máximo.';
const SELF_RESET_NOTICE = 'Tu contraseña ha cambiado. Entra con la nueva.';
const BLOCK_NOTICE =
  'No podrá iniciar sesión y sus sesiones abiertas se cerrarán. Podrás desbloquearlo más tarde; seguirá con la misma contraseña.';

type PendingRoleChange = { body: UpdateUserRequest; resolve: (outcome: UserFormOutcome) => void };

/** Guarda la edición; el error se queda dentro del diálogo (FR-024). */
function useSaveUser(user: UserSummary, onSaved: () => void) {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const save = async (body: UpdateUserRequest): Promise<UserFormOutcome> => {
    const result = await dispatch(updateUser({ id: user.id, body }));
    if (updateUser.fulfilled.match(result)) {
      onSaved();
      return 'saved';
    }
    setError(result.payload ?? null);
    return failureOutcome(result.payload);
  };
  return { save, error };
}

/**
 * Un cambio de rol se confirma antes de guardar (US4 escenario 7). El formulario sigue montado y
 * esperando: al confirmar se guarda y al no cambiar se conserva lo escrito.
 */
function useRoleChangeConfirmation(save: (body: UpdateUserRequest) => Promise<UserFormOutcome>) {
  const [pending, setPending] = useState<PendingRoleChange | null>(null);
  const submit = (body: UpdateUserRequest): Promise<UserFormOutcome> => {
    if (body.role === undefined) return save(body);
    return new Promise((resolve) => setPending({ body, resolve }));
  };
  const settle = async (confirmed: boolean) => {
    if (!pending) return;
    setPending(null);
    pending.resolve(confirmed ? await save(pending.body) : 'error');
  };
  return { submit, pending, confirm: () => settle(true), cancel: () => settle(false) };
}

function RoleChangeConfirmation(props: {
  userName: string;
  roleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.confirm}>
      <p className={styles.confirmText}>
        ¿Cambiar el rol de {props.userName} a {props.roleName}?
      </p>
      <div className={styles.confirmActions}>
        <Button variant="secondary" onClick={props.onCancel}>
          No cambiar
        </Button>
        <Button onClick={props.onConfirm}>Cambiar rol</Button>
      </div>
    </div>
  );
}

/** «Editar usuario»: nombre, email y rol, con confirmación del cambio de rol (FR-013, FR-024). */
function EditUserDialog({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const roles = useAppSelector((state) => state.roles.items);
  const { save, error } = useSaveUser(user, onClose);
  const roleChange = useRoleChangeConfirmation(save);
  const pendingRole = roleChange.pending?.body.role ?? '';
  const newRoleName = roles.find((role) => role.key === pendingRole)?.name ?? pendingRole;
  return (
    <Dialog
      title="Editar usuario"
      description={ROLE_CHANGE_NOTICE}
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      }
    >
      <UserForm mode="edit" user={user} roles={roles} onSubmit={roleChange.submit} error={error} />
      {roleChange.pending && (
        <RoleChangeConfirmation
          userName={user.name}
          roleName={newRoleName}
          onConfirm={() => void roleChange.confirm()}
          onCancel={() => void roleChange.cancel()}
        />
      )}
    </Dialog>
  );
}

function useBlockUser(user: UserSummary, onBlocked: () => void) {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const block = async () => {
    setPending(true);
    const result = await dispatch(setUserStatus({ id: user.id, status: 'Bloqueado' }));
    setPending(false);
    if (setUserStatus.fulfilled.match(result)) onBlocked();
    else setError(result.payload ?? null);
  };
  return { block, error, pending };
}

/** «¿Bloquear a X?»: sus sesiones se cierran al confirmar (FR-014); el error se queda en el diálogo. */
function BlockUserDialog({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const { block, error, pending } = useBlockUser(user, onClose);
  const actions = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
      <Button variant="danger" disabled={pending} aria-busy={pending} onClick={() => void block()}>
        Bloquear
      </Button>
    </>
  );
  return (
    <Dialog
      title={`¿Bloquear a ${user.name}?`}
      description={BLOCK_NOTICE}
      onClose={onClose}
      actions={actions}
    >
      {error && <Alert>{error}</Alert>}
    </Dialog>
  );
}

/**
 * Si se restablece la propia contraseña, el thunk ya ha limpiado la sesión: se vuelve al login con un
 * aviso, igual que al retirar la cuenta inicial (navegación después de que se aplique el borrado).
 */
function useResetPassword(user: UserSummary, onDone: () => void) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const reset = async (password: string) => {
    const result = await dispatch(resetUserPassword({ id: user.id, password }));
    if (!resetUserPassword.fulfilled.match(result)) return setError(result.payload ?? null);
    flushSync(onDone);
    if (result.payload.signedOut) {
      navigate('/login', { replace: true, state: { notice: SELF_RESET_NOTICE } });
    }
  };
  return { reset, error };
}

function ResetUserPasswordDialog({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const { reset, error } = useResetPassword(user, onClose);
  return (
    <ResetPasswordDialog userName={user.name} onSubmit={reset} onClose={onClose} error={error} />
  );
}

function usersCount(count: number): string {
  return count === 1 ? '1 usuario' : `${count} usuarios`;
}

interface RowActions {
  onEdit: (user: UserSummary) => void;
  onResetPassword: (user: UserSummary) => void;
  onBlock: (user: UserSummary) => void;
  onUnblock: (user: UserSummary) => void;
}

function UsersListBody(actions: RowActions) {
  const { items, status, error } = useAppSelector((state) => state.users);
  const currentUserId = useAppSelector(selectUser)?.id ?? null;
  if (status === 'failed') return <Alert>{error}</Alert>;
  if (status === 'loading' && items.length === 0) {
    return <p className={styles.empty}>Cargando usuarios…</p>;
  }
  return <UsersTable users={items} currentUserId={currentUserId} {...actions} />;
}

/** El desbloqueo es directo; si falla, el error sale encima del listado. */
function useUnblock() {
  const dispatch = useAppDispatch();
  const [error, setError] = useState<string | null>(null);
  const unblock = async (user: UserSummary) => {
    const result = await dispatch(setUserStatus({ id: user.id, status: 'Activo' }));
    setError(setUserStatus.fulfilled.match(result) ? null : (result.payload ?? null));
  };
  return { unblock, error };
}

/** Listado con acciones por fila (FR-011, FR-012); editar, restablecer y bloquear abren un diálogo. */
function UsersListSection() {
  const count = useAppSelector((state) => state.users.items.length);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [resetting, setResetting] = useState<UserSummary | null>(null);
  const [blocking, setBlocking] = useState<UserSummary | null>(null);
  const { unblock, error } = useUnblock();
  return (
    <section aria-labelledby="users-list-title" className={styles.panel}>
      <SectionHeader id="users-list-title" title="Usuarios" aside={usersCount(count)} />
      {error && <Alert>{error}</Alert>}
      <UsersListBody
        onEdit={setEditing}
        onResetPassword={setResetting}
        onBlock={setBlocking}
        onUnblock={(user) => void unblock(user)}
      />
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} />}
      {resetting && <ResetUserPasswordDialog user={resetting} onClose={() => setResetting(null)} />}
      {blocking && <BlockUserDialog user={blocking} onClose={() => setBlocking(null)} />}
    </section>
  );
}

/** Gestión con usuarios reales: alta a la izquierda y listado a la derecha (se apilan en móvil). */
function UsersManagement() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(loadRoles());
    void dispatch(loadUsers());
  }, [dispatch]);
  return (
    <div className={styles.columns}>
      <NewUserSection />
      <UsersListSection />
    </div>
  );
}

/** Ajustes › Usuarios. La matriz de permisos llega con US6. */
export function UsersSettingsPage() {
  const user = useAppSelector(selectUser);
  return (
    <section aria-labelledby="users-settings-title" className={styles.page}>
      <h2 id="users-settings-title" className={styles.srOnly}>
        Usuarios
      </h2>
      {user?.isBootstrap ? <FirstAccess /> : <UsersManagement />}
    </section>
  );
}
