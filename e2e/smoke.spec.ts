import { expect, test } from '@playwright/test';

// Prueba de humo: la API (MongoDB en memoria) y el cliente arrancan, y la cuenta inicial "admin" entra.

test('la cuenta inicial entra y cierra sesión', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('textbox', { name: 'Email' }).fill('admin');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
});
