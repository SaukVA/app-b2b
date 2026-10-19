import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { AuthUser, RoleSummary, UserSummary } from '@app/shared';
import { fetchRoles } from '../features/roles/rolesApi';
import {
  fetchUsers,
  resetUserPasswordRequest,
  setUserStatusRequest,
  updateUserRequest,
} from '../features/users/usersApi';
import { setupStore } from '../store/store';
import { UsersSettingsPage } from './UsersSettingsPage';

jest.mock('../features/roles/rolesApi', () => ({ fetchRoles: jest.fn() }));
jest.mock('../features/users/usersApi', () => ({
  ...jest.requireActual('../features/users/usersApi'),
  fetchUsers: jest.fn(),
  updateUserRequest: jest.fn(),
  setUserStatusRequest: jest.fn(),
  resetUserPasswordRequest: jest.fn(),
}));

const ALL_EDIT = {
  ventas: 'edit',
  clientes: 'edit',
  productos: 'edit',
  proveedores: 'edit',
  cobros: 'edit',
  ajustes: 'edit',
} as const;

const ADMIN: AuthUser = {
  id: 'ana',
  login: 'ana@empresa.es',
  name: 'Ana Pérez',
  role: 'Administrador',
  roleName: 'Administrador',
  permissions: ALL_EDIT,
  isBootstrap: false,
  homeScreen: null,
};

const ROLES: RoleSummary[] = [
  { key: 'Administrador', name: 'Administrador', isAdmin: true, order: 1, permissions: ALL_EDIT },
  { key: 'Comercial', name: 'Comercial', isAdmin: false, order: 2, permissions: ALL_EDIT },
];

function summary(id: string, name: string, patch: Partial<UserSummary> = {}): UserSummary {
  return {
    id,
    name,
    email: `${id}@empresa.es`,
    role: 'Administrador',
    roleName: 'Administrador',
    status: 'Activo',
    lastLoginAt: null,
    ...patch,
  };
}

const USERS = [
  summary('ana', 'Ana Pérez'),
  summary('bea', 'Bea Gómez'),
  summary('carlos', 'Carlos Ruiz', { status: 'Bloqueado' }),
];

function envelopeError(code: string, message: string) {
  return { response: { data: { success: false, error: { code, message } } } };
}

function renderPage() {
  const store = setupStore({
    auth: { user: ADMIN, accessToken: 'jwt', status: 'succeeded', error: null },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <UsersSettingsPage />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  jest.mocked(fetchRoles).mockResolvedValue(ROLES);
  jest.mocked(fetchUsers).mockResolvedValue(USERS);
  jest.mocked(updateUserRequest).mockReset();
  jest.mocked(setUserStatusRequest).mockReset();
  jest.mocked(resetUserPasswordRequest).mockReset();
});

describe('UsersSettingsPage · listado (US3)', () => {
  it('lista los usuarios con el contador', async () => {
    renderPage();
    const table = within(await screen.findByRole('table', { name: 'Usuarios' }));
    expect(table.getByText('Bea Gómez')).toBeTruthy();
    expect(screen.getByText('3 usuarios')).toBeTruthy();
  });

  it('si falla la carga muestra el error', async () => {
    jest.mocked(fetchUsers).mockRejectedValue({
      response: { data: { success: false, error: { code: 'X', message: 'No se pudo cargar.' } } },
    });
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo cargar.');
  });
});

/** Abre «Editar usuario» para Bea desde el menú de su fila. */
async function openEditBea(user: ReturnType<typeof userEvent.setup>) {
  renderPage();
  const table = within(await screen.findByRole('table', { name: 'Usuarios' }));
  await user.click(table.getByRole('button', { name: 'Opciones de Bea Gómez' }));
  await user.click(screen.getByRole('menuitem', { name: 'Editar nombre, email o rol' }));
  return within(screen.getByRole('dialog', { name: 'Editar usuario' }));
}

describe('UsersSettingsPage · edición (US3, FR-024)', () => {
  it('abre «Editar usuario» desde el menú, guarda y cierra el diálogo', async () => {
    const user = userEvent.setup();
    jest.mocked(updateUserRequest).mockResolvedValue({ ...USERS[1], name: 'Beatriz Gómez' });
    const dialog = await openEditBea(user);
    const name = dialog.getByLabelText('Nombre');
    expect((name as HTMLInputElement).value).toBe('Bea Gómez');
    await user.clear(name);
    await user.type(name, 'Beatriz Gómez');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    expect(updateUserRequest).toHaveBeenCalledWith('bea', { name: 'Beatriz Gómez' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      within(screen.getByRole('table', { name: 'Usuarios' })).getByText('Beatriz Gómez'),
    ).toBeTruthy();
  });

  it('un error al guardar se muestra dentro del diálogo, que sigue abierto', async () => {
    const user = userEvent.setup();
    jest.mocked(updateUserRequest).mockRejectedValue({
      response: {
        data: {
          success: false,
          error: { code: 'USER_EMAIL_TAKEN', message: 'Ya existe un usuario con ese email.' },
        },
      },
    });
    const dialog = await openEditBea(user);
    await user.clear(dialog.getByLabelText('Email'));
    await user.type(dialog.getByLabelText('Email'), 'ana@empresa.es');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    expect(dialog.getByRole('alert').textContent).toContain('Ya existe un usuario con ese email.');
  });
});

async function openMenuItem(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  renderPage();
  const table = within(await screen.findByRole('table', { name: 'Usuarios' }));
  await user.click(table.getByRole('button', { name: `Opciones de ${name}` }));
  await user.click(screen.getByRole('menuitem', { name: item }));
}

describe('UsersSettingsPage · bloquear y desbloquear (US4)', () => {
  it('«Bloquear» pide confirmación y solo bloquea al confirmar', async () => {
    const user = userEvent.setup();
    jest.mocked(setUserStatusRequest).mockResolvedValue({ ...USERS[1], status: 'Bloqueado' });
    await openMenuItem(user, 'Bea Gómez', 'Bloquear');
    const dialog = within(screen.getByRole('dialog', { name: '¿Bloquear a Bea Gómez?' }));
    expect(setUserStatusRequest).not.toHaveBeenCalled();
    await user.click(dialog.getByRole('button', { name: 'Bloquear' }));
    expect(setUserStatusRequest).toHaveBeenCalledWith('bea', 'Bloqueado');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancelar la confirmación no bloquea', async () => {
    const user = userEvent.setup();
    await openMenuItem(user, 'Bea Gómez', 'Bloquear');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(setUserStatusRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('«Desbloquear» es directo', async () => {
    const user = userEvent.setup();
    jest.mocked(setUserStatusRequest).mockResolvedValue({ ...USERS[2], status: 'Activo' });
    await openMenuItem(user, 'Carlos Ruiz', 'Desbloquear');
    expect(setUserStatusRequest).toHaveBeenCalledWith('carlos', 'Activo');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un USER_LAST_ADMIN al bloquear se muestra dentro del diálogo', async () => {
    const user = userEvent.setup();
    const message = 'Debe quedar al menos un Administrador activo.';
    jest.mocked(setUserStatusRequest).mockRejectedValue(envelopeError('USER_LAST_ADMIN', message));
    await openMenuItem(user, 'Bea Gómez', 'Bloquear');
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Bloquear' }));
    expect(dialog.getByRole('alert').textContent).toContain(message);
  });
});

describe('UsersSettingsPage · cambio de rol (US4)', () => {
  it('pide confirmación antes de cambiar el rol', async () => {
    const user = userEvent.setup();
    jest.mocked(updateUserRequest).mockResolvedValue({ ...USERS[1], role: 'Comercial' });
    const dialog = await openEditBea(user);
    expect(dialog.getByText(/se aplica a sus sesiones abiertas en 15 minutos/)).toBeTruthy();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Rol' }), 'Comercial');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    expect(dialog.getByText('¿Cambiar el rol de Bea Gómez a Comercial?')).toBeTruthy();
    expect(updateUserRequest).not.toHaveBeenCalled();
    await user.click(dialog.getByRole('button', { name: 'Cambiar rol' }));
    expect(updateUserRequest).toHaveBeenCalledWith('bea', { role: 'Comercial' });
  });

  it('un USER_LAST_ADMIN se muestra en un Alert dentro del diálogo', async () => {
    const user = userEvent.setup();
    const message = 'Debe quedar al menos un Administrador activo.';
    jest.mocked(updateUserRequest).mockRejectedValue(envelopeError('USER_LAST_ADMIN', message));
    const dialog = await openEditBea(user);
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Rol' }), 'Comercial');
    await user.click(dialog.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(dialog.getByRole('button', { name: 'Cambiar rol' }));
    expect(dialog.getByRole('alert').textContent).toContain(message);
    expect(screen.getByRole('dialog', { name: 'Editar usuario' })).toBeTruthy();
  });
});

describe('UsersSettingsPage · restablecer contraseña (US5)', () => {
  it('abre el diálogo desde el menú, envía la contraseña y lo cierra', async () => {
    const user = userEvent.setup();
    jest.mocked(resetUserPasswordRequest).mockResolvedValue(undefined);
    await openMenuItem(user, 'Bea Gómez', 'Restablecer contraseña');
    const dialog = within(screen.getByRole('dialog', { name: 'Restablecer contraseña' }));
    await user.type(dialog.getByLabelText('Contraseña nueva'), 'nuevaClave456');
    await user.click(dialog.getByRole('button', { name: 'Restablecer' }));
    expect(resetUserPasswordRequest).toHaveBeenCalledWith('bea', 'nuevaClave456');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un error se muestra dentro del diálogo, que sigue abierto', async () => {
    const user = userEvent.setup();
    const message = 'El usuario no existe.';
    jest
      .mocked(resetUserPasswordRequest)
      .mockRejectedValue(envelopeError('USER_NOT_FOUND', message));
    await openMenuItem(user, 'Bea Gómez', 'Restablecer contraseña');
    const dialog = within(screen.getByRole('dialog'));
    await user.type(dialog.getByLabelText('Contraseña nueva'), 'nuevaClave456');
    await user.click(dialog.getByRole('button', { name: 'Restablecer' }));
    expect(dialog.getByRole('alert').textContent).toContain(message);
  });
});

describe('UsersSettingsPage · permisos por rol (US6)', () => {
  it('muestra la matriz de solo lectura con los roles cargados', async () => {
    renderPage();
    const section = within(await screen.findByRole('region', { name: 'Permisos por rol' }));
    const table = within(await section.findByRole('table'));
    const titles = table.getAllByRole('columnheader').map((h) => h.querySelector('abbr')?.title);
    expect(titles).toEqual([undefined, 'Administrador', 'Comercial']);
    expect(table.getAllByRole('row')).toHaveLength(7);
  });
});
