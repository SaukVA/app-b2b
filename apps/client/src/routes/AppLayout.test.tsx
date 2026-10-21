import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthUser } from '@app/shared';
import { setupStore } from '../store/store';
import { AppLayout } from './AppLayout';

const USER: AuthUser = {
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role: 'Comercial',
  roleName: 'Comercial',
  permissions: {
    ventas: 'edit',
    clientes: 'edit',
    productos: 'view',
    proveedores: 'none',
    cobros: 'view',
    ajustes: 'none',
  },
  isBootstrap: false,
  preferences: { theme: 'light', tableDensity: 'comfortable', moneyFormat: 'es', homeScreen: null },
};

function renderAt(path: string, user: AuthUser | null) {
  const store = setupStore({
    auth: { user, accessToken: user ? 'jwt' : null, status: 'idle', error: null },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/ajustes/apariencia" element={<p>Pantalla de apariencia</p>} />
          </Route>
          <Route path="/login" element={<p>Pantalla de login</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('AppLayout', () => {
  it('con sesión muestra el menú Principal y el contenido de la página', () => {
    renderAt('/ajustes/apariencia', USER);
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeTruthy();
    expect(screen.getByText('Pantalla de apariencia')).toBeTruthy();
  });

  it('sin sesión redirige a /login, sin menú (FR-001)', () => {
    renderAt('/ajustes/apariencia', null);
    expect(screen.getByText('Pantalla de login')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
