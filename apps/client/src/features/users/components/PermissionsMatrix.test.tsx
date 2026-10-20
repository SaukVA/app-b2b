import { render, screen } from '@testing-library/react';
import type { PermissionLevel, RoleSummary } from '@app/shared';
import { PermissionsMatrix } from './PermissionsMatrix';

const MODULES = ['ventas', 'clientes', 'productos', 'proveedores', 'cobros', 'ajustes'] as const;
const LEVEL: Record<string, PermissionLevel> = { E: 'edit', V: 'view', '—': 'none' };

/** Rol con su columna de FR-020 en el orden de MODULES (p. ej. 'EEVV—…'). */
function role(key: string, order: number, column: string): RoleSummary {
  const levels = Array.from(column).map((value) => LEVEL[value]);
  return {
    key,
    name: key,
    isAdmin: key === 'Administrador',
    order,
    permissions: Object.fromEntries(
      MODULES.map((module, i) => [module, levels[i]]),
    ) as RoleSummary['permissions'],
  };
}

// FR-020: columnas Administrador, Comercial, Almacén, Administración.
const INITIAL_ROLES = [
  role('Administrador', 1, 'EEEEEE'),
  role('Comercial', 2, 'EEV—V—'),
  role('Almacén', 3, 'V—EV——'),
  role('Administración', 4, 'VVVEE—'),
];

const EXPECTED_ROWS = [
  ['Ventas', 'E', 'E', 'V', 'V'],
  ['Clientes', 'E', 'E', '—', 'V'],
  ['Productos', 'E', 'V', 'E', 'V'],
  ['Proveedores', 'E', '—', 'V', 'E'],
  ['Cobros', 'E', 'V', '—', 'E'],
  ['Ajustes', 'E', '—', '—', '—'],
];

function bodyRows(): string[][] {
  const [, ...rows] = screen.getAllByRole('row');
  return rows.map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent ?? ''),
  );
}

function roleHeaders(): HTMLElement[] {
  return screen.getAllByRole('columnheader').slice(1);
}

describe('PermissionsMatrix · contenido (US6, FR-020)', () => {
  it('con los 4 roles iniciales pinta las 6 filas con los valores de FR-020', () => {
    render(<PermissionsMatrix roles={INITIAL_ROLES} />);
    expect(bodyRows()).toEqual(EXPECTED_ROWS);
  });

  it('ordena las columnas por order y un quinto rol añade una columna', () => {
    const supervisor = role('Supervisor', 5, 'VVVVV—');
    render(<PermissionsMatrix roles={[supervisor, ...[...INITIAL_ROLES].reverse()]} />);
    const titles = roleHeaders().map((header) => header.querySelector('abbr')?.title);
    expect(titles).toEqual([
      'Administrador',
      'Comercial',
      'Almacén',
      'Administración',
      'Supervisor',
    ]);
    expect(bodyRows()[0]).toEqual(['Ventas', 'E', 'E', 'V', 'V', 'V']);
  });

  it('un módulo sin valor se muestra como «—» (FR-026)', () => {
    const partial = { ...role('Nuevo', 1, 'EEEEEE'), permissions: { ventas: 'view' } };
    render(<PermissionsMatrix roles={[partial as RoleSummary]} />);
    expect(bodyRows().map((row) => row[1])).toEqual(['V', '—', '—', '—', '—', '—']);
  });
});

describe('PermissionsMatrix · cabeceras, textos y solo lectura (US6)', () => {
  it('cada cabecera de rol abrevia el nombre y lleva el nombre completo en title', () => {
    render(<PermissionsMatrix roles={[...INITIAL_ROLES, role('Supervisor', 5, 'VVVVV—')]} />);
    const abbrs = roleHeaders().map((header) => header.querySelector('abbr'));
    expect(abbrs.map((abbr) => abbr?.textContent)).toEqual([
      'Adm.',
      'Com.',
      'Alm.',
      'Admón.',
      'Sup.',
    ]);
    expect(abbrs[3]?.title).toBe('Administración');
  });

  it('muestra el subtítulo y la leyenda', () => {
    render(<PermissionsMatrix roles={INITIAL_ROLES} />);
    expect(screen.getByText('Guardados en la base de datos. Solo lectura.')).toBeTruthy();
    expect(screen.getByText('E = editar · V = solo ver · — = sin acceso')).toBeTruthy();
  });

  it('no ofrece ningún control editable', () => {
    const { container } = render(<PermissionsMatrix roles={INITIAL_ROLES} />);
    expect(container.querySelectorAll('input, select, textarea, button')).toHaveLength(0);
  });
});
