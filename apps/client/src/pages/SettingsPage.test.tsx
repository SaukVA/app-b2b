import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthUser, PermissionLevel } from '@app/shared';
import { setupStore } from '../store/store';
import { SettingsIndexRedirect, SettingsPage } from './SettingsPage';

function userWithAjustes(ajustes: PermissionLevel): AuthUser {
  return {
    id: '1',
    login: 'ana@empresa.es',
    name: 'Ana',
    role: 'Rol',
    roleName: 'Rol',
    permissions: {
      ventas: 'edit',
      clientes: 'edit',
      productos: 'view',
      proveedores: 'none',
      cobros: 'view',
      ajustes,
    },
    isBootstrap: false,
    homeScreen: null,
  };
}

function renderSettings(user: AuthUser) {
  const store = setupStore({
    auth: { user, accessToken: 'jwt', status: 'succeeded', error: null },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/ajustes']}>
        <Routes>
          <Route path="/ajustes" element={<SettingsPage />}>
            <Route index element={<SettingsIndexRedirect />} />
            <Route path="usuarios" element={<p>Pantalla de usuarios</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('SettingsPage', () => {
  it('con ajustes: edit muestra la pestaña Usuarios y abre la primera pestaña permitida', () => {
    renderSettings(userWithAjustes('edit'));
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Usuarios' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByText('Pantalla de usuarios')).toBeTruthy();
  });

  it('sin ajustes: edit abre Ajustes sin la pestaña Usuarios (US3 AS3)', () => {
    renderSettings(userWithAjustes('none'));
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).toBeNull();
    expect(screen.queryByText('Pantalla de usuarios')).toBeNull();
    expect(screen.getByText('No hay ajustes disponibles para tu rol.')).toBeTruthy();
  });
});
