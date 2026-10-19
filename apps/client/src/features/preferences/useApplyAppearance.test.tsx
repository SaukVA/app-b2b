import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import type { AppearancePreferences } from '@app/shared';
import { setupStore } from '../../store/store';
import { useApplyAppearance } from './useApplyAppearance';

const LAST_THEME_KEY = 'appearance.lastTheme';
const PREFS: AppearancePreferences = {
  theme: 'dark',
  tableDensity: 'compact',
  moneyFormat: 'es',
  homeScreen: null,
};

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
