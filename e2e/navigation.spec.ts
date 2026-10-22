import { expect, test, type Locator, type Page } from '@playwright/test';
import { removeUsers, seedUsers, type SeedUser } from './support/db';

// 005 US1: menú lateral en las pantallas con sesión, con los módulos del rol y Ajustes al final.

async function loginAs(page: Page, login: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(login);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

const loginAsAdmin = (page: Page) => loginAs(page, 'admin', 'admin');

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Principal' });

/** En estrecho el pie solo deja «Cerrar sesión» (FR-016); el rol y el canal se ven en ancho. */
async function expectRoleLineOnWide(page: Page): Promise<void> {
  if (test.info().project.name === 'mobile') return;
  await expect(mainNav(page).getByText('Administrador · Web')).toBeVisible();
}

test.describe('Menú de navegación', () => {
  test('tras el login muestra los módulos en orden y Ajustes lleva a Apariencia', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const items = mainNav(page).getByRole('link');
    // Los módulos de negocio pendientes terminan su texto en «Pendiente»; Productos (006) y Clientes (007)
    // ya no.
    await expect(items).toHaveText([
      /^Ventas/,
      'Clientes',
      'Productos',
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
    await expectRoleLineOnWide(page);
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
    // Productos ya está implementado (006): es la pantalla de inicio y Proveedores, el pendiente de ejemplo.
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/productos$/);
    const proveedores = mainNav(page).getByRole('link', { name: /Proveedores/ });
    await expect(proveedores).toContainText('Pendiente');

    // force: Playwright no pulsa un elemento con aria-disabled; aquí se comprueba justo que no navega.
    await proveedores.click({ force: true });
    await expect(page).toHaveURL(/\/productos$/);
    await proveedores.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/productos$/);

    await page.goto('/proveedores');
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  });
});

// 005 US5: en pantallas anchas el menú se pliega a iconos y el estado se recuerda en el equipo.
test.describe('Menú plegado', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('se pliega, muestra la etiqueta con el foco, se recuerda al recargar y se despliega', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const nav = mainNav(page);
    const widthOf = async () => (await nav.boundingBox())?.width ?? 0;
    const expanded = await widthOf();

    await page.getByRole('button', { name: 'Plegar menú' }).click();
    await expect(page.getByRole('button', { name: 'Desplegar menú' })).toBeVisible();
    await expect.poll(widthOf).toBeLessThan(expanded);

    // La etiqueta, oculta visualmente al plegar, flota de nuevo con :focus-visible (teclado).
    const ajustes = nav.getByRole('link', { name: 'Ajustes' });
    const label = ajustes.getByText('Ajustes');
    await nav.getByRole('link', { name: /Cobros/ }).focus();
    await page.keyboard.press('Tab');
    await expect(ajustes).toBeFocused();
    await expect.poll(async () => (await label.boundingBox())?.width ?? 0).toBeGreaterThan(20);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Desplegar menú' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('navigation.collapsed'))).toBe('1');

    await page.getByRole('button', { name: 'Desplegar menú' }).click();
    await expect.poll(widthOf).toBe(expanded);
    expect(await page.evaluate(() => localStorage.getItem('navigation.collapsed'))).toBe('0');
  });

  test('con el menú plegado, «Cerrar sesión» se ve y funciona (FR-013)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Plegar menú' }).click();
    const logout = mainNav(page).getByRole('button', { name: 'Cerrar sesión' });
    await expect(logout).toBeVisible();
    await logout.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

// 008: sin marca, «Plegar menú» como elemento de la lista y pie en una fila.
test.describe('Menú sin marca y pie en una fila', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sin logotipo ni nombre de la aplicación en el menú (FR-001)', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(mainNav(page).getByText('Venta a mayoristas')).toHaveCount(0);
  });

  test('«Plegar menú» es un elemento más bajo Ajustes, de 44 px, y plegado sigue sin marca (008)', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const nav = mainNav(page);
    const toggle = nav.getByRole('button', { name: 'Plegar menú' });
    const ajustesBox = await nav.getByRole('link', { name: 'Ajustes' }).boundingBox();
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox!.y).toBeGreaterThan(ajustesBox!.y);
    expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
    await expect(toggle).toHaveAttribute('title', 'Plegar menú');

    await toggle.click();
    await expect(nav.getByRole('button', { name: 'Desplegar menú' })).toBeVisible();
    await expect(nav.getByText('Venta a mayoristas')).toHaveCount(0);
  });

  test('el pie es una fila: «rol · canal» y, a su derecha, «Cerrar sesión» de 44×44 (008 US2)', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const nav = mainNav(page);
    const role = nav.getByText('Administrador · Web');
    const logout = nav.getByRole('button', { name: 'Cerrar sesión' });
    await expect(role).toBeVisible();
    const logoutBox = await boxOf(logout);
    expect(logoutBox.x).toBeGreaterThan((await boxOf(role)).x);
    expect(Math.round(logoutBox.width)).toBe(44);
    expect(Math.round(logoutBox.height)).toBe(44);

    await nav.getByRole('button', { name: 'Plegar menú' }).click();
    await expect(role).toBeHidden();
    await expect(logout).toBeVisible();
  });
});

/** Añade contenido de sobra al layout y desplaza la página hacia abajo. */
async function scrollFarDown(page: Page): Promise<void> {
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '3000px';
    document.querySelector('nav')?.parentElement?.parentElement?.append(spacer);
    window.scrollTo(0, 1500);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

// 005 US6: por debajo de 760 px el menú es una barra superior fija y desplazable en horizontal.
test.describe('Menú en pantallas estrechas', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('barra superior fija, sin marca ni datos del usuario, con «Cerrar sesión» (FR-016)', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    const nav = mainNav(page);
    await expect(nav).toBeVisible();
    expect((await nav.boundingBox())?.y).toBeLessThanOrEqual(1);

    await expect(page.getByRole('button', { name: /menú$/ })).toHaveCount(0);
    await expect(nav.getByText('Venta a mayoristas')).toHaveCount(0);
    await expect(nav.getByText('Administrador · Web')).toBeHidden();

    // SC-006: la barra entera cabe en el primer viewport en vertical.
    const logout = nav.getByRole('button', { name: 'Cerrar sesión' });
    // 008: solo icono de 44×44, sin texto visible.
    expect(Math.round((await boxOf(logout)).width)).toBe(44);
    const navBox = await nav.boundingBox();
    expect((navBox?.y ?? 0) + (navBox?.height ?? 0)).toBeLessThanOrEqual(844);
    await logout.scrollIntoViewIfNeeded();
    await expect(logout).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    await scrollFarDown(page);
    await expect.poll(async () => (await nav.boundingBox())?.y ?? -1).toBeLessThanOrEqual(1);
    await expect(nav).toBeInViewport();
  });

  test('el menú plegado en ancho sigue plegado al volver de estrecho (FR-017)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Plegar menú' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: /menú$/ })).toHaveCount(0);
    // En estrecho las etiquetas se ven aunque esté plegado.
    await expect(mainNav(page).getByText('Ajustes', { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('button', { name: 'Desplegar menú' })).toBeVisible();
  });
});

// 008 US2: con un nombre muy largo el pie sigue siendo una fila y «Cerrar sesión» no se sale del menú.
test.describe('Pie con un nombre largo', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const PASSWORD = 'secreto123';
  const LONG_NAME = 'María de los Ángeles Fernández-Villaverde y Sánchez de la Rosa';
  let longUser: SeedUser;

  test.beforeAll(async () => {
    longUser = {
      login: `e2e.nombre-largo.${test.info().project.name}@empresa.es`,
      name: LONG_NAME,
      role: 'Comercial',
      password: PASSWORD,
    };
    await seedUsers([longUser]);
  });

  test.afterAll(async () => {
    await removeUsers([longUser.login]);
  });

  test('el nombre se recorta con title completo y el pie no crece', async ({ page }) => {
    await loginAs(page, longUser.login, PASSWORD);
    const nav = mainNav(page);
    const name = nav.getByText(LONG_NAME);
    await expect(name).toHaveAttribute('title', LONG_NAME);
    const navBox = await boxOf(nav);
    const logoutBox = await boxOf(nav.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logoutBox.x + logoutBox.width).toBeLessThanOrEqual(navBox.x + navBox.width);
    // Una sola línea de nombre: no más alta que la fila del rol.
    const nameBox = await boxOf(name);
    expect(nameBox.height).toBeLessThanOrEqual(24);
    expect(nameBox.x + nameBox.width).toBeLessThanOrEqual(logoutBox.x);
  });
});
