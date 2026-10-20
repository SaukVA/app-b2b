import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import type { LoginResponse } from '@app/shared';
import { setupStore } from '../../../store/store';
import { loginRequest } from '../authApi';
import { LoginForm } from './LoginForm';

jest.mock('../authApi', () => ({
  ...jest.requireActual('../authApi'),
  loginRequest: jest.fn(),
}));

const mockedLogin = jest.mocked(loginRequest);

const response: LoginResponse = {
  accessToken: 'jwt',
  user: {
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
    preferences: {
      theme: 'light',
      tableDensity: 'comfortable',
      moneyFormat: 'es',
      homeScreen: null,
    },
  },
};

function renderForm() {
  const store = setupStore();
  render(
    <Provider store={store}>
      <LoginForm />
    </Provider>,
  );
  return store;
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Email'), 'ana@empresa.es');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => mockedLogin.mockReset());

describe('LoginForm · validación', () => {
  it('con campos vacíos indica cuáles faltan y no llama a la API', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByText('Introduce tu email')).toBeTruthy();
    expect(screen.getByText('Introduce tu contraseña')).toBeTruthy();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('"¿La has olvidado?" indica que contacte con un administrador sin llamar a la API', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: '¿La has olvidado?' }));
    expect(screen.getByRole('status').textContent).toContain(
      'Contacta con un administrador para restablecer tu contraseña',
    );
    expect(mockedLogin).not.toHaveBeenCalled();
  });
});

describe('LoginForm · envío', () => {
  it('despacha login con las credenciales y guarda la sesión', async () => {
    mockedLogin.mockResolvedValue(response);
    const store = renderForm();
    await userEvent.click(screen.getByLabelText('Mantener la sesión iniciada en este equipo'));
    await fillAndSubmit();
    expect(mockedLogin).toHaveBeenCalledWith({
      login: 'ana@empresa.es',
      password: 'secreto123',
      persistent: true,
      client: 'web',
    });
    expect(store.getState().auth.user?.login).toBe('ana@empresa.es');
  });

  it('deshabilita "Entrar" mientras la petición está en curso', async () => {
    mockedLogin.mockReturnValue(new Promise(() => undefined));
    renderForm();
    await fillAndSubmit();
    expect((screen.getByRole('button', { name: /Entrar/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(mockedLogin).toHaveBeenCalledTimes(1);
  });
});

describe('LoginForm · errores del servidor', () => {
  it('muestra el error del servidor en un Alert', async () => {
    const message = 'Email o contraseña incorrectos. Te quedan 4 intentos.';
    mockedLogin.mockRejectedValue({
      response: { data: { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message } } },
    });
    renderForm();
    await fillAndSubmit();
    expect((await screen.findByRole('alert')).textContent).toContain(message);
  });

  it('distingue el error de conexión', async () => {
    mockedLogin.mockRejectedValue(new Error('Network Error'));
    renderForm();
    await fillAndSubmit();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No se ha podido conectar con el servidor',
    );
  });
});

describe('LoginForm · bloqueo y errores de conexión', () => {
  const fieldsInvalid = () =>
    [screen.getByLabelText('Email'), screen.getByLabelText('Contraseña')].map((field) =>
      field.getAttribute('aria-invalid'),
    );

  it('muestra el mensaje de bloqueo temporal devuelto por la API', async () => {
    const message = 'Demasiados intentos. Vuelve a intentarlo a las 12:15.';
    mockedLogin.mockRejectedValue({
      response: { data: { success: false, error: { code: 'AUTH_ACCOUNT_LOCKED', message } } },
    });
    renderForm();
    await fillAndSubmit();
    expect((await screen.findByRole('alert')).textContent).toBe(message);
  });

  it('con credenciales incorrectas marca los campos', async () => {
    mockedLogin.mockRejectedValue({
      response: {
        data: { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'x' } },
      },
    });
    renderForm();
    await fillAndSubmit();
    await screen.findByRole('alert');
    expect(fieldsInvalid()).toEqual(['true', 'true']);
  });

  it('un error de conexión no marca los campos como erróneos', async () => {
    mockedLogin.mockRejectedValue(new Error('Network Error'));
    renderForm();
    await fillAndSubmit();
    await screen.findByRole('alert');
    expect(fieldsInvalid()).toEqual([null, null]);
  });
});

describe('LoginForm · base de datos no disponible (002 FR-018)', () => {
  const unavailable = {
    response: {
      status: 503,
      data: {
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'No se puede conectar con la base de datos.',
        },
      },
    },
  };

  it('muestra un error de conexión distinto del de credenciales', async () => {
    mockedLogin.mockRejectedValue(unavailable);
    renderForm();
    await fillAndSubmit();
    const text = (await screen.findByRole('alert')).textContent ?? '';
    expect(text).toContain('No se puede conectar con la base de datos');
    expect(text).not.toMatch(/incorrect/i);
  });

  it('no marca los campos como erróneos', async () => {
    mockedLogin.mockRejectedValue(unavailable);
    renderForm();
    await fillAndSubmit();
    await screen.findByRole('alert');
    const invalid = [screen.getByLabelText('Email'), screen.getByLabelText('Contraseña')].map(
      (field) => field.getAttribute('aria-invalid'),
    );
    expect(invalid).toEqual([null, null]);
  });
});
