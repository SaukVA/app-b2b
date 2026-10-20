import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import type { AppearancePreferences, AuthUser } from '@app/shared';
import { setupStore } from '../../store/store';
import { login } from '../auth/authSlice';
import { useApplyAppearance } from './useApplyAppearance';

const LAST_THEME_KEY = 'appearance.lastTheme';
const PREFS: AppearancePreferences = {
  theme: 'dark',
  tableDensity: 'compact',
  moneyFormat: 'es',
  homeScreen: null,
};

function userWith(preferences: AppearancePreferences): AuthUser {
  return {
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
    preferences,
  };
}

function renderWith(applied: AppearancePreferences | null) {
  const store = setupStore({
    preferences: { applied, saveStatus: 'idle', saveError: null, pendingChange: {} },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  renderHook(() => useApplyAppearance(), { wrapper });
}

const root = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete root().dataset.theme;
  delete root().dataset.density;
});

afterEach(() => jest.restoreAllMocks());

describe('useApplyAppearance', () => {
  it('con sesión aplica tema y densidad y recuerda solo el tema en el equipo', () => {
    renderWith(PREFS);
    expect(root().dataset.theme).toBe('dark');
    expect(root().dataset.density).toBe('compact');
    expect(localStorage.getItem(LAST_THEME_KEY)).toBe('dark');
    expect(localStorage.length).toBe(1);
  });

  it('sin sesión usa el último tema del equipo, densidad Cómoda y no escribe nada', () => {
    localStorage.setItem(LAST_THEME_KEY, 'system');
    renderWith(null);
    expect(root().dataset.theme).toBe('system');
    expect(root().dataset.density).toBe('comfortable');
    expect(localStorage.getItem(LAST_THEME_KEY)).toBe('system');
  });

  it('sin sesión y con un valor no válido en el equipo usa Claro', () => {
    localStorage.setItem(LAST_THEME_KEY, 'azul');
    renderWith(null);
    expect(root().dataset.theme).toBe('light');
  });

  it('si localStorage falla, no rompe y usa Claro', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => renderWith(null)).not.toThrow();
    expect(root().dataset.theme).toBe('light');
    expect(() => renderWith(PREFS)).not.toThrow();
    expect(root().dataset.theme).toBe('dark');
  });
});

// T027: sin destello al entrar. El login cambia `preferences.applied` y el useLayoutEffect escribe data-theme
// en ese mismo commit, antes del pintado; no hace falta esperar a ningún efecto posterior.
describe('useApplyAppearance al iniciar sesión', () => {
  it('aplica el tema del usuario al terminar el act del login', () => {
    const store = setupStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    renderHook(() => useApplyAppearance(), { wrapper });
    expect(root().dataset.theme).toBe('light');
    act(() => {
      store.dispatch(
        login.fulfilled({ accessToken: 'jwt', user: userWith(PREFS) }, '', {
          login: 'a',
          password: 'b',
          persistent: false,
        }),
      );
    });
    expect(root().dataset.theme).toBe('dark');
  });
});
