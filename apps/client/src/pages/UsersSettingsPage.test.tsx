import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { AuthUser, RoleSummary, UserSummary } from '@app/shared';
import { fetchRoles } from '../features/roles/rolesApi';
import { fetchUsers, updateUserRequest } from '../features/users/usersApi';
import { setupStore } from '../store/store';
import { UsersSettingsPage } from './UsersSettingsPage';

jest.mock('../features/roles/rolesApi', () => ({ fetchRoles: jest.fn() }));
jest.mock('../features/users/usersApi', () => ({
  ...jest.requireActual('../features/users/usersApi'),
  fetchUsers: jest.fn(),
  updateUserRequest: jest.fn(),
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
];

function summary(id: string, name: string): UserSummary {
  return {
    id,
    name,
    email: `${id}@empresa.es`,
    role: 'Administrador',
    roleName: 'Administrador',
    status: 'Activo',
    lastLoginAt: null,
  };
}

const USERS = [summary('ana', 'Ana Pérez'), summary('bea', 'Bea Gómez')];

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
});

describe('UsersSettingsPage · listado (US3)', () => {
  it('lista los usuarios con el contador', async () => {
    renderPage();
    const table = within(await screen.findByRole('table', { name: 'Usuarios' }));
    expect(table.getByText('Bea Gómez')).toBeTruthy();
    expect(screen.getByText('2 usuarios')).toBeTruthy();
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
