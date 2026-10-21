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
