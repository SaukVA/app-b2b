import type { AuthUser, CreateUserRequest, DesktopBridge, UserSummary } from '@app/shared';
import { setupStore } from '../../store/store';
import { fetchMe } from '../auth/authApi';
import {
  createUserRequest,
  fetchUsers,
  resetUserPasswordRequest,
  setUserStatusRequest,
  updateUserRequest,
} from './usersApi';
import { createUser, loadUsers, resetUserPassword, setUserStatus, updateUser } from './usersSlice';

jest.mock('./usersApi', () => ({
  ...jest.requireActual('./usersApi'),
  createUserRequest: jest.fn(),
  updateUserRequest: jest.fn(),
  fetchUsers: jest.fn(),
  setUserStatusRequest: jest.fn(),
  resetUserPasswordRequest: jest.fn(),
}));
jest.mock('../auth/authApi', () => ({
  ...jest.requireActual('../auth/authApi'),
  fetchMe: jest.fn(),
}));

const mockedCreate = jest.mocked(createUserRequest);
const mockedUpdate = jest.mocked(updateUserRequest);
const mockedFetch = jest.mocked(fetchUsers);

function summary(name: string): UserSummary {
  return {
    id: name,
    name,
    email: `${name.toLowerCase()}@empresa.es`,
    role: 'Comercial',
    roleName: 'Comercial',
    status: 'Activo',
    lastLoginAt: null,
  };
}

const BODY: CreateUserRequest = {
  name: 'Bea',
  email: 'bea@empresa.es',
  role: 'Comercial',
  password: 'secreto123',
};

beforeEach(() => mockedCreate.mockReset());

describe('usersSlice · createUser', () => {
  it('estado inicial', () => {
    expect(setupStore().getState().users).toEqual({
      items: [],
      status: 'idle',
      error: null,
      saving: false,
    });
  });

  it('pending: saving a true y limpia el error', () => {
    mockedCreate.mockReturnValue(new Promise(() => undefined));
    const store = setupStore();
    void store.dispatch(createUser(BODY));
    expect(store.getState().users).toMatchObject({ saving: true, error: null });
  });
});

describe('usersSlice · resultado de createUser', () => {
  it('fulfilled: añade el usuario a items ordenado por nombre y devuelve la respuesta', async () => {
    mockedCreate.mockResolvedValue({ user: summary('Bea'), bootstrapRetired: false });
    const store = setupStore({
      users: {
        items: [summary('Álvaro'), summary('Carlos')],
        status: 'succeeded',
        error: null,
        saving: false,
      },
    });
    const result = await store.dispatch(createUser(BODY)).unwrap();
    expect(result.bootstrapRetired).toBe(false);
    expect(store.getState().users.items.map((user) => user.name)).toEqual([
      'Álvaro',
      'Bea',
      'Carlos',
    ]);
    expect(store.getState().users.saving).toBe(false);
  });

  it('rejected: guarda el mensaje del envelope de error', async () => {
    mockedCreate.mockRejectedValue({
      response: {
        data: {
          success: false,
          error: { code: 'USER_EMAIL_TAKEN', message: 'Ya existe un usuario con ese email.' },
        },
      },
    });
    const store = setupStore();
    await store.dispatch(createUser(BODY));
    expect(store.getState().users).toMatchObject({
      saving: false,
      error: 'Ya existe un usuario con ese email.',
    });
  });
});

describe('usersSlice · updateUser (US2)', () => {
  it('sustituye el usuario en items y reordena por nombre', async () => {
    mockedUpdate.mockResolvedValue({ ...summary('Bea'), id: 'Álvaro', name: 'Zoe' });
    const store = setupStore({
      users: {
        items: [summary('Álvaro'), summary('Carlos')],
        status: 'succeeded',
        error: null,
        saving: false,
      },
    });
    await store.dispatch(updateUser({ id: 'Álvaro', body: { name: 'Zoe' } }));
    expect(mockedUpdate).toHaveBeenCalledWith('Álvaro', { name: 'Zoe' });
    expect(store.getState().users.items.map((user) => user.name)).toEqual(['Carlos', 'Zoe']);
    expect(store.getState().users.saving).toBe(false);
  });

  it('rejected: guarda el mensaje del envelope de error', async () => {
    mockedUpdate.mockRejectedValue({
      response: {
        data: {
          success: false,
          error: { code: 'USER_EMAIL_TAKEN', message: 'Ya existe un usuario con ese email.' },
        },
      },
    });
    const store = setupStore();
    await store.dispatch(updateUser({ id: 'x', body: { email: 'ana@empresa.es' } }));
    expect(store.getState().users).toMatchObject({
      saving: false,
      error: 'Ya existe un usuario con ese email.',
    });
  });
});

describe('usersSlice · loadUsers (US3)', () => {
  it('pending: pasa a loading y limpia el error', () => {
    mockedFetch.mockReturnValue(new Promise(() => undefined));
    const store = setupStore();
    void store.dispatch(loadUsers());
    expect(store.getState().users).toMatchObject({ status: 'loading', error: null });
  });

  it('fulfilled: guarda el listado', async () => {
    const users = [summary('Álvaro'), summary('Bea')];
    mockedFetch.mockResolvedValue(users);
    const store = setupStore();
    await store.dispatch(loadUsers());
    expect(store.getState().users).toMatchObject({ items: users, status: 'succeeded' });
  });

  it('rejected: pasa a failed con el mensaje del envelope', async () => {
    mockedFetch.mockRejectedValue({
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
    await store.dispatch(loadUsers());
    expect(store.getState().users).toMatchObject({
      status: 'failed',
      error: 'No tienes permiso para realizar esta acción.',
    });
  });
});

describe('usersSlice · setUserStatus (US4)', () => {
  it('sustituye el usuario con su estado nuevo', async () => {
    jest.mocked(setUserStatusRequest).mockResolvedValue({ ...summary('Bea'), status: 'Bloqueado' });
    const store = setupStore({
      users: { items: [summary('Bea')], status: 'succeeded', error: null, saving: false },
    });
    await store.dispatch(setUserStatus({ id: 'Bea', status: 'Bloqueado' }));
    expect(setUserStatusRequest).toHaveBeenCalledWith('Bea', 'Bloqueado');
    expect(store.getState().users.items[0].status).toBe('Bloqueado');
  });
});

describe('usersSlice · cambio de rol propio (US4, research R1)', () => {
  const ME = { id: 'Bea', login: 'bea@empresa.es', name: 'Bea', role: 'Comercial' } as AuthUser;

  function storeWithMe() {
    return setupStore({ auth: { user: ME, accessToken: 'jwt', status: 'succeeded', error: null } });
  }

  beforeEach(() => jest.mocked(fetchMe).mockReset().mockResolvedValue(ME));

  it('si cambia el rol del usuario actual, recarga su sesión (loadMe)', async () => {
    mockedUpdate.mockResolvedValue({ ...summary('Bea'), role: 'Almacén' });
    await storeWithMe().dispatch(updateUser({ id: 'Bea', body: { role: 'Almacén' } }));
    expect(fetchMe).toHaveBeenCalledTimes(1);
  });

  it('no recarga la sesión si el cambio es de otro usuario o no toca el rol', async () => {
    mockedUpdate.mockResolvedValue(summary('Bea'));
    const store = storeWithMe();
    await store.dispatch(updateUser({ id: 'Carlos', body: { role: 'Almacén' } }));
    await store.dispatch(updateUser({ id: 'Bea', body: { name: 'Beatriz' } }));
    expect(fetchMe).not.toHaveBeenCalled();
  });
});

const SELF = { id: 'Bea', login: 'bea@empresa.es', name: 'Bea', role: 'Comercial' } as AuthUser;
const mockedReset = jest.mocked(resetUserPasswordRequest);

function storeWithSelf() {
  return setupStore({ auth: { user: SELF, accessToken: 'jwt', status: 'succeeded', error: null } });
}

function resetFor(id: string) {
  return resetUserPassword({ id, password: 'nueva1234' });
}

describe('usersSlice · resetUserPassword (US5)', () => {
  beforeEach(() => mockedReset.mockReset().mockResolvedValue(undefined));

  it('llama al endpoint y, con otro usuario, mantiene la sesión', async () => {
    const store = storeWithSelf();
    const result = await store.dispatch(resetFor('Carlos'));
    expect(mockedReset).toHaveBeenCalledWith('Carlos', 'nueva1234');
    expect(result.payload).toEqual({ signedOut: false });
    expect(store.getState().auth.user).toEqual(SELF);
  });

  it('rejected: devuelve el mensaje del envelope de error', async () => {
    mockedReset.mockRejectedValue({
      response: {
        data: {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'El usuario no existe.' },
        },
      },
    });
    const result = await storeWithSelf().dispatch(resetFor('x'));
    expect(result.payload).toBe('El usuario no existe.');
  });
});

describe('usersSlice · restablecer la propia contraseña (US5, research R1)', () => {
  beforeEach(() => mockedReset.mockReset().mockResolvedValue(undefined));
  afterEach(() => {
    delete window.desktop;
  });

  it('limpia la sesión y el refresh token de escritorio', async () => {
    const clearRefreshToken = jest.fn().mockResolvedValue(undefined);
    window.desktop = { isDesktop: true, clearRefreshToken } as unknown as DesktopBridge;
    const store = storeWithSelf();
    const result = await store.dispatch(resetFor('Bea'));
    expect(result.payload).toEqual({ signedOut: true });
    expect(clearRefreshToken).toHaveBeenCalledTimes(1);
    expect(store.getState().auth).toMatchObject({ user: null, accessToken: null });
  });
});
