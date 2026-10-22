import { expect, test, type Locator, type Page } from '@playwright/test';
import { removeUsers, seedUsers, type SeedUser } from './support/db';

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

async function loginAs(page: Page, login: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(login);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

const loginAsAdmin = (page: Page) => loginAs(page, 'admin', 'admin');

/** Elige una opción de un grupo de Ajustes › Apariencia y espera a que se guarde. */
async function chooseOption(page: Page, group: string, name: string): Promise<void> {
  const saved = page.waitForResponse(
    (res) => res.url().includes('/api/preferences') && res.request().method() === 'PATCH',
  );
  await page
    .getByRole('radiogroup', { name: group })
    .getByRole('radio', { name: new RegExp(name) })
    .click();
  expect((await saved).ok()).toBe(true);
}

const chooseTheme = (page: Page, name: string) => chooseOption(page, 'Tema', name);

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

// Bug desktop-theme-previews: el Chromium 132 de Electron 34 da a <button> `align-items: flex-start` por
// defecto y las miniaturas se quedaban en ~27 px. Se imita esa hoja del navegador para no depender de él.
test('las miniaturas de tema ocupan el ancho de su tarjeta aunque el navegador no estire los botones', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await openAppearance(page);
  await page.addStyleTag({ content: 'button { align-items: flex-start; }' });

  const cards = page.getByRole('radiogroup', { name: 'Tema' }).getByRole('radio');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    const cardBox = await card.boundingBox();
    const previewBox = await card.locator('span[aria-hidden="true"]').first().boundingBox();
    // Ancho útil de la tarjeta: sin el padding (12 px) ni el borde (hasta 2 px) de cada lado.
    expect(previewBox!.width).toBeGreaterThanOrEqual((cardBox!.width - 28) * 0.9);
  }
});

// 004 US4. Datos sembrados en la base de datos (support/db.ts), con logins únicos por proyecto porque
// desktop y mobile comparten servidor.
const PASSWORD = 'secreto123';

/** Un Administrador y 12 Comerciales para llenar Ajustes › Usuarios. */
function densityUsers(project: string): SeedUser[] {
  const admin = {
    login: `e2e.admin.${project}@empresa.es`,
    name: 'E2E Administrador',
    role: 'Administrador',
    password: PASSWORD,
  };
  const comerciales = Array.from({ length: 12 }, (_, index) => ({
    login: `e2e.comercial${index + 1}.${project}@empresa.es`,
    name: `E2E Comercial ${String(index + 1).padStart(2, '0')}`,
    role: 'Comercial',
    password: PASSWORD,
  }));
  return [admin, ...comerciales];
}

/** Elige la densidad y abre Ajustes › Usuarios. */
async function openUsersWith(page: Page, density: 'Cómoda' | 'Compacta'): Promise<void> {
  await openAppearance(page);
  await chooseOption(page, 'Densidad de tablas', density);
  await page.goto('/ajustes/usuarios');
}

async function heightWith(page: Page, density: 'Cómoda' | 'Compacta', target: Locator) {
  await openUsersWith(page, density);
  await expect(target).toBeVisible();
  return (await target.boundingBox())?.height ?? 0;
}

test.describe.serial('Densidad de tablas', () => {
  let users: SeedUser[] = [];

  test.beforeAll(async () => {
    users = densityUsers(test.info().project.name);
    await seedUsers(users);
  });

  test.afterAll(async () => {
    await removeUsers(users.map((user) => user.login));
  });

  test('Compacta muestra al menos un 25 % más de filas y los controles siguen en 44 px', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'desktop', 'Solo en escritorio: el móvil usa tarjetas');
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, users[0].login, PASSWORD);
    const row = page.getByRole('row', { name: /E2E Comercial 01/ });

    const comfortable = await heightWith(page, 'Cómoda', row);
    const compact = await heightWith(page, 'Compacta', row);
    const button = await page
      .getByRole('button', { name: 'Opciones de E2E Comercial 01' })
      .boundingBox();

    expect(comfortable / compact).toBeGreaterThanOrEqual(1.25);
    expect([Math.round(button?.width ?? 0), Math.round(button?.height ?? 0)]).toEqual([44, 44]);
    await openUsersWith(page, 'Cómoda');
  });

  test('las tarjetas de móvil no cambian con la densidad', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'Solo en móvil');
    await loginAs(page, users[0].login, PASSWORD);
    const card = page.getByRole('article').filter({ hasText: 'E2E Comercial 01' });

    const comfortable = await heightWith(page, 'Cómoda', card);
    const compact = await heightWith(page, 'Compacta', card);

    expect(compact).toBe(comfortable);
    await openUsersWith(page, 'Cómoda');
  });
});
