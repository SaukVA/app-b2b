import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { AppearancePreferences, AuthUser } from '@app/shared';
import { setupStore } from '../../../store/store';
import { sessionRestored } from '../preferencesSlice';
import { UserMoney, UserMoneyField } from './UserMoney';

const SAVED: AppearancePreferences = {
  theme: 'light',
  tableDensity: 'comfortable',
  moneyFormat: 'en',
  homeScreen: null,
};

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
  preferences: SAVED,
};

function renderWith(loggedIn: boolean) {
  const store = setupStore();
  if (loggedIn) store.dispatch(sessionRestored(user));
  render(
    <Provider store={store}>
      <UserMoney value={1248.5} />
      <UserMoneyField label="Importe" value={1248.5} onValueChange={jest.fn()} />
    </Provider>,
  );
  return store;
}

const fieldValue = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Importe' }).value;

describe('UserMoney y UserMoneyField', () => {
  it('usan el formato elegido por el usuario', () => {
    renderWith(true);
    expect(screen.getByText('€ 1,248.50')).toBeTruthy();
    expect(fieldValue()).toBe('€ 1,248.50');
  });

  it('sin sesión usan el formato por defecto', () => {
    renderWith(false);
    expect(screen.getByText('1.248,50 €')).toBeTruthy();
    expect(fieldValue()).toBe('1.248,50 €');
  });

  it('cambian al cambiar la preferencia', () => {
    const store = renderWith(true);
    act(() => {
      store.dispatch(sessionRestored({ ...user, preferences: { ...SAVED, moneyFormat: 'es' } }));
    });
    expect(screen.getByText('1.248,50 €')).toBeTruthy();
    expect(fieldValue()).toBe('1.248,50 €');
  });
});
