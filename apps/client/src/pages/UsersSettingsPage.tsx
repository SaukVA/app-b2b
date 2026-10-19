import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';
import type { CreateUserRequest } from '@app/shared';
import { Alert } from '../components/Alert';
import { selectUser } from '../features/auth/authSelectors';
import { sessionCleared } from '../features/auth/authSlice';
import { UserForm } from '../features/users/components/UserForm';
import { createUser } from '../features/users/usersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import { getDesktopBridge } from '../utils/desktop';

const LOGIN_NOTICE = 'Entra con el usuario que acabas de crear.';

/**
 * Alta del primer Administrador: si retira la cuenta inicial, la sesión de `admin` ya no vale (FR-004).
 * Se limpia la sesión local y se vuelve al login con un aviso. React Router aplica `navigate` como
 * transición: el borrado de la sesión se aplica antes con flushSync (RequireAuth ya redirige al login)
 * y la navegación con el aviso va después, para que sea la última y no la pise esa redirección.
 */
function useCreateFirstAdmin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return async (values: CreateUserRequest) => {
    const result = await dispatch(createUser(values));
    if (!createUser.fulfilled.match(result) || !result.payload.bootstrapRetired) return;
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

/** Primer acceso con la cuenta inicial: aviso, alta del Administrador y sin listado (US1). */
function FirstAccess() {
  const createFirstAdmin = useCreateFirstAdmin();
  const error = useAppSelector((state) => state.users.error);
  return (
    <>
      <FirstAccessNotice />
      <section aria-labelledby="users-new-title">
        <h3 id="users-new-title">Nuevo usuario</h3>
        <UserForm firstAdmin roleOptions={[]} onSubmit={createFirstAdmin} error={error} />
      </section>
      <section aria-labelledby="users-list-title">
        <h3 id="users-list-title">Usuarios</h3>
        <p>Todavía no hay usuarios. El primero que des de alta será el Administrador.</p>
      </section>
    </>
  );
}

/** Ajustes › Usuarios. El alta normal, el listado, los diálogos y la matriz llegan con US2–US6. */
export function UsersSettingsPage() {
  const user = useAppSelector(selectUser);
  return (
    <section aria-labelledby="users-settings-title">
      <h2 id="users-settings-title">Usuarios</h2>
      {user?.isBootstrap && <FirstAccess />}
    </section>
  );
}
