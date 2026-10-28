import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import type { AppModule, PermissionLevel, SupplierDetail } from '@app/shared';
import { fetchSupplier, setSupplierStatus } from '../features/suppliers/suppliersApi';
import { setupStore } from '../store/store';
import { SupplierDetailPage } from './SupplierDetailPage';

jest.mock('../features/suppliers/suppliersApi', () => ({
  fetchSuppliers: jest.fn(),
  fetchSupplier: jest.fn(),
  setSupplierStatus: jest.fn(),
}));

const mockedFetch = jest.mocked(fetchSupplier);
const mockedStatus = jest.mocked(setSupplierStatus);

const DETAIL: SupplierDetail = {
  id: 's1',
  name: 'Aceites del Sur S.L.',
  cif: 'B12345674',
  foreign: false,
  address: 'Calle del Olivo, 12',
  postalCode: '46988',
  city: 'Paterna',
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
  createdAt: '2026-10-26T09:30:00.000Z',
  updatedBy: { id: 'u1', login: 'admin' },
  updatedAt: '2026-10-26T09:30:00.000Z',
};

const notFoundError = Object.assign(new Error('Request failed with status code 404'), {
  response: { status: 404, data: { success: false, error: { code: 'SUPPLIER_NOT_FOUND' } } },
});

beforeEach(() => mockedFetch.mockReset());

const probe: { url: string; state: unknown } = { url: '', state: null };

function ListProbe() {
  const location = useLocation();
  probe.url = location.pathname + location.search;
  probe.state = location.state;
  return <p>Listado</p>;
}

const NO_PERMISSIONS: Record<AppModule, PermissionLevel> = {
  ventas: 'none',
  clientes: 'none',
  productos: 'none',
  proveedores: 'none',
  cobros: 'none',
  ajustes: 'none',
};

/** Store con un usuario cuyo permiso en Proveedores es `level`. */
function storeAs(level: PermissionLevel) {
  return setupStore({
    auth: {
      user: {
        id: '1',
        login: 'marta@empresa.es',
        name: 'Marta',
        role: 'Administración',
        roleName: 'Administración',
        permissions: { ...NO_PERMISSIONS, proveedores: level },
        isBootstrap: false,
        preferences: {
          theme: 'light',
          tableDensity: 'comfortable',
          moneyFormat: 'es',
          homeScreen: null,
        },
      },
      accessToken: 'jwt',
      status: 'succeeded',
      error: null,
    },
  });
}

function renderPage(path = '/proveedores/s1?q=aceites&page=2', store = setupStore()) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/proveedores" element={<ListProbe />} />
          <Route path="/proveedores/:id" element={<SupplierDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('SupplierDetailPage · carga (FR-012, FR-015)', () => {
  it('pide la ficha del id de la dirección y, mientras carga, lo anuncia con aria-busy', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(mockedFetch).toHaveBeenCalledWith('s1');
    const loading = screen.getByText('Cargando proveedor…');
    expect(loading.closest('[aria-busy="true"]')).not.toBeNull();
  });

  it('muestra la cabecera con el nombre y el CIF, y la ficha', async () => {
    mockedFetch.mockResolvedValue(DETAIL);
    renderPage();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aceites del Sur S.L.' }),
    ).toBeTruthy();
    expect(screen.getByText('CIF B12345674')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Datos fiscales' })).toBeTruthy();
    expect(screen.queryByText('Baja')).toBeNull();
  });

  it('marca un proveedor dado de baja con el sello «Baja» y el extranjero en el CIF', async () => {
    mockedFetch.mockResolvedValue({ ...DETAIL, active: false, foreign: true, cif: 'IT0123' });
    renderPage();
    expect(await screen.findByText('Baja')).toBeTruthy();
    expect(screen.getByText('CIF IT0123 (extranjero)')).toBeTruthy();
  });
});

describe('SupplierDetailPage · flecha de retorno (FR-014)', () => {
  it('vuelve al listado con los mismos criterios', async () => {
    mockedFetch.mockResolvedValue(DETAIL);
    renderPage();
    const back = await screen.findByRole('link', { name: 'Volver al listado de proveedores' });
    expect(back.textContent).toContain('Proveedores');
    expect(back.getAttribute('href')).toBe('/proveedores?q=aceites&page=2');
  });

  it('también mientras carga', () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    renderPage('/proveedores/s1');
    const back = screen.getByRole('link', { name: 'Volver al listado de proveedores' });
    expect(back.getAttribute('href')).toBe('/proveedores');
  });
});

describe('SupplierDetailPage · errores (FR-015)', () => {
  it('un proveedor inexistente lleva al listado con el aviso, con los mismos criterios', async () => {
    mockedFetch.mockRejectedValue(notFoundError);
    renderPage();
    expect(await screen.findByText('Listado')).toBeTruthy();
    expect(probe.url).toBe('/proveedores?q=aceites&page=2');
    expect(probe.state).toEqual({ notFound: true });
  });

  it('un error al cargar muestra el mensaje y «Reintentar» vuelve a pedir la ficha', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(DETAIL);
    renderPage();
    expect(await screen.findByText('No se ha podido cargar el proveedor.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aceites del Sur S.L.' }),
    ).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});

describe('SupplierDetailPage · «Editar proveedor» (010 US3, FR-002)', () => {
  it('con permiso de editar enlaza con el formulario, conservando los criterios', async () => {
    mockedFetch.mockResolvedValue(DETAIL);
    renderPage('/proveedores/s1?q=aceites', storeAs('edit'));
    const edit = await screen.findByRole('link', { name: 'Editar proveedor' });
    expect(edit.getAttribute('href')).toBe('/proveedores/s1/editar?q=aceites');
  });

  it('solo con permiso de ver no lo muestra', async () => {
    mockedFetch.mockResolvedValue(DETAIL);
    renderPage('/proveedores/s1', storeAs('view'));
    await screen.findByRole('heading', { level: 1, name: 'Aceites del Sur S.L.' });
    expect(screen.queryByRole('link', { name: 'Editar proveedor' })).toBeNull();
  });
});

describe('SupplierDetailPage · dar de baja (010 US4, FR-017)', () => {
  beforeEach(() => {
    mockedStatus.mockReset();
    mockedFetch.mockResolvedValue({ ...DETAIL, version: 2 });
  });

  async function openDialog() {
    renderPage('/proveedores/s1', storeAs('edit'));
    await userEvent.click(await screen.findByRole('button', { name: 'Dar de baja' }));
    return screen.getByRole('dialog', { name: '¿Dar de baja a Aceites del Sur S.L.?' });
  }

  it('pide confirmación y, al confirmar, avisa y muestra el sello «Baja»', async () => {
    mockedStatus.mockResolvedValue({ ...DETAIL, active: false, version: 3 });
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dar de baja' }));
    expect(await screen.findByText('Aceites del Sur S.L. dado de baja.')).toBeTruthy();
    expect(mockedStatus).toHaveBeenCalledWith('s1', { active: false, version: 2 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Baja')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeTruthy();
  });

  it('«Cancelar» cierra el diálogo sin cambiar nada', async () => {
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockedStatus).not.toHaveBeenCalled();
  });

  it('un error al guardar se muestra dentro del diálogo', async () => {
    mockedStatus.mockRejectedValue(new Error('Network Error'));
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dar de baja' }));
    expect(
      await within(dialog).findByText(
        'No se ha podido cambiar el estado del proveedor. Vuelve a intentarlo.',
      ),
    ).toBeTruthy();
  });
});

describe('SupplierDetailPage · reactivar y permisos (010 US4, FR-002, FR-019)', () => {
  beforeEach(() => mockedStatus.mockReset());

  it('«Reactivar» no pide confirmación y avisa', async () => {
    mockedFetch.mockResolvedValue({ ...DETAIL, active: false, version: 5 });
    mockedStatus.mockResolvedValue({ ...DETAIL, active: true, version: 6 });
    renderPage('/proveedores/s1', storeAs('edit'));
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivar' }));
    expect(await screen.findByText('Aceites del Sur S.L. reactivado.')).toBeTruthy();
    expect(mockedStatus).toHaveBeenCalledWith('s1', { active: true, version: 5 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Baja')).toBeNull();
  });

  it('solo con permiso de ver no ofrece dar de baja ni reactivar', async () => {
    mockedFetch.mockResolvedValue({ ...DETAIL, active: false });
    renderPage('/proveedores/s1', storeAs('view'));
    await screen.findByRole('heading', { level: 1, name: 'Aceites del Sur S.L.' });
    expect(screen.queryByRole('button', { name: 'Reactivar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).toBeNull();
  });
});
