import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { AuthUser } from '@app/shared';
import { setupStore } from '../../../store/store';
import { logoutRequest } from '../authApi';
import { LogoutButton } from './LogoutButton';

jest.mock('../authApi', () => ({
  ...jest.requireActual('../authApi'),
  logoutRequest: jest.fn(),
}));

const user: AuthUser = {
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
  homeScreen: null,
};

function LoginProbe() {
  const state = useLocation().state as { from?: string } | null;
  return <p>login{state?.from ? ` desde ${state.from}` : ''}</p>;
}

it('al pulsar "Cerrar sesión" limpia la sesión y navega a /login sin ruta de origen', async () => {
  jest.mocked(logoutRequest).mockResolvedValue(undefined);
  const store = setupStore({
    auth: { user, accessToken: 'jwt', status: 'succeeded', error: null },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/productos']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route path="/productos" element={<LogoutButton />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByText('login')).toBeTruthy();
  expect(store.getState().auth.user).toBeNull();
  expect(logoutRequest).toHaveBeenCalledTimes(1);
});
