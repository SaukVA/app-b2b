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
import { UserForm, type UserFormOutcome } from '../features/users/components/UserForm';
import { UsersTable } from '../features/users/components/UsersTable';
import { createUser, loadUsers, updateUser } from '../features/users/usersSlice';
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

/** «Editar usuario»: nombre, email y rol; el error se queda dentro del diálogo (FR-024). */
function EditUserDialog({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const roles = useAppSelector((state) => state.roles.items);
  const [error, setError] = useState<string | null>(null);
  const submit = async (body: UpdateUserRequest): Promise<UserFormOutcome> => {
    const result = await dispatch(updateUser({ id: user.id, body }));
    if (updateUser.fulfilled.match(result)) {
      onClose();
      return 'saved';
    }
    setError(result.payload ?? null);
    return failureOutcome(result.payload);
  };
  return (
    <Dialog
      title="Editar usuario"
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      }
    >
      <UserForm mode="edit" user={user} roles={roles} onSubmit={submit} error={error} />
    </Dialog>
  );
}

function usersCount(count: number): string {
  return count === 1 ? '1 usuario' : `${count} usuarios`;
}

function UsersListBody({ onEdit }: { onEdit: (user: UserSummary) => void }) {
  const { items, status, error } = useAppSelector((state) => state.users);
  const currentUserId = useAppSelector(selectUser)?.id ?? null;
  if (status === 'failed') return <Alert>{error}</Alert>;
  if (status === 'loading' && items.length === 0) {
    return <p className={styles.empty}>Cargando usuarios…</p>;
  }
  return <UsersTable users={items} currentUserId={currentUserId} onEdit={onEdit} />;
}

/** Listado con acciones por fila (FR-011, FR-012); la edición se abre en un diálogo. */
function UsersListSection() {
  const count = useAppSelector((state) => state.users.items.length);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  return (
    <section aria-labelledby="users-list-title" className={styles.panel}>
      <SectionHeader id="users-list-title" title="Usuarios" aside={usersCount(count)} />
      <UsersListBody onEdit={setEditing} />
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} />}
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

/** Ajustes › Usuarios. Los diálogos de bloqueo y contraseña y la matriz llegan con US4–US6. */
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
