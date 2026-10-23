import { expect, test, type Page } from '@playwright/test';
import { removeUsers, seedUsers, type SeedUser } from './support/db';

// 009: pantalla provisional de Proveedores. Los proveedores aún no están cargados: el servidor responde vacío.

const PASSWORD = 'secreto123';

async function loginAs(page: Page, login: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(login);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

const loginAsAdmin = (page: Page) => loginAs(page, 'admin', 'admin');
const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Principal' });
const isMobile = () => test.info().project.name === 'mobile';

/**
 * Título, «0 activos», búsqueda, casilla de bajas y, en ancho, las cabeceras del listado. En móvil no hay
 * tabla visible ni tarjetas con el listado vacío, así que tampoco se ve «Plazo».
 */
async function expectSuppliersStructure(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Proveedores' })).toBeVisible();
  await expect(page.getByText('0 activos')).toBeVisible();
  const search = page.getByRole('search', { name: 'Buscar proveedores' });
  await expect(search.getByRole('searchbox', { name: 'Buscar' })).toBeVisible();
  await expect(search.getByRole('checkbox', { name: 'Mostrar dados de baja' })).not.toBeChecked();
  if (isMobile()) {
    await expect(page.getByRole('columnheader', { name: 'Plazo' })).toBeHidden();
    return;
  }
  await expect(
    page.getByRole('table', { name: 'Proveedores' }).getByRole('columnheader'),
  ).toHaveText(['Proveedor', 'Plazo', 'Compras año']);
}

/** Abre Proveedores desde el menú y espera la petición del listado. */
async function openSuppliers(page: Page): Promise<void> {
  const listed = page.waitForRequest((req) => new URL(req.url()).pathname === '/api/suppliers');
  await mainNav(page)
    .getByRole('link', { name: /Proveedores/ })
    .click();
  await expect(page).toHaveURL(/\/proveedores$/);
  await listed;
}

test.describe('Proveedores · abrir y ver su estructura (US1)', () => {
  test('se abre desde el menú, marcado como activo y sin «Pendiente»', async ({ page }) => {
    await loginAsAdmin(page);
    await openSuppliers(page);

    const link = mainNav(page).getByRole('link', { name: /Proveedores/ });
    await expect(link).not.toContainText('Pendiente');
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expectSuppliersStructure(page);
    await expect(page.getByRole('button', { name: /Nuevo proveedor/ })).toHaveCount(0);
  });

  test('en Ajustes › Apariencia, «Pantalla de inicio» ofrece Proveedores', async ({ page }) => {
    await loginAsAdmin(page);
    await mainNav(page).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    const homeScreen = page.getByRole('combobox', { name: 'Pantalla de inicio' });
    await expect(homeScreen.getByRole('option', { name: 'Proveedores' })).toHaveCount(1);
  });
});

function roleUsers(project: string): Record<'almacen' | 'comercial', SeedUser> {
  return {
    almacen: {
      login: `e2e.prov.almacen.${project}@empresa.es`,
      name: 'E2E Almacén',
      role: 'Almacén',
      password: PASSWORD,
    },
    comercial: {
      login: `e2e.prov.comercial.${project}@empresa.es`,
      name: 'E2E Comercial',
      role: 'Comercial',
      password: PASSWORD,
    },
  };
}

test.describe('Proveedores · acceso por rol (US1, FR-002, FR-003)', () => {
  let users: ReturnType<typeof roleUsers>;

  test.beforeAll(async () => {
    users = roleUsers(test.info().project.name);
    await seedUsers(Object.values(users));
  });

  test.afterAll(async () => {
    await removeUsers(Object.values(users).map((user) => user.login));
  });

  test('Almacén (solo ver) ve la misma pantalla que el Administrador', async ({ page }) => {
    await loginAs(page, users.almacen.login, PASSWORD);
    await openSuppliers(page);
    await expectSuppliersStructure(page);
  });

  test('Comercial no ve Proveedores en el menú y la dirección lo lleva a su inicio', async ({
    page,
  }) => {
    await loginAs(page, users.comercial.login, PASSWORD);
    await expect(mainNav(page).getByRole('link', { name: /Proveedores/ })).toHaveCount(0);
    await page.goto('/proveedores');
    await expect(page).not.toHaveURL(/\/proveedores/);
    await expect(page.getByRole('heading', { level: 1, name: 'Proveedores' })).toHaveCount(0);
  });
});
