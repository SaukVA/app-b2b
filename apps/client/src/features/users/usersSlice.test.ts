import type { CreateUserRequest, UserSummary } from '@app/shared';
import { setupStore } from '../../store/store';
import { createUserRequest, fetchUsers, updateUserRequest } from './usersApi';
import { createUser, loadUsers, updateUser } from './usersSlice';

jest.mock('./usersApi', () => ({
  ...jest.requireActual('./usersApi'),
  createUserRequest: jest.fn(),
  updateUserRequest: jest.fn(),
  fetchUsers: jest.fn(),
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
