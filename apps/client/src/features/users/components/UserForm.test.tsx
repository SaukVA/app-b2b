import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ADMIN_ROLE_KEY } from '@app/shared';
import { UserForm } from './UserForm';

const ROLE_OPTIONS = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Comercial', label: 'Comercial' },
];

function renderFirstAdmin(onSubmit = jest.fn()) {
  render(<UserForm firstAdmin roleOptions={ROLE_OPTIONS} onSubmit={onSubmit} />);
  return onSubmit;
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez');
  await user.type(screen.getByLabelText('Email'), 'ana@empresa.es');
  await user.type(screen.getByLabelText('Contraseña inicial'), 'secreto123');
}

describe('UserForm · alta del primer Administrador (US1)', () => {
  it('muestra el rol fijo «Administrador» de solo lectura con su ayuda', () => {
    renderFirstAdmin();
    const role = screen.getByLabelText('Rol') as HTMLInputElement;
    expect(role.value).toBe('Administrador');
    expect(role.readOnly).toBe(true);
    expect(screen.getByText('El primer usuario tiene que ser Administrador.')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Rol' })).toBeNull();
  });

  it('el botón dice «Crear Administrador»', () => {
    renderFirstAdmin();
    expect(screen.getByRole('button', { name: 'Crear Administrador' })).toBeTruthy();
  });

  it('muestra la ayuda de la contraseña inicial', () => {
    renderFirstAdmin();
    expect(
      screen.getByText('Mínimo 8 caracteres. No hace falta cambiarla en el primer acceso.'),
    ).toBeTruthy();
  });
});

describe('UserForm · validación en cliente (US1)', () => {
  it('no envía con campos vacíos e indica cada campo que falla', async () => {
    const user = userEvent.setup();
    const onSubmit = renderFirstAdmin();
    await user.click(screen.getByRole('button', { name: 'Crear Administrador' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Contraseña inicial').getAttribute('aria-invalid')).toBe('true');
  });

  it('no envía con una contraseña de menos de 8 caracteres', async () => {
    const user = userEvent.setup();
    const onSubmit = renderFirstAdmin();
    await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Email'), 'ana@empresa.es');
    await user.type(screen.getByLabelText('Contraseña inicial'), '1234567');
    await user.click(screen.getByRole('button', { name: 'Crear Administrador' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Mínimo 8 caracteres.')).toBeTruthy();
  });

  it('no envía con un email sin formato', async () => {
    const user = userEvent.setup();
    const onSubmit = renderFirstAdmin();
    await fillValid(user);
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'ana@empresa');
    await user.click(screen.getByRole('button', { name: 'Crear Administrador' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('UserForm · envío (US1)', () => {
  it('al enviar llama a onSubmit con role: ADMIN_ROLE_KEY y el email normalizado', async () => {
    const user = userEvent.setup();
    const onSubmit = renderFirstAdmin();
    await user.type(screen.getByLabelText('Nombre'), '  Ana Pérez ');
    await user.type(screen.getByLabelText('Email'), ' Ana@Empresa.ES ');
    await user.type(screen.getByLabelText('Contraseña inicial'), 'secreto123');
    await user.click(screen.getByRole('button', { name: 'Crear Administrador' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: 'ana@empresa.es',
      role: ADMIN_ROLE_KEY,
      password: 'secreto123',
    });
  });

  it('un solo envío aunque se pulse varias veces mientras guarda', async () => {
    const user = userEvent.setup();
    const onSubmit = renderFirstAdmin(jest.fn(() => new Promise<void>(() => undefined)));
    await fillValid(user);
    const button = screen.getByRole('button', { name: 'Crear Administrador' });
    await user.click(button);
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
