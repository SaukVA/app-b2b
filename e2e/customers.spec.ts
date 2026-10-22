import { expect, test, type Page } from '@playwright/test';
import { removeUsers, seedUsers, type SeedUser } from './support/db';

// 007: pantalla provisional de Clientes. La cartera aún no está cargada: el servidor responde vacío.

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

/** Título, «0 fichas», búsqueda y, en ancho, las cabeceras del listado (en móvil no hay tarjetas). */
async function expectCustomersStructure(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await expect(page.getByText('0 fichas')).toBeVisible();
  const search = page.getByRole('search', { name: 'Buscar clientes' });
  await expect(search.getByRole('searchbox', { name: 'Buscar' })).toBeVisible();
  if (isMobile()) return;
  await expect(page.getByRole('table', { name: 'Clientes' }).getByRole('columnheader')).toHaveText([
    'Cliente',
    'Riesgo usado',
    'Saldo',
    'Último pedido',
  ]);
}

/** Abre Clientes desde el menú y espera la petición del listado. */
async function openCustomers(page: Page): Promise<void> {
  const listed = page.waitForRequest((req) => new URL(req.url()).pathname === '/api/customers');
  await mainNav(page)
    .getByRole('link', { name: /Clientes/ })
    .click();
  await expect(page).toHaveURL(/\/clientes$/);
  await listed;
}

test.describe('Clientes · abrir y ver su estructura (US1)', () => {
  test('se abre desde el menú, marcado como activo y sin «Pendiente»', async ({ page }) => {
    await loginAsAdmin(page);
    await openCustomers(page);

    const link = mainNav(page).getByRole('link', { name: /Clientes/ });
    await expect(link).not.toContainText('Pendiente');
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expectCustomersStructure(page);
    await expect(page.getByRole('button', { name: /Nuevo cliente/ })).toHaveCount(0);
  });

  test('en Ajustes › Apariencia, «Pantalla de inicio» ofrece Clientes', async ({ page }) => {
    await loginAsAdmin(page);
    await mainNav(page).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    const homeScreen = page.getByRole('combobox', { name: 'Pantalla de inicio' });
    await expect(homeScreen.getByRole('option', { name: 'Clientes' })).toHaveCount(1);
  });
});

function roleUsers(project: string): Record<'administracion' | 'almacen', SeedUser> {
  return {
    administracion: {
      login: `e2e.administracion.${project}@empresa.es`,
      name: 'E2E Administración',
      role: 'Administración',
      password: PASSWORD,
    },
    almacen: {
      login: `e2e.almacen.${project}@empresa.es`,
      name: 'E2E Almacén',
      role: 'Almacén',
      password: PASSWORD,
    },
  };
}

test.describe('Clientes · acceso por rol (US1, FR-002, FR-003)', () => {
  let users: ReturnType<typeof roleUsers>;

  test.beforeAll(async () => {
    users = roleUsers(test.info().project.name);
    await seedUsers(Object.values(users));
  });

  test.afterAll(async () => {
    await removeUsers(Object.values(users).map((user) => user.login));
  });

  test('Administración (solo ver) ve la misma pantalla que el Administrador', async ({ page }) => {
    await loginAs(page, users.administracion.login, PASSWORD);
    await openCustomers(page);
    await expectCustomersStructure(page);
  });

  test('Almacén no ve Clientes en el menú y la dirección lo lleva a su inicio', async ({
    page,
  }) => {
    await loginAs(page, users.almacen.login, PASSWORD);
    await expect(mainNav(page).getByRole('link', { name: /Clientes/ })).toHaveCount(0);
    await page.goto('/clientes');
    await expect(page).not.toHaveURL(/\/clientes/);
    await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toHaveCount(0);
  });
});

const searchBox = (page: Page) => page.getByRole('searchbox', { name: 'Buscar' });
const emptyNotice = (page: Page) => page.getByText('Todavía no hay clientes');

/** Escribe en la búsqueda y espera la petición que se lanza tras dejar de teclear. */
async function searchFor(page: Page, text: string): Promise<void> {
  const requested = page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === '/api/customers' &&
      new URL(req.url()).searchParams.get('q') === text,
  );
  await searchBox(page).fill(text);
  await requested;
}

test.describe('Clientes · cartera pendiente de carga (US2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await openCustomers(page);
    await expect(emptyNotice(page)).toBeVisible();
  });

  test('se ve el aviso y la búsqueda pide el listado y cambia la dirección', async ({ page }) => {
    await expect(page.getByText('La cartera se cargará desde el sistema anterior.')).toBeVisible();
    await searchFor(page, 'ferreteria');
    await expect(page).toHaveURL(/\/clientes\?q=ferreteria$/);
    await expect(emptyNotice(page)).toBeVisible();
  });

  test('recargar conserva la búsqueda', async ({ page }) => {
    await searchFor(page, 'ferreteria');
    await expect(page).toHaveURL(/\/clientes\?q=ferreteria$/);
    await page.reload();
    await expect(searchBox(page)).toHaveValue('ferreteria');
    await expect(emptyNotice(page)).toBeVisible();
  });

  test('una dirección con valores no válidos se corrige y muestra el aviso, sin error', async ({
    page,
  }) => {
    await page.goto('/clientes?page=abc&q=');
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(emptyNotice(page)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});

test.describe('Clientes · error del listado (US3)', () => {
  test('con el servidor en error se ve el mensaje, no el aviso; «Reintentar» lo resuelve', async ({
    page,
  }) => {
    await page.route('**/api/customers**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { code: 'INTERNAL', message: 'detalle' } }),
      }),
    );
    await loginAsAdmin(page);
    await mainNav(page)
      .getByRole('link', { name: /Clientes/ })
      .click();
    const error = page.getByRole('alert');
    await expect(error).toContainText('No se ha podido cargar el listado de clientes.');
    await expect(error).not.toContainText('detalle');
    await expect(emptyNotice(page)).toHaveCount(0);

    await page.unroute('**/api/customers**');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(emptyNotice(page)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
