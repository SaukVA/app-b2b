import type { RoleSummary } from '@app/shared';
import { setupStore } from '../../store/store';
import { fetchRoles } from './rolesApi';
import { loadRoles } from './rolesSlice';

jest.mock('./rolesApi', () => ({ fetchRoles: jest.fn() }));

const mockedFetchRoles = jest.mocked(fetchRoles);

const ROLES: RoleSummary[] = [
  {
    key: 'Administrador',
    name: 'Administrador',
    isAdmin: true,
    order: 1,
    permissions: {
      ventas: 'edit',
      clientes: 'edit',
      productos: 'edit',
      proveedores: 'edit',
      cobros: 'edit',
      ajustes: 'edit',
    },
  },
];

beforeEach(() => mockedFetchRoles.mockReset());

describe('rolesSlice', () => {
  it('estado inicial', () => {
    expect(setupStore().getState().roles).toEqual({ items: [], status: 'idle', error: null });
  });

  it('pending: pasa a loading y limpia el error', () => {
    mockedFetchRoles.mockReturnValue(new Promise(() => undefined));
    const store = setupStore();
    void store.dispatch(loadRoles());
    expect(store.getState().roles).toMatchObject({ status: 'loading', error: null });
  });

  it('fulfilled: guarda los roles', async () => {
    mockedFetchRoles.mockResolvedValue(ROLES);
    const store = setupStore();
    await store.dispatch(loadRoles());
    expect(store.getState().roles).toEqual({ items: ROLES, status: 'succeeded', error: null });
  });

  it('rejected: guarda el mensaje del envelope de error', async () => {
    mockedFetchRoles.mockRejectedValue({
      response: {
        data: {
          success: false,
          error: {
            code: 'AUTH_FORBIDDEN',
            message: 'No tienes permiso para realizar esta acción.',
          },
        },
      },
    });
    const store = setupStore();
    await store.dispatch(loadRoles());
    expect(store.getState().roles).toMatchObject({
      status: 'failed',
      error: 'No tienes permiso para realizar esta acción.',
    });
  });
});
