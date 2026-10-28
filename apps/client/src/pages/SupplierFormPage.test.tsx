import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import type { SupplierDetail } from '@app/shared';
import { createSupplier, fetchSupplier, updateSupplier } from '../features/suppliers/suppliersApi';
import { setupStore } from '../store/store';
import { SupplierDetailPage } from './SupplierDetailPage';
import { SupplierFormPage } from './SupplierFormPage';

jest.mock('../features/suppliers/suppliersApi', () => ({
  fetchSuppliers: jest.fn(),
  fetchSupplier: jest.fn(),
  createSupplier: jest.fn(),
  updateSupplier: jest.fn(),
}));

const mockedCreate = jest.mocked(createSupplier);
const mockedFetch = jest.mocked(fetchSupplier);
const mockedUpdate = jest.mocked(updateSupplier);

const CREATED = {
  id: 's9',
  name: 'Aceites del Sur',
  cif: 'B12345674',
  foreign: false,
  address: 'Calle Mayor, 1',
  postalCode: '46001',
  city: 'Valencia',
  contactPerson: null,
  phones: [],
  emails: [],
  paymentMethod: 'TRANSFER_30',
  iban: null,
  web: null,
  leadTimeDays: null,
  minOrder: null,
  notes: null,
  active: true,
  version: 0,
  yearPurchases: 0,
  quarterPurchases: [0, 0, 0, 0],
  createdBy: { id: 'u1', login: 'admin' },
  createdAt: '2026-10-27T09:00:00.000Z',
  updatedBy: { id: 'u1', login: 'admin' },
  updatedAt: '2026-10-27T09:00:00.000Z',
} as SupplierDetail;

const apiError = (status: number, code: string, message: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { success: false, error: { code, message } } },
  });

beforeEach(() => {
  mockedCreate.mockReset();
  mockedFetch.mockReset();
  mockedUpdate.mockReset();
  mockedFetch.mockResolvedValue(CREATED);
});

function ListProbe() {
  const location = useLocation();
  return <p>Listado {location.pathname + location.search}</p>;
}

function renderPage(path = '/proveedores/nuevo?q=ace') {
  const router = createMemoryRouter(
    [
      { path: '/proveedores', element: <ListProbe /> },
      { path: '/proveedores/nuevo', element: <SupplierFormPage /> },
      { path: '/proveedores/:id/editar', element: <SupplierFormPage /> },
      { path: '/proveedores/:id', element: <SupplierDetailPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <Provider store={setupStore()}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return router;
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));

async function fillRequired() {
  await userEvent.type(field('Nombre *'), 'Aceites del Sur');
  await userEvent.type(field('CIF *'), 'B12345674');
  await userEvent.type(field('Dirección *'), 'Calle Mayor, 1');
  await userEvent.type(field('Código postal *'), '46001');
  await userEvent.type(field('Población *'), 'Valencia');
}

describe('SupplierFormPage · alta (US1, FR-004, FR-009)', () => {
  it('muestra el título, el subtítulo, la flecha al listado y el foco en el primer campo', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo proveedor' })).toBeTruthy();
    expect(screen.getByText('Los campos con * son obligatorios.')).toBeTruthy();
    const back = screen.getByRole('link', { name: 'Volver al listado de proveedores' });
    expect(back.getAttribute('href')).toBe('/proveedores?q=ace');
    expect(document.activeElement).toBe(field('Nombre *'));
  });

  it('al guardar abre la ficha del nuevo proveedor con el aviso «Proveedor creado.»', async () => {
    mockedCreate.mockResolvedValue(CREATED);
    const router = renderPage();
    await fillRequired();
    await submit();
    expect(await screen.findByRole('heading', { level: 1, name: 'Aceites del Sur' })).toBeTruthy();
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/proveedores/s9?q=ace',
    );
    expect(screen.getByRole('status').textContent).toContain('Proveedor creado.');
    expect(screen.queryByText('¿Descartar los cambios?')).toBeNull();
  });
});

describe('SupplierFormPage · errores al guardar (FR-006, FR-010)', () => {
  it('un error de red avisa y conserva lo escrito', async () => {
    mockedCreate.mockRejectedValue(new Error('Network Error'));
    renderPage();
    await fillRequired();
    await submit();
    expect(
      await screen.findByText(
        'No se ha podido guardar el proveedor. Lo que has escrito sigue aquí; vuelve a intentarlo.',
      ),
    ).toBeTruthy();
    expect(field('Nombre *').value).toBe('Aceites del Sur');
  });

  it('un 403 avisa de que ya no hay permiso, sin perder lo escrito', async () => {
    mockedCreate.mockRejectedValue(apiError(403, 'AUTH_FORBIDDEN', 'x'));
    renderPage();
    await fillRequired();
    await submit();
    expect(await screen.findByText('Ya no tienes permiso para editar proveedores.')).toBeTruthy();
    expect(field('Población *').value).toBe('Valencia');
  });
});

describe('SupplierFormPage · errores de campo del servidor (FR-005, FR-006)', () => {
  it('un CIF duplicado y un 400 se muestran junto a su campo', async () => {
    mockedCreate.mockRejectedValue(
      apiError(409, 'SUPPLIER_CIF_TAKEN', 'Ya existe un proveedor con este CIF: Levante.'),
    );
    renderPage();
    await fillRequired();
    await submit();
    expect(await screen.findByText('Ya existe un proveedor con este CIF: Levante.')).toBeTruthy();
    expect(field('CIF *').getAttribute('aria-invalid')).toBe('true');
  });

  it('un 400 del servidor marca el campo', async () => {
    mockedCreate.mockRejectedValue(
      apiError(400, 'VALIDATION_ERROR', 'city: Escribe la población.'),
    );
    renderPage();
    await fillRequired();
    await submit();
    expect(await screen.findByText('Escribe la población.')).toBeTruthy();
    expect(field('Población *').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('SupplierFormPage · salir con cambios (FR-009)', () => {
  it('sin cambios, «Cancelar» vuelve al listado sin preguntar', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('Listado /proveedores?q=ace')).toBeTruthy();
  });

  it('con cambios, la flecha pide confirmación; «Seguir editando» se queda', async () => {
    renderPage();
    await userEvent.type(field('Nombre *'), 'Acei');
    await userEvent.click(screen.getByRole('link', { name: 'Volver al listado de proveedores' }));
    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeTruthy();
    expect(screen.getByText('Lo que has escrito en el formulario se perderá.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(field('Nombre *').value).toBe('Acei');
  });

  it('con cambios, «Cancelar» y «Descartar cambios» vuelve al listado', async () => {
    renderPage();
    await userEvent.type(field('Nombre *'), 'Acei');
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
    expect(await screen.findByText('Listado /proveedores?q=ace')).toBeTruthy();
  });

  it('con cambios, la navegación del navegador también pide confirmación', async () => {
    const router = renderPage();
    await userEvent.type(field('Nombre *'), 'Acei');
    await router.navigate('/proveedores');
    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeTruthy();
  });
});

const EDIT_PATH = '/proveedores/s9/editar?q=ace';
const saveChanges = () => userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

async function openEdit() {
  const router = renderPage(EDIT_PATH);
  await screen.findByDisplayValue('Aceites del Sur');
  return router;
}

describe('SupplierFormPage · edición (US3, FR-007, FR-009)', () => {
  it('carga los datos actuales, con su título y la flecha a la ficha', async () => {
    await openEdit();
    expect(mockedFetch).toHaveBeenCalledWith('s9');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar proveedor' })).toBeTruthy();
    expect(field('CIF *').value).toBe('B12345674');
    const back = screen.getByRole('link', { name: 'Volver a la ficha del proveedor' });
    expect(back.getAttribute('href')).toBe('/proveedores/s9?q=ace');
  });

  it('guardar envía la versión leída y vuelve a la ficha con «Cambios guardados.»', async () => {
    mockedUpdate.mockResolvedValue({ ...CREATED, name: 'Aceites S.L.', version: 1 });
    mockedFetch.mockResolvedValueOnce(CREATED).mockResolvedValue({
      ...CREATED,
      name: 'Aceites S.L.',
      version: 1,
    });
    const router = await openEdit();
    await userEvent.clear(field('Nombre *'));
    await userEvent.type(field('Nombre *'), 'Aceites S.L.');
    await saveChanges();
    expect(await screen.findByRole('heading', { level: 1, name: 'Aceites S.L.' })).toBeTruthy();
    expect(mockedUpdate).toHaveBeenCalledWith(
      's9',
      expect.objectContaining({ name: 'Aceites S.L.', version: 0 }),
    );
    expect(router.state.location.pathname + router.state.location.search).toBe(
      '/proveedores/s9?q=ace',
    );
    expect(screen.getByRole('status').textContent).toContain('Cambios guardados.');
  });

  it('sin cambios, la flecha vuelve a la ficha sin preguntar', async () => {
    await openEdit();
    await userEvent.click(screen.getByRole('link', { name: 'Volver a la ficha del proveedor' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Aceites del Sur' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

const CONFLICT_TEXT =
  'Otro usuario ha cambiado este proveedor mientras lo editabas. Carga los datos actuales y repite tus cambios.';

describe('SupplierFormPage · edición con conflicto o sin permiso (US3, FR-011)', () => {
  it('un conflicto avisa y conserva lo escrito hasta cargar los datos actuales', async () => {
    mockedUpdate.mockRejectedValue(
      apiError(409, 'SUPPLIER_VERSION_CONFLICT', 'Otro usuario ha cambiado este proveedor.'),
    );
    await openEdit();
    await userEvent.type(field('Población *'), ' centro');
    await saveChanges();
    expect(await screen.findByText(CONFLICT_TEXT)).toBeTruthy();
    expect(field('Población *').value).toBe('Valencia centro');

    mockedFetch.mockResolvedValue({ ...CREATED, city: 'Paterna', version: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Cargar datos actuales' }));
    expect(await screen.findByDisplayValue('Paterna')).toBeTruthy();
    expect(screen.queryByText(CONFLICT_TEXT)).toBeNull();
  });

  it('un 403 avisa de que ya no hay permiso, sin perder lo escrito', async () => {
    mockedUpdate.mockRejectedValue(apiError(403, 'AUTH_FORBIDDEN', 'x'));
    await openEdit();
    await userEvent.type(field('Población *'), ' centro');
    await saveChanges();
    expect(await screen.findByText('Ya no tienes permiso para editar proveedores.')).toBeTruthy();
    expect(field('Población *').value).toBe('Valencia centro');
  });
});
