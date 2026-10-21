import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthUser, PermissionLevel } from '@app/shared';
import { RequireAuth } from '../routes/RequireAuth';
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
    preferences: {
      theme: 'light',
      tableDensity: 'comfortable',
      moneyFormat: 'es',
      homeScreen: null,
    },
  };
}

// Como en AppRouter: la pestaña Usuarios exige `ajustes: edit` y, sin permiso, se va a la pantalla de inicio.
function renderSettings(user: AuthUser, path = '/ajustes') {
  const store = setupStore({
    auth: { user, accessToken: 'jwt', status: 'succeeded', error: null },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ajustes" element={<SettingsPage />}>
            <Route index element={<SettingsIndexRedirect />} />
            <Route path="apariencia" element={<p>Pantalla de apariencia</p>} />
            <Route
              path="usuarios"
              element={
                <RequireAuth module="ajustes" level="edit">
                  <p>Pantalla de usuarios</p>
                </RequireAuth>
              }
            />
          </Route>
          <Route path="*" element={<p>Pantalla de inicio</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('SettingsPage', () => {
  it('cualquier rol ve la pestaña Apariencia, la primera, y /ajustes la abre', () => {
    renderSettings(userWithAjustes('none'));
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeTruthy();
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Apariencia']);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Pantalla de apariencia')).toBeTruthy();
  });

  it('con ajustes: edit ve además la pestaña Usuarios, después de Apariencia', () => {
    renderSettings(userWithAjustes('edit'));
    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Apariencia', 'Usuarios']);
    expect(screen.getByText('Pantalla de apariencia')).toBeTruthy();
  });

  it('con ajustes: edit abre la pestaña Usuarios', () => {
    renderSettings(userWithAjustes('edit'), '/ajustes/usuarios');
    expect(screen.getByRole('link', { name: 'Usuarios' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByText('Pantalla de usuarios')).toBeTruthy();
  });

  it('sin ajustes: edit, abrir /ajustes/usuarios lleva a la pantalla de inicio (quickstart §3.4)', () => {
    renderSettings(userWithAjustes('none'), '/ajustes/usuarios');
    // Sin módulos implementados (005), la pantalla de inicio de cualquier rol es Ajustes › Apariencia.
    expect(screen.getByText('Pantalla de apariencia')).toBeTruthy();
    expect(screen.queryByText('Pantalla de usuarios')).toBeNull();
  });
});
