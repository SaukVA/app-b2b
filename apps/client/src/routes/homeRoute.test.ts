import type { AppModule, AuthUser, HomeScreen, PermissionLevel } from '@app/shared';
import { effectiveHomeScreen, resolveHomeRoute } from './homeRoute';

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
