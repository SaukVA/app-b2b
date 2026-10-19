import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserSummary } from '@app/shared';
import { formatLastAccess, UsersTable } from './UsersTable';

// 19/10/2026 10:00 en Madrid (UTC+2).
const NOW = new Date('2026-10-19T08:00:00Z');

function user(id: string, name: string, patch: Partial<UserSummary> = {}): UserSummary {
  return {
    id,
    name,
    email: `${id}@empresa.es`,
    role: 'Comercial',
    roleName: 'Comercial',
    status: 'Activo',
    lastLoginAt: null,
    ...patch,
  };
}

const USERS = [
  user('ana', 'Ana Pérez', {
    role: 'Administrador',
    roleName: 'Administrador',
    lastLoginAt: '2026-10-19T06:47:00Z',
  }),
  user('bea', 'Bea Gómez', { status: 'Bloqueado', lastLoginAt: '2026-10-18T16:03:00Z' }),
  user('carlos', 'Carlos Ruiz', { roleName: 'Comercial senior' }),
];

function renderTable(handlers: Partial<Record<'onEdit' | 'onResetPassword', jest.Mock>> = {}) {
  render(<UsersTable users={USERS} currentUserId="ana" now={NOW} {...handlers} />);
  return within(screen.getByRole('table', { name: 'Usuarios' }));
}

describe('formatLastAccess', () => {
  it('«Nunca» si no ha entrado', () => {
    expect(formatLastAccess(null, NOW)).toBe('Nunca');
  });

  it('«Hoy» y «Ayer» con la hora de Madrid', () => {
    expect(formatLastAccess('2026-10-19T06:47:00Z', NOW)).toBe('Hoy 08:47');
    expect(formatLastAccess('2026-10-18T16:03:00Z', NOW)).toBe('Ayer 18:03');
  });

  it('el resto de días con fecha y hora de Madrid', () => {
    expect(formatLastAccess('2026-10-01T22:30:00Z', NOW)).toBe('02/10/2026 00:30');
  });
});

describe('UsersTable · contenido (US3, FR-011)', () => {
  it('pinta nombre, email, rol, último acceso y estado de cada usuario', () => {
    const table = renderTable();
    const rows = table.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    const bea = within(rows[1]);
    expect(bea.getByText('Bea Gómez')).toBeTruthy();
    expect(bea.getByText('bea@empresa.es')).toBeTruthy();
    expect(bea.getByText('Comercial')).toBeTruthy();
    expect(bea.getByText('Ayer 18:03')).toBeTruthy();
    expect(bea.getByText('Bloqueado')).toBeTruthy();
    expect(within(rows[2]).getByText('Nunca')).toBeTruthy();
    expect(within(rows[2]).getByText('Comercial senior')).toBeTruthy();
    expect(within(rows[0]).getByText('Activo')).toBeTruthy();
  });

  it('marca «(tú)» solo en la fila del usuario actual', () => {
    const table = renderTable();
    const rows = table.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('(tú)')).toBeTruthy();
    expect(within(rows[1]).queryByText('(tú)')).toBeNull();
  });

  it('también existe la variante de tarjetas para móvil', () => {
    renderTable();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });
});

describe('UsersTable · menú de opciones (US3)', () => {
  it('«Opciones de {nombre}» abre el menú con editar y restablecer contraseña', async () => {
    const userEv = userEvent.setup();
    const onEdit = jest.fn();
    const table = renderTable({ onEdit, onResetPassword: jest.fn() });
    await userEv.click(table.getByRole('button', { name: 'Opciones de Bea Gómez' }));
    const items = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(items).toEqual(['Editar nombre, email o rol', 'Restablecer contraseña']);
    await userEv.click(screen.getByRole('menuitem', { name: 'Editar nombre, email o rol' }));
    expect(onEdit).toHaveBeenCalledWith(USERS[1]);
  });

  it('solo muestra las acciones que recibe', async () => {
    const userEv = userEvent.setup();
    const table = renderTable({ onEdit: jest.fn() });
    await userEv.click(table.getByRole('button', { name: 'Opciones de Carlos Ruiz' }));
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Editar nombre, email o rol',
    ]);
  });
});
