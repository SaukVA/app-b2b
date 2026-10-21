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

const searchBox = (page: Page) => page.getByRole('searchbox', { name: 'Buscar' });
const lowStockBox = (page: Page) => page.getByRole('checkbox', { name: 'Solo stock bajo' });
const emptyNotice = (page: Page) => page.getByText('Todavía no hay productos');

/** Escribe en la búsqueda y espera la petición que se lanza tras dejar de teclear. */
async function searchFor(page: Page, text: string): Promise<void> {
  const requested = page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === '/api/products' &&
      new URL(req.url()).searchParams.get('q') === text,
  );
  await searchBox(page).fill(text);
  await requested;
}

/**
 * La casilla refleja la dirección, que el router actualiza de forma asíncrona: se pulsa y se espera a que
 * quede marcada (`check()` exige que cambie en el mismo instante del clic).
 */
async function markLowStock(page: Page): Promise<void> {
  await lowStockBox(page).click();
  await expect(lowStockBox(page)).toBeChecked();
}

test.describe('Productos · catálogo pendiente de carga (US2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(emptyNotice(page)).toBeVisible();
  });

  test('se ve el aviso y la búsqueda pide el listado y cambia la dirección', async ({ page }) => {
    await expect(page.getByText('El catálogo se cargará desde el sistema anterior.')).toBeVisible();
    await searchFor(page, 'aceite');
    await expect(page).toHaveURL(/\/productos\?q=aceite$/);
    await expect(emptyNotice(page)).toBeVisible();
  });

  test('recargar conserva la búsqueda y «solo stock bajo»; «Atrás» vuelve a los anteriores', async ({
    page,
  }) => {
    await searchFor(page, 'aceite');
    await markLowStock(page);
    await expect(page).toHaveURL(/\/productos\?q=aceite&lowStock=true$/);

    await page.reload();
    await expect(searchBox(page)).toHaveValue('aceite');
    await expect(lowStockBox(page)).toBeChecked();

    await page.goBack();
    await expect(page).toHaveURL(/\/productos\?q=aceite$/);
    await expect(lowStockBox(page)).not.toBeChecked();
  });

  test('«Atrás» devuelve la búsqueda anterior y la espera no la deshace', async ({ page }) => {
    await searchFor(page, 'aceite');
    await markLowStock(page);
    await searchFor(page, 'café');
    await expect(page).toHaveURL(/q=caf%C3%A9&lowStock=true$/);

    await page.goBack();
    await expect(searchBox(page)).toHaveValue('aceite');
    // Más que la espera de la búsqueda (300 ms): el valor desfasado no reescribe la dirección.
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/\/productos\?q=aceite$/);
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
