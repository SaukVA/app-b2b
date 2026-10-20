import { expect, test, type Page } from '@playwright/test';

// 005 US1: menú lateral en las pantallas con sesión, con los módulos del rol y Ajustes al final.

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('admin');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Principal' });

test.describe('Menú de navegación', () => {
  test('tras el login muestra los módulos en orden y Ajustes lleva a Apariencia', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const items = mainNav(page).getByRole('link');
    // Los módulos de negocio están pendientes: su texto termina en «Pendiente».
    await expect(items).toHaveText([
      /^Ventas/,
      /^Clientes/,
      /^Productos/,
      /^Proveedores/,
      /^Cobros/,
      'Ajustes',
    ]);

    await mainNav(page).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    await expect(mainNav(page)).toBeVisible();
  });

  test('sin sesión no hay menú: ni en el login ni en la configuración de base de datos', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);

    // En web la configuración de base de datos no existe: cae en la ruta protegida y lleva al login.
    await page.goto('/ajustes/base-de-datos');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });

  test('el pie muestra el rol y el canal, y «Cerrar sesión» vuelve al login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(mainNav(page).getByText('Administrador · Web')).toBeVisible();
    // Una pantalla con sesión en el historial: el login y el cierre de sesión navegan con replace.
    await mainNav(page).getByRole('link', { name: 'Ajustes' }).click();
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);

    await mainNav(page).getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
  });
});

// 005 US4: los módulos sin implementar se ven como «Pendiente» y no se abren.
test.describe('Módulos pendientes', () => {
  test('un módulo pendiente se ve como tal y no se abre por ninguna vía (FR-009, FR-011)', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    const ventas = mainNav(page).getByRole('link', { name: /Ventas/ });
    await expect(ventas).toContainText('Pendiente');

    // force: Playwright no pulsa un elemento con aria-disabled; aquí se comprueba justo que no navega.
    await ventas.click({ force: true });
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    await ventas.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);

    await page.goto('/clientes');
    await expect(page).toHaveURL(/\/ajustes\/apariencia$/);
    await expect(page.getByRole('combobox', { name: 'Pantalla de inicio' })).toHaveCount(0);
  });
});
