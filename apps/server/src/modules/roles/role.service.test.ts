import { APP_MODULES } from '@app/shared';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { RoleModel } from './role.model';
import { ensureDefaultRoles, findRole, listRoles } from './role.service';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('ensureDefaultRoles', () => {
  it('en una base vacía crea los 4 roles con los valores de FR-020', async () => {
    await ensureDefaultRoles();
    const roles = await listRoles();
    expect(roles.map((role) => [role.key, role.order, role.isAdmin])).toEqual([
      ['Administrador', 1, true],
      ['Comercial', 2, false],
      ['Almacén', 3, false],
      ['Administración', 4, false],
    ]);
    expect(roles[1].permissions).toEqual({
      ventas: 'edit',
      clientes: 'edit',
      productos: 'view',
      proveedores: 'none',
      cobros: 'view',
      ajustes: 'none',
    });
  });

  it('es idempotente: una segunda llamada no duplica nada', async () => {
    await ensureDefaultRoles();
    await ensureDefaultRoles();
    expect(await RoleModel.countDocuments()).toBe(4);
  });

  it('no sobrescribe un cambio guardado', async () => {
    await ensureDefaultRoles();
    await RoleModel.updateOne({ key: 'Almacén' }, { 'permissions.clientes': 'view' });
    await ensureDefaultRoles();
    expect((await findRole('Almacén'))?.permissions.clientes).toBe('view');
  });

  it('fuerza edit en todos los módulos del rol isAdmin (FR-027)', async () => {
    await ensureDefaultRoles();
    await RoleModel.updateOne({ key: 'Administrador' }, { 'permissions.ajustes': 'none' });
    await ensureDefaultRoles();
    const admin = await findRole('Administrador');
    expect(APP_MODULES.every((module) => admin?.permissions[module] === 'edit')).toBe(true);
  });
});

describe('listRoles', () => {
  it('ordena por order y completa los módulos ausentes como none', async () => {
    await RoleModel.create({
      key: 'Visitas',
      name: 'Visitas',
      order: 0,
      permissions: { ventas: 'view' },
    });
    await RoleModel.create({ key: 'Otro', name: 'Otro', order: 9, permissions: {} });
    const [first, second] = await listRoles();
    expect(first).toEqual({
      key: 'Visitas',
      name: 'Visitas',
      isAdmin: false,
      order: 0,
      permissions: {
        ventas: 'view',
        clientes: 'none',
        productos: 'none',
        proveedores: 'none',
        cobros: 'none',
        ajustes: 'none',
      },
    });
    expect(second.key).toBe('Otro');
  });
});

describe('findRole', () => {
  it('devuelve null si la clave no existe', async () => {
    await ensureDefaultRoles();
    expect(await findRole('Inexistente')).toBeNull();
  });
});
