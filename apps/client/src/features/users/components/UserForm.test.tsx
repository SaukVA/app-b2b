import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ADMIN_ROLE_KEY, type RoleSummary, type UserSummary } from '@app/shared';
import { UserForm } from './UserForm';

function role(key: string, order: number): RoleSummary {
  const level = key === ADMIN_ROLE_KEY ? 'edit' : 'view';
  return {
    key,
    name: key,
    isAdmin: key === ADMIN_ROLE_KEY,
    order,
    permissions: {
      ventas: level,
      clientes: level,
      productos: level,
      proveedores: level,
      cobros: level,
      ajustes: key === ADMIN_ROLE_KEY ? 'edit' : 'none',
    },
  };
}

const ROLES = [role('Administrador', 1), role('Comercial', 2), role('Almacén', 3)];

const BEA: UserSummary = {
  id: 'u1',
  name: 'Bea Gómez',
  email: 'bea@empresa.es',
  role: 'Comercial',
  roleName: 'Comercial',
  status: 'Activo',
  lastLoginAt: null,
};

function renderFirstAdmin(onSubmit = jest.fn()) {
  render(<UserForm firstAdmin roles={ROLES} onSubmit={onSubmit} />);
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

type Outcome = 'saved' | 'connectionError' | 'error';

function renderCreate(outcome: Outcome = 'saved') {
  const onSubmit = jest.fn().mockResolvedValue(outcome);
  render(<UserForm roles={ROLES} onSubmit={onSubmit} />);
  return onSubmit;
}

async function fillNewUser(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Bea Gómez');
  await user.type(screen.getByLabelText('Email'), 'bea@empresa.es');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Rol' }), 'Almacén');
  await user.type(screen.getByLabelText('Contraseña inicial'), 'secreto123');
}

function valueOf(label: string): string {
  return (screen.getByLabelText(label) as HTMLInputElement | HTMLSelectElement).value;
}

describe('UserForm · alta normal (US2)', () => {
  it('el Select muestra los roles recibidos en su orden', () => {
    renderCreate();
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Administrador', 'Comercial', 'Almacén']);
    expect(screen.getByRole('button', { name: 'Crear usuario' })).toBeTruthy();
  });

  it('el envío incluye el rol elegido', async () => {
    const user = userEvent.setup();
    const onSubmit = renderCreate();
    await fillNewUser(user);
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Bea Gómez',
      email: 'bea@empresa.es',
      role: 'Almacén',
      password: 'secreto123',
    });
  });

  it('muestra el error del servidor en un Alert', () => {
    render(<UserForm roles={ROLES} onSubmit={jest.fn()} error="Ya existe un usuario con ese email." />);
    expect(screen.getByRole('alert').textContent).toContain('Ya existe un usuario con ese email.');
  });
});

describe('UserForm · después de enviar (US2)', () => {
  it('si se guarda, limpia el formulario salvo el rol', async () => {
    const user = userEvent.setup();
    renderCreate('saved');
    await fillNewUser(user);
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(valueOf('Nombre')).toBe('');
    expect(valueOf('Email')).toBe('');
    expect(valueOf('Contraseña inicial')).toBe('');
    expect(valueOf('Rol')).toBe('Almacén');
  });

  it('con error de conexión conserva lo escrito salvo la contraseña', async () => {
    const user = userEvent.setup();
    renderCreate('connectionError');
    await fillNewUser(user);
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(valueOf('Nombre')).toBe('Bea Gómez');
    expect(valueOf('Email')).toBe('bea@empresa.es');
    expect(valueOf('Rol')).toBe('Almacén');
    expect(valueOf('Contraseña inicial')).toBe('');
  });

  it('con otro error conserva todo lo escrito', async () => {
    const user = userEvent.setup();
    renderCreate('error');
    await fillNewUser(user);
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }));
    expect(valueOf('Email')).toBe('bea@empresa.es');
    expect(valueOf('Contraseña inicial')).toBe('secreto123');
  });
});

function renderEdit() {
  const onSubmit = jest.fn().mockResolvedValue('saved');
  render(<UserForm mode="edit" user={BEA} roles={ROLES} onSubmit={onSubmit} />);
  return onSubmit;
}

describe('UserForm · edición (US2, FR-024)', () => {
  it('precarga nombre, email y rol y no muestra la contraseña', () => {
    renderEdit();
    expect(valueOf('Nombre')).toBe('Bea Gómez');
    expect(valueOf('Email')).toBe('bea@empresa.es');
    expect(valueOf('Rol')).toBe('Comercial');
    expect(screen.queryByLabelText('Contraseña inicial')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
  });

  it('envía solo los campos que cambian, normalizados', async () => {
    const user = userEvent.setup();
    const onSubmit = renderEdit();
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), ' Beatriz@Empresa.es ');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'beatriz@empresa.es' });
  });

  it('valida con las mismas reglas que el alta', async () => {
    const user = userEvent.setup();
    const onSubmit = renderEdit();
    await user.clear(screen.getByLabelText('Nombre'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBe('true');
  });

  it('sin cambios no envía nada', async () => {
    const user = userEvent.setup();
    const onSubmit = renderEdit();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('No hay cambios que guardar.');
  });
});
