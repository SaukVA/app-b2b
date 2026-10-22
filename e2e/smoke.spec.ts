import { expect, test } from '@playwright/test';

// Prueba de humo: la API (MongoDB en memoria) y el cliente arrancan, y la cuenta inicial "admin" entra.

test('la cuenta inicial entra y cierra sesión', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('textbox', { name: 'Email' }).fill('admin');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Con Productos implementado (006), el Administrador aterriza en su pantalla de inicio.
  await expect(page).toHaveURL(/\/productos$/);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
});

// 008 US3: el login no muestra la marca y, en estrecho, solo el formulario, centrado.
test.describe('Inicio de sesión sin marca', () => {
  test('en ancho, el panel de presentación se ve sin «Venta a mayoristas»', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    const hero = page.getByRole('region', { name: 'Presentación' });
    await expect(hero).toBeVisible();
    await expect(hero.getByText('Venta a mayoristas')).toHaveCount(0);
  });

  test('a 390 px no hay panel y el formulario se ve entero y centrado (SC-005)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('region', { name: 'Presentación' })).toBeHidden();

    const heading = page.getByRole('heading', { name: 'Iniciar sesión' });
    const submit = page.getByRole('button', { name: 'Entrar' });
    await expect(heading).toBeInViewport();
    await expect(submit).toBeInViewport();
    const top = (await heading.boundingBox())!;
    const bottom = (await submit.boundingBox())!;
    const centerX = bottom.x + bottom.width / 2;
    const centerY = (top.y + bottom.y + bottom.height) / 2;
    expect(Math.abs(centerX - 390 / 2)).toBeLessThanOrEqual(16);
    expect(Math.abs(centerY - 844 / 2)).toBeLessThanOrEqual(844 * 0.1);
  });
});
