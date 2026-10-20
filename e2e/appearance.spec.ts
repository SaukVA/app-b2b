import { expect, test, type Page } from '@playwright/test';

// 004 US1: el tema elegido se aplica al momento, se guarda por usuario y no destella al recargar ni en el
// login. Los tests comparten la cuenta inicial "admin" con smoke.spec.ts, así que dejan el tema en Claro.

const DARK_BG = 'rgb(17, 20, 23)'; // #111417
const LIGHT_BG = 'rgb(243, 244, 241)'; // #F3F4F1

declare global {
  interface Window {
    __firstTheme?: string | null;
  }
}

/**
 * Registra el data-theme de <html> al empezar a leer <body>: ya han corrido los scripts de <head> y todavía
 * no el bundle de React (los módulos se ejecutan al terminar de leer el documento). Es lo primero que se pinta.
 */
async function recordFirstTheme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      window.__firstTheme = document.documentElement.dataset.theme ?? null;
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
}

const firstTheme = (page: Page) => page.evaluate(() => window.__firstTheme);
const htmlTheme = (page: Page) => page.locator('html').getAttribute('data-theme');
const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('admin');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Elige un tema en Ajustes › Apariencia y espera a que se guarde. */
async function chooseTheme(page: Page, name: string): Promise<void> {
  const saved = page.waitForResponse(
    (res) => res.url().includes('/api/preferences') && res.request().method() === 'PATCH',
  );
  await page
    .getByRole('radiogroup', { name: 'Tema' })
    .getByRole('radio', { name: new RegExp(name) })
    .click();
  expect((await saved).ok()).toBe(true);
}

async function openAppearance(page: Page): Promise<void> {
  await page.goto('/ajustes/apariencia');
  await expect(page.getByRole('radiogroup', { name: 'Tema' })).toBeVisible();
}

test.describe.serial('Tema', () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await openAppearance(page);
    await chooseTheme(page, 'Claro');
    await page.close();
  });

  test('Oscuro se aplica al momento, al recargar y en el login sin destello', async ({ page }) => {
    await recordFirstTheme(page);
    await loginAsAdmin(page);
    await openAppearance(page);

    await chooseTheme(page, 'Oscuro');
    expect(await htmlTheme(page)).toBe('dark');

    await page.reload();
    await expect(page.getByRole('radiogroup', { name: 'Tema' })).toBeVisible();
    expect(await firstTheme(page)).toBe('dark');

    await page.goto('/productos');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    expect(await firstTheme(page)).toBe('dark');
    expect(await htmlTheme(page)).toBe('dark');
  });

  test('Según el sistema sigue al equipo en vivo, sin recargar', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await loginAsAdmin(page);
    await openAppearance(page);

    await chooseTheme(page, 'Según el sistema');
    expect(await htmlTheme(page)).toBe('system');
    await expect.poll(() => bodyBackground(page)).toBe(DARK_BG);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => bodyBackground(page)).toBe(LIGHT_BG);
  });
});
