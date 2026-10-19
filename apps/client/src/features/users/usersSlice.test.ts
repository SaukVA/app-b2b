import type { CreateUserRequest, UserSummary } from '@app/shared';
import { setupStore } from '../../store/store';
import { createUserRequest } from './usersApi';
import { createUser } from './usersSlice';

jest.mock('./usersApi', () => ({
  ...jest.requireActual('./usersApi'),
  createUserRequest: jest.fn(),
}));

const mockedCreate = jest.mocked(createUserRequest);

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
