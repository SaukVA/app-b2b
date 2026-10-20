import type { PermissionSet } from '@app/shared';
import { clearTestDb, setTestEnv, startTestDb, stopTestDb } from '../../utils/testDb';
import { UserModel } from '../users/user.model';
import { toAppearancePreferences } from './preferences.mapper';
import { updatePreferences } from './preferences.service';

setTestEnv();

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const COMERCIAL: PermissionSet = {
  ventas: 'edit',
  clientes: 'edit',
  productos: 'view',
  cobros: 'view',
};
const DEFAULTS = {
  theme: 'light',
  tableDensity: 'comfortable',
  moneyFormat: 'es',
  homeScreen: null,
};

function createUser(isBootstrap = false) {
  return UserModel.create({
    login: isBootstrap ? 'admin' : 'ana@empresa.es',
    name: 'Ana',
    passwordHash: 'hash',
    role: isBootstrap ? 'Administrador' : 'Comercial',
    status: 'Activo',
    isBootstrap,
  });
}

describe('toAppearancePreferences', () => {
  it('un usuario sin preferencias tiene los valores por defecto', async () => {
    expect(toAppearancePreferences(await createUser())).toEqual(DEFAULTS);
  });
});

describe('updatePreferences', () => {
  it('guarda solo el campo recibido y devuelve las 4 preferencias resueltas', async () => {
    const user = await createUser();
    await UserModel.updateOne({ _id: user._id }, { moneyFormat: 'en' });

    const prefs = await updatePreferences(user.id, COMERCIAL, { theme: 'dark' });

    expect(prefs).toEqual({ ...DEFAULTS, theme: 'dark', moneyFormat: 'en' });
    const stored = await UserModel.findById(user._id).lean().orFail();
    expect(stored).toMatchObject({ theme: 'dark', moneyFormat: 'en', tableDensity: null });
  });

  it('null vuelve al valor por defecto', async () => {
    const user = await createUser();
    await updatePreferences(user.id, COMERCIAL, { tableDensity: 'compact' });

    const prefs = await updatePreferences(user.id, COMERCIAL, { tableDensity: null });

    expect(prefs.tableDensity).toBe('comfortable');
  });

  it('funciona con la cuenta inicial', async () => {
    const admin = await createUser(true);

    const prefs = await updatePreferences(admin.id, { ajustes: 'edit' }, { theme: 'system' });

    expect(prefs.theme).toBe('system');
  });
});
