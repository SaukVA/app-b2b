import { expect, test, type Page } from '@playwright/test';
import {
  removeSuppliers,
  removeUsers,
  seedSuppliers,
  seedUsers,
  type SeedSupplier,
  type SeedUser,
} from './support/db';

// 010: gestión de proveedores de principio a fin (listado, ficha, alta, edición, baja y reactivación).
// Cada bloque siembra sus proveedores y los borra al terminar: los dos proyectos comparten la base de datos.

const PASSWORD = 'secreto123';

const SUPPLIERS: SeedSupplier[] = [
  {
    name: 'Aceites del Sur',
    cif: 'B12345674',
    address: 'Calle del Olivo, 12',
    postalCode: '46988',
    city: 'Paterna',
    leadTimeDays: 3,
    phones: [{ label: 'Pedidos', value: '961 234 567' }],
  },
  {
    name: 'Bebidas Mediterráneo',
    cif: 'B46000006',
    address: 'Calle Mayor, 1',
    postalCode: '46023',
    city: 'Valencia',
  },
  {
    name: 'Higiene Norte',
    cif: 'B48000004',
    address: 'Gran Vía, 8',
    postalCode: '48001',
    city: 'Bilbao',
    active: false,
  },
];

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

/** Abre Proveedores desde el menú y espera la petición del listado. */
async function openSuppliers(page: Page): Promise<void> {
  const listed = page.waitForRequest((req) => new URL(req.url()).pathname === '/api/suppliers');
  await mainNav(page)
    .getByRole('link', { name: /Proveedores/ })
    .click();
  await expect(page).toHaveURL(/\/proveedores$/);
  await listed;
}

/** Enlace visible a la ficha de un proveedor: fila en escritorio, tarjeta en móvil. */
const supplierLink = (page: Page, name: string) =>
  page
    .getByRole('link', { name: new RegExp(name) })
    .filter({ visible: true })
    .first();

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });

async function openSupplier(page: Page, name: string): Promise<void> {
  await supplierLink(page, name).click();
  await expect(heading(page, name)).toBeVisible();
}

test.describe('Proveedores · listado con datos (010 FR-020, FR-021a)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSuppliers(SUPPLIERS);
    await loginAsAdmin(page);
    await openSuppliers(page);
  });
  test.afterEach(removeSuppliers);

  test('muestra los activos en orden alfabético con su población', async ({ page }) => {
    await expect(page.getByText('2 activos')).toBeVisible();
    await expect(supplierLink(page, 'Aceites del Sur')).toBeVisible();
    await expect(page.getByText('Paterna').filter({ visible: true })).toBeVisible();
    await expect(supplierLink(page, 'Higiene Norte')).toHaveCount(0);
    if (isMobile()) return;
    await expect(
      page.getByRole('table', { name: 'Proveedores' }).getByRole('columnheader'),
    ).toHaveText(['Proveedor', 'CIF', 'Plazo', /^Gasto \dT$/, 'Compras año']);
  });

  test('«Mostrar dados de baja» incluye las bajas con su sello', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Mostrar dados de baja' }).click();
    await expect(page).toHaveURL(/includeInactive=true/);
    await expect(page.getByText('3 proveedores')).toBeVisible();
    await expect(supplierLink(page, 'Higiene Norte')).toBeVisible();
    await expect(page.getByText('Baja', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('el selector de trimestre cambia la columna y la dirección', async ({ page }) => {
    const quarters = page.getByRole('radiogroup', { name: /Gasto por trimestre/ });
    const other = quarters.getByRole('radio', { checked: false }).first();
    const label = (await other.textContent())?.trim() ?? '';
    await other.click();
    await expect(page).toHaveURL(new RegExp(`quarter=${label[0]}`));
    await expect(quarters.getByRole('radio', { name: label })).toBeChecked();
    if (isMobile()) return;
    await expect(page.getByRole('columnheader', { name: `Gasto ${label}` })).toBeVisible();
  });
});

test.describe('Proveedores · ficha (010 FR-012 a FR-015)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSuppliers(SUPPLIERS);
    await loginAsAdmin(page);
    await openSuppliers(page);
  });
  test.afterEach(removeSuppliers);

  test('se abre a pantalla completa y la flecha vuelve con los mismos criterios', async ({
    page,
  }) => {
    await page.getByRole('searchbox', { name: 'Buscar' }).fill('aceites');
    await expect(page).toHaveURL(/q=aceites/);
    await openSupplier(page, 'Aceites del Sur');
    await expect(page).toHaveURL(/\/proveedores\/[a-f0-9]{24}\?q=aceites$/);
    await expect(page.getByRole('region', { name: 'Datos fiscales' })).toBeVisible();
    await expect(page.getByRole('link', { name: '961 234 567' })).toHaveAttribute(
      'href',
      'tel:961234567',
    );

    await page.getByRole('link', { name: 'Volver al listado de proveedores' }).click();
    await expect(page).toHaveURL(/\/proveedores\?q=aceites$/);
    await expect(supplierLink(page, 'Aceites del Sur')).toBeFocused();
  });

  test('un enlace a un proveedor inexistente vuelve al listado con un aviso', async ({ page }) => {
    await page.goto('/proveedores/0123456789abcdef01234567');
    await expect(page).toHaveURL(/\/proveedores$/);
    await expect(
      page.getByText(
        'El enlace apunta a un proveedor que no existe. Busca el proveedor en el listado.',
      ),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Entendido' }).click();
    await expect(page.getByText(/El enlace apunta a un proveedor/)).toHaveCount(0);
  });
});

const field = (page: Page, label: string) => page.getByLabel(label, { exact: true });

async function fillRequired(page: Page, values: Record<string, string>): Promise<void> {
  for (const [label, value] of Object.entries(values)) await field(page, label).fill(value);
}

const NEW_SUPPLIER = {
  'Nombre *': 'Lácteos Valle Verde',
  'CIF *': 'b-33.000.001',
  'Dirección *': 'Polígono Norte, 4',
  'Código postal *': '33001',
  'Población *': 'Oviedo',
};

test.describe('Proveedores · alta (010 US1, FR-004 a FR-010)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSuppliers(SUPPLIERS);
    await loginAsAdmin(page);
    await openSuppliers(page);
    await page.getByRole('link', { name: 'Nuevo proveedor' }).click();
    await expect(heading(page, 'Nuevo proveedor')).toBeVisible();
  });
  test.afterEach(removeSuppliers);

  test('sin datos marca los obligatorios y, completo, crea y abre la ficha', async ({ page }) => {
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(page.getByText(/^Revisa estos campos: Nombre, CIF/)).toBeVisible();
    await expect(field(page, 'Nombre *')).toBeFocused();

    await fillRequired(page, NEW_SUPPLIER);
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(heading(page, 'Lácteos Valle Verde')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Proveedor creado.' })).toBeVisible();
    await expect(page.getByText('CIF B33000001')).toBeVisible();

    await page.getByRole('link', { name: 'Volver al listado de proveedores' }).click();
    await expect(page.getByText('3 activos')).toBeVisible();
  });

  test('un CIF repetido, escrito con otro formato, se rechaza con el nombre del proveedor', async ({
    page,
  }) => {
    await fillRequired(page, { ...NEW_SUPPLIER, 'CIF *': 'B-12.345.674' });
    await page.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(
      page.getByText('Ya existe un proveedor con este CIF: Aceites del Sur.'),
    ).toBeVisible();
    await expect(field(page, 'CIF *')).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('Proveedores · edición (010 US3, FR-007, FR-009)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSuppliers(SUPPLIERS);
    await loginAsAdmin(page);
    await openSuppliers(page);
    await openSupplier(page, 'Bebidas Mediterráneo');
    await page.getByRole('link', { name: 'Editar proveedor' }).click();
    await expect(heading(page, 'Editar proveedor')).toBeVisible();
  });
  test.afterEach(removeSuppliers);

  test('guardar vuelve a la ficha con los cambios y «Cambios guardados.»', async ({ page }) => {
    await expect(field(page, 'Nombre *')).toHaveValue('Bebidas Mediterráneo');
    await field(page, 'Nombre *').fill('Bebidas Mediterráneo S.L.');
    await field(page, 'Plazo de entrega (días)').fill('5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(heading(page, 'Bebidas Mediterráneo S.L.')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Cambios guardados.' })).toBeVisible();
    await expect(page.getByText('5 días')).toBeVisible();
  });

  test('salir con cambios pide confirmación y «Descartar cambios» no guarda', async ({ page }) => {
    await field(page, 'Población *').fill('Alicante');
    await page.getByRole('link', { name: 'Volver a la ficha del proveedor' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Descartar los cambios?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(field(page, 'Población *')).toHaveValue('Alicante');

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await dialog.getByRole('button', { name: 'Descartar cambios' }).click();
    await expect(heading(page, 'Bebidas Mediterráneo')).toBeVisible();
    await expect(page.getByText('Alicante')).toHaveCount(0);
  });
});

test.describe('Proveedores · baja y reactivación (010 US4, FR-017 a FR-019)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSuppliers(SUPPLIERS);
    await loginAsAdmin(page);
    await openSuppliers(page);
    await openSupplier(page, 'Aceites del Sur');
  });
  test.afterEach(removeSuppliers);

  test('dar de baja lo saca del listado y «Reactivar» lo devuelve', async ({ page }) => {
    await page.getByRole('button', { name: 'Dar de baja' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Dar de baja a Aceites del Sur?' });
    await dialog.getByRole('button', { name: 'Dar de baja' }).click();
    await expect(page.getByText('Aceites del Sur dado de baja.')).toBeVisible();
    await expect(page.getByText('Baja', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Reactivar' }).click();
    await expect(page.getByText('Aceites del Sur reactivado.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dar de baja' })).toBeVisible();
  });

  test('un proveedor dado de baja no aparece en el listado por defecto', async ({ page }) => {
    await page.getByRole('button', { name: 'Dar de baja' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click();
    await expect(page.getByText('Aceites del Sur dado de baja.')).toBeVisible();
    await page.getByRole('link', { name: 'Volver al listado de proveedores' }).click();
    await expect(page.getByText('1 activo')).toBeVisible();
    await expect(supplierLink(page, 'Aceites del Sur')).toHaveCount(0);
  });
});

function roleUsers(project: string): Record<'almacen' | 'comercial', SeedUser> {
  return {
    almacen: {
      login: `e2e.prov.almacen.${project}@empresa.es`,
      name: 'E2E Almacén',
      role: 'Almacén',
      password: PASSWORD,
    },
    comercial: {
      login: `e2e.prov.comercial.${project}@empresa.es`,
      name: 'E2E Comercial',
      role: 'Comercial',
      password: PASSWORD,
    },
  };
}

test.describe('Proveedores · acceso por rol (FR-002)', () => {
  let users: ReturnType<typeof roleUsers>;

  test.beforeAll(async () => {
    users = roleUsers(test.info().project.name);
    await seedUsers(Object.values(users));
  });
  test.beforeEach(() => seedSuppliers(SUPPLIERS));
  test.afterEach(removeSuppliers);
  test.afterAll(async () => {
    await removeUsers(Object.values(users).map((user) => user.login));
  });

  test('Almacén consulta la ficha sin acciones de edición y no puede dar de alta', async ({
    page,
  }) => {
    await loginAs(page, users.almacen.login, PASSWORD);
    await openSuppliers(page);
    await expect(page.getByRole('link', { name: 'Nuevo proveedor' })).toHaveCount(0);
    await openSupplier(page, 'Aceites del Sur');
    for (const name of ['Editar proveedor', 'Dar de baja']) {
      await expect(page.getByRole('link', { name })).toHaveCount(0);
      await expect(page.getByRole('button', { name })).toHaveCount(0);
    }
    await page.goto('/proveedores/nuevo');
    await expect(page).not.toHaveURL(/\/proveedores\/nuevo/);
    await expect(heading(page, 'Nuevo proveedor')).toHaveCount(0);
  });

  test('Comercial no ve Proveedores en el menú y la dirección lo lleva a su inicio', async ({
    page,
  }) => {
    await loginAs(page, users.comercial.login, PASSWORD);
    await expect(mainNav(page).getByRole('link', { name: /Proveedores/ })).toHaveCount(0);
    await page.goto('/proveedores');
    await expect(page).not.toHaveURL(/\/proveedores/);
    await expect(heading(page, 'Proveedores')).toHaveCount(0);
  });
});

test.describe('Proveedores · sin datos y con error (009)', () => {
  test('sin proveedores, el aviso invita a darlos de alta a quien puede editar', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await openSuppliers(page);
    await expect(page.getByText('Todavía no hay proveedores')).toBeVisible();
    await expect(
      page.getByText('Mientras tanto, puedes dar de alta uno con «Nuevo proveedor».'),
    ).toBeVisible();
  });

  test('con el servidor en error se ve el mensaje; «Reintentar» lo resuelve', async ({ page }) => {
    await page.route('**/api/suppliers?**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { code: 'INTERNAL', message: 'detalle' } }),
      }),
    );
    await loginAsAdmin(page);
    await page.goto('/proveedores?page=2');
    const error = page.getByRole('alert');
    await expect(error).toContainText('No se ha podido cargar el listado de proveedores.');
    await expect(error).not.toContainText('detalle');

    await page.unroute('**/api/suppliers?**');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('en Ajustes › Apariencia, «Pantalla de inicio» ofrece Proveedores', async ({ page }) => {
    await loginAsAdmin(page);
    await mainNav(page).getByRole('link', { name: 'Ajustes' }).click();
    const homeScreen = page.getByRole('combobox', { name: 'Pantalla de inicio' });
    await expect(homeScreen.getByRole('option', { name: 'Proveedores' })).toHaveCount(1);
  });
});
