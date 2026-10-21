import { expect, test, type Page } from '@playwright/test';
import { removeUsers, seedUsers, type SeedUser } from './support/db';

// 006: pantalla provisional de Productos. El catálogo aún no está cargado: el servidor responde vacío.

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

/** Título, «0 referencias», filtros y, en ancho, las cabeceras del listado (en móvil no hay tarjetas). */
async function expectProductsStructure(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  await expect(page.getByText('0 referencias')).toBeVisible();
  const filters = page.getByRole('search', { name: 'Filtrar productos' });
  await expect(filters.getByRole('searchbox', { name: 'Buscar' })).toBeVisible();
  for (const name of ['Categoría', 'Subcategoría', 'Proveedor']) {
    await expect(filters.getByRole('combobox', { name, exact: true })).toBeVisible();
  }
  await expect(filters.getByRole('checkbox', { name: 'Solo stock bajo' })).toBeVisible();
  if (isMobile()) return;
  await expect(page.getByRole('table', { name: 'Productos' }).getByRole('columnheader')).toHaveText(
    ['Código', 'Producto', 'Categoría', 'Stock', 'Precio', 'Estado'],
  );
}

test.describe('Productos · abrir y ver su estructura (US1)', () => {
  test('tras el login aterriza en Productos, marcado en el menú y sin «Pendiente»', async ({
    page,
  }) => {
    const listed = page.waitForRequest((req) => req.url().includes('/api/products'));
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/productos$/);
    await listed;

    const link = mainNav(page).getByRole('link', { name: /Productos/ });
    await expect(link).not.toContainText('Pendiente');
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expectProductsStructure(page);
    await expect(page.getByRole('button', { name: /Importar CSV|Nuevo producto/ })).toHaveCount(0);
  });

  test('en Ajustes › Apariencia, «Pantalla de inicio» ofrece Productos', async ({ page }) => {
    await loginAsAdmin(page);
    await mainNav(page).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    const homeScreen = page.getByRole('combobox', { name: 'Pantalla de inicio' });
    await expect(homeScreen.getByRole('option', { name: 'Productos' })).toHaveCount(1);
  });
});

test.describe.serial('Productos · rol de solo ver (FR-003)', () => {
  let comercial: SeedUser;

  test.beforeAll(async () => {
    comercial = {
      login: `e2e.productos.${test.info().project.name}@empresa.es`,
      name: 'E2E Productos Comercial',
      role: 'Comercial',
      password: PASSWORD,
    };
    await seedUsers([comercial]);
  });

  test.afterAll(async () => {
    await removeUsers([comercial.login]);
  });

  test('un Comercial ve la misma pantalla que el Administrador', async ({ page }) => {
    await loginAs(page, comercial.login, PASSWORD);
    await expect(page).toHaveURL(/\/productos$/);
    await expectProductsStructure(page);
  });
});
