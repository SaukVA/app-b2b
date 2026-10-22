import type { AppModule, AuthUser, HomeScreen, PermissionLevel } from '@app/shared';
import type * as HomeRouteModule from './homeRoute';
import * as realHomeRoute from './homeRoute';

type Permissions = Record<AppModule, PermissionLevel>;

const NO_ACCESS: Permissions = {
  ventas: 'none',
  clientes: 'none',
  productos: 'none',
  proveedores: 'none',
  cobros: 'none',
  ajustes: 'none',
};

const COMERCIAL: Permissions = {
  ...NO_ACCESS,
  ventas: 'edit',
  clientes: 'edit',
  productos: 'view',
  cobros: 'view',
};

const user = (permissions: Permissions, homeScreen: HomeScreen | null = null): AuthUser => ({
  id: '1',
  login: 'ana@empresa.es',
  name: 'Ana',
  role: 'Rol',
  roleName: 'Rol',
  permissions,
  isBootstrap: false,
  preferences: { theme: 'light', tableDensity: 'comfortable', moneyFormat: 'es', homeScreen },
});

const ALL_IMPLEMENTED = ['ventas', 'clientes', 'productos', 'proveedores', 'cobros', 'ajustes'];

/**
 * Carga ./homeRoute con otra lista de módulos implementados: AVAILABLE_HOME_SCREENS se calcula al cargar
 * el módulo, así que cada lista necesita su propio registro de módulos.
 */
function loadHomeRoute(implemented: readonly string[]): typeof HomeRouteModule {
  let loaded: typeof HomeRouteModule | undefined;
  jest.isolateModules(() => {
    jest.doMock('../../../../packages/shared/src/constants/modules', () => ({
      IMPLEMENTED_MODULES: implemented,
      isModuleImplemented: (module: string) => implemented.includes(module),
    }));
    loaded = jest.requireActual<typeof HomeRouteModule>('./homeRoute');
  });
  if (!loaded) throw new Error('No se pudo cargar ./homeRoute');
  return loaded;
}

// Casos de 004 con los módulos implementados; los de la lista real (005) van al final.
const { effectiveHomeScreen, resolveHomeRoute } = loadHomeRoute(ALL_IMPLEMENTED);

describe('resolveHomeRoute', () => {
  it('prioriza la ruta de origen si el rol puede abrirla', () => {
    expect(resolveHomeRoute(user(COMERCIAL, 'ventas'), '/clientes')).toBe('/clientes');
  });

  it('sin origen usa la pantalla de inicio elegida si está permitida', () => {
    expect(resolveHomeRoute(user(COMERCIAL, 'clientes'), null)).toBe('/clientes');
  });

  it.each<[string, HomeScreen | null]>([
    ['sin permiso', 'proveedores'],
    ['que todavía no existe', 'panel'],
    ['sin elegir', null],
  ])('con una pantalla elegida %s usa /productos si el rol la ve', (_case, homeScreen) => {
    expect(resolveHomeRoute(user(COMERCIAL, homeScreen), null)).toBe('/productos');
  });

  it('ignora un origen que el rol no puede abrir o que no es una pantalla', () => {
    expect(resolveHomeRoute(user(COMERCIAL), '/proveedores')).toBe('/productos');
    expect(resolveHomeRoute(user(COMERCIAL), '/login')).toBe('/productos');
  });

  it('un rol sin Productos va a la primera pantalla que puede ver (Ventas)', () => {
    expect(resolveHomeRoute(user({ ...NO_ACCESS, ventas: 'view' }), null)).toBe('/ventas');
  });

  it('un rol sin ninguna pantalla va a Ajustes › Apariencia', () => {
    expect(resolveHomeRoute(user(NO_ACCESS), null)).toBe('/ajustes/apariencia');
  });
});

describe('effectiveHomeScreen', () => {
  it('devuelve la pantalla elegida si está permitida', () => {
    expect(effectiveHomeScreen(user(COMERCIAL, 'clientes'))).toBe('clientes');
  });

  it('si la elegida no está permitida o no hay, devuelve la pantalla por defecto efectiva', () => {
    expect(effectiveHomeScreen(user(COMERCIAL, 'proveedores'))).toBe('productos');
    expect(effectiveHomeScreen(user(COMERCIAL))).toBe('productos');
    expect(effectiveHomeScreen(user({ ...NO_ACCESS, ventas: 'view' }))).toBe('ventas');
  });

  it('devuelve null si el rol no ve ninguna pantalla', () => {
    expect(effectiveHomeScreen(user(NO_ACCESS))).toBeNull();
  });
});

describe('resolveHomeRoute con módulos pendientes (lista real, 005)', () => {
  it('descarta un origen pendiente aunque el rol pueda verlo', () => {
    expect(realHomeRoute.resolveHomeRoute(user(COMERCIAL), '/clientes')).toBe('/productos');
  });

  it('un rol que ve Productos (006) aterriza en /productos', () => {
    expect(realHomeRoute.resolveHomeRoute(user(COMERCIAL), null)).toBe('/productos');
  });

  it('un rol sin Productos ni otra pantalla implementada va a Ajustes › Apariencia', () => {
    const sinProductos = user({ ...COMERCIAL, productos: 'none', proveedores: 'edit' });
    expect(realHomeRoute.resolveHomeRoute(sinProductos, null)).toBe('/ajustes/apariencia');
  });

  it('ignora una pantalla de inicio guardada que está pendiente', () => {
    expect(realHomeRoute.resolveHomeRoute(user(COMERCIAL, 'ventas'), null)).toBe('/productos');
    expect(realHomeRoute.effectiveHomeScreen(user(COMERCIAL, 'ventas'))).toBe('productos');
  });
});
