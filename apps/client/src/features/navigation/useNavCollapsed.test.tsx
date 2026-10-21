import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { setupStore } from '../../store/store';
import { NAV_COLLAPSED_KEY } from './navigationSlice';
import { useNavCollapsed } from './useNavCollapsed';

function renderUseNavCollapsed() {
  const store = setupStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useNavCollapsed(), { wrapper }).result;
}

beforeEach(() => localStorage.clear());

afterEach(() => jest.restoreAllMocks());

describe('useNavCollapsed', () => {
  it("alternar guarda '1' al plegar y '0' al desplegar", () => {
    const result = renderUseNavCollapsed();
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(NAV_COLLAPSED_KEY)).toBe('1');

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(false);
    expect(localStorage.getItem(NAV_COLLAPSED_KEY)).toBe('0');
  });

  it('sin almacenamiento arranca desplegado y alternar funciona sin lanzar (FR-014)', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const result = renderUseNavCollapsed();
    expect(result.current.collapsed).toBe(false);
    expect(() => act(() => result.current.toggle())).not.toThrow();
    expect(result.current.collapsed).toBe(true);
  });
});
