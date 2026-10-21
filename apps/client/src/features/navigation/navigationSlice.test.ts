import {
  NAV_COLLAPSED_KEY,
  collapsedToggled,
  navigationReducer,
  selectNavCollapsed,
} from './navigationSlice';
import { setupStore } from '../../store/store';

const init = () => navigationReducer(undefined, { type: 'init' });

beforeEach(() => localStorage.clear());

afterEach(() => jest.restoreAllMocks());

describe('navigationSlice', () => {
  it('sin valor en el equipo arranca desplegado', () => {
    expect(init().collapsed).toBe(false);
  });

  it("con '1' en el equipo arranca plegado", () => {
    localStorage.setItem(NAV_COLLAPSED_KEY, '1');
    expect(init().collapsed).toBe(true);
  });

  it("con '0' u otro valor arranca desplegado", () => {
    localStorage.setItem(NAV_COLLAPSED_KEY, '0');
    expect(init().collapsed).toBe(false);
    localStorage.setItem(NAV_COLLAPSED_KEY, 'si');
    expect(init().collapsed).toBe(false);
  });

  it('collapsedToggled invierte collapsed', () => {
    const plegado = navigationReducer({ collapsed: false }, collapsedToggled());
    expect(plegado.collapsed).toBe(true);
    expect(navigationReducer(plegado, collapsedToggled()).collapsed).toBe(false);
  });

  it('si leer el equipo falla, arranca desplegado sin lanzar (FR-014)', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(init().collapsed).toBe(false);
  });

  it('está registrado en la store y selectNavCollapsed lo lee', () => {
    localStorage.setItem(NAV_COLLAPSED_KEY, '1');
    expect(selectNavCollapsed(setupStore().getState())).toBe(true);
  });
});
