import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router';
import {
  currentQuarter,
  type AppModule,
  type ListPage,
  type PermissionLevel,
  type SupplierDetail,
  type SupplierListItem,
} from '@app/shared';
import { fetchSuppliers } from '../features/suppliers/suppliersApi';
import { loadSupplier } from '../features/suppliers/suppliersSlice';
import { setupStore } from '../store/store';
import { SuppliersPage } from './SuppliersPage';

jest.mock('../features/suppliers/suppliersApi', () => ({ fetchSuppliers: jest.fn() }));

const mockedFetch = jest.mocked(fetchSuppliers);
const QUARTER = currentQuarter(new Date());
const EMPTY_PAGE: ListPage<SupplierListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

beforeEach(() => {
  mockedFetch.mockReset();
  mockedFetch.mockResolvedValue(EMPTY_PAGE);
});

// MemoryRouter y no createMemoryRouter: el router de datos necesita `Request`, que jsdom no tiene.
const probe: { url: string; navigate: NavigateFunction | null } = { url: '', navigate: null };

function LocationProbe() {
  const location = useLocation();
  probe.url = location.pathname + location.search;
  probe.navigate = useNavigate();
  return null;
}

function renderPage(path = '/proveedores') {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={[path]}>
        <SuppliersPage />
        <LocationProbe />
      </MemoryRouter>
    </Provider>,
  );
  return {
    url: () => probe.url,
    navigate: (to: string | number) =>
      typeof to === 'number' ? probe.navigate?.(to) : probe.navigate?.(to),
  };
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Buscar' });
const inactiveBox = () =>
  screen.getByRole('checkbox', { name: 'Mostrar dados de baja' }) as HTMLInputElement;
const lastQuery = () => mockedFetch.mock.calls.at(-1)?.[0];

describe('SuppliersPage (US1)', () => {
  it('muestra el título y «0 activos» tras resolver la petición', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Proveedores' })).toBeTruthy();
    expect(await screen.findByText('0 activos')).toBeTruthy();
  });

  it('la casilla «Mostrar dados de baja» empieza desmarcada', async () => {
    renderPage();
    await screen.findByText('0 activos');
    expect(inactiveBox().checked).toBe(false);
  });

  it('no muestra «Nuevo proveedor» ni las acciones de la ficha lateral (FR-005)', async () => {
    renderPage();
    await screen.findByText('0 activos');
    const actions = [
      /Nuevo proveedor/,
      /Editar proveedor/,
      /Generar pedido de compra/,
      /Productos asociados/,
    ];
    for (const name of actions) {
      expect(screen.queryByRole('button', { name })).toBeNull();
      expect(screen.queryByRole('link', { name })).toBeNull();
    }
  });

  it('al montar pide el listado una vez con los criterios por defecto', async () => {
    renderPage();
    await screen.findByText('0 activos');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith({ includeInactive: false, quarter: QUARTER, page: 1 });
  });
});

describe('SuppliersPage · aviso y criterios en la dirección (US2)', () => {
  it('con el listado vacío muestra el aviso de proveedores pendientes y no hay paginación', async () => {
    renderPage();
    expect(await screen.findByText('Todavía no hay proveedores')).toBeTruthy();
    expect(screen.getByText('Los proveedores se cargarán desde el sistema anterior.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: /Paginación/ })).toBeNull();
  });

  it('lee la búsqueda de la dirección y pide el listado con ella', async () => {
    renderPage('/proveedores?q=levante');
    await screen.findByText('Todavía no hay proveedores');
    expect((searchBox() as HTMLInputElement).value).toBe('levante');
    expect(mockedFetch).toHaveBeenCalledWith({
      q: 'levante',
      includeInactive: false,
      quarter: QUARTER,
      page: 1,
    });
  });

  it('lee el filtro de bajas de la dirección: casilla marcada y «N proveedores»', async () => {
    renderPage('/proveedores?includeInactive=true');
    expect(await screen.findByText('0 proveedores')).toBeTruthy();
    expect(inactiveBox().checked).toBe(true);
    expect(lastQuery()).toEqual({ includeInactive: true, quarter: QUARTER, page: 1 });
  });
});

describe('SuppliersPage · filtro de bajas (US2, FR-004a)', () => {
  it('marcarlo pide el listado al momento, cambia el contador y deja una entrada en el historial', async () => {
    const { url, navigate } = renderPage('/proveedores?page=2');
    await screen.findByText('0 activos');
    await userEvent.click(inactiveBox());
    expect(await screen.findByText('0 proveedores')).toBeTruthy();
    expect(url()).toBe('/proveedores?includeInactive=true');
    expect(lastQuery()).toEqual({ includeInactive: true, quarter: QUARTER, page: 1 });
    expect(screen.getByText('Todavía no hay proveedores')).toBeTruthy();

    await act(async () => void (await navigate(-1)));
    expect(url()).toBe('/proveedores?page=2');
    expect(inactiveBox().checked).toBe(false);
    expect(await screen.findByText('0 activos')).toBeTruthy();
  });
});

describe('SuppliersPage · normalización de la dirección (US2, FR-007a)', () => {
  it('sustituye los valores no válidos por los de por defecto, sin error', async () => {
    const { url } = renderPage('/proveedores?page=abc&q=&includeInactive=si');
    await screen.findByText('Todavía no hay proveedores');
    expect(url()).toBe('/proveedores');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(lastQuery()).toEqual({ includeInactive: false, quarter: QUARTER, page: 1 });
  });

  it('al montar conserva la página de la dirección', async () => {
    const { url } = renderPage('/proveedores?q=levante&page=2');
    await screen.findByText('Todavía no hay proveedores');
    expect(url()).toBe('/proveedores?q=levante&page=2');
    expect(lastQuery()).toEqual({
      q: 'levante',
      includeInactive: false,
      quarter: QUARTER,
      page: 2,
    });
  });
});

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const wait = (ms: number) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));

describe('SuppliersPage · búsqueda con espera (US2, FR-007)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('al teclear pide el listado una sola vez, 300 ms después de la última tecla', async () => {
    const user = setupUser();
    const { url } = renderPage();
    await wait(0);
    mockedFetch.mockClear();
    await user.type(searchBox(), 'café');
    await wait(299);
    expect(mockedFetch).not.toHaveBeenCalled();
    await wait(1);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(lastQuery()).toEqual({ q: 'café', includeInactive: false, quarter: QUARTER, page: 1 });
    expect(url()).toBe('/proveedores?q=caf%C3%A9');
  });

  it('cambiar la búsqueda vuelve a la página 1 y conserva el filtro de bajas', async () => {
    const user = setupUser();
    const { url } = renderPage('/proveedores?q=levante&includeInactive=true&page=2');
    await wait(0);
    await user.clear(searchBox());
    await user.type(searchBox(), 'bazar');
    await wait(300);
    expect(url()).toBe('/proveedores?q=bazar&includeInactive=true');
    expect(lastQuery()).toEqual({ q: 'bazar', includeInactive: true, quarter: QUARTER, page: 1 });
  });
});

describe('SuppliersPage · dirección cambiada desde fuera (US2, FR-007a)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('el campo y la casilla se resincronizan y la espera no deshace la navegación', async () => {
    const user = setupUser();
    const { url, navigate } = renderPage();
    await wait(0);
    await user.type(searchBox(), 'levante');
    await wait(300);
    await act(async () => void (await navigate('/proveedores?q=bar&includeInactive=true')));
    await wait(300);
    expect((searchBox() as HTMLInputElement).value).toBe('bar');
    expect(inactiveBox().checked).toBe(true);
    expect(url()).toBe('/proveedores?q=bar&includeInactive=true');
    expect(lastQuery()).toEqual({ q: 'bar', includeInactive: true, quarter: QUARTER, page: 1 });
  });
});

describe('SuppliersPage · error del listado (US3)', () => {
  it('si la petición falla muestra el error y no el aviso de proveedores pendientes', async () => {
    mockedFetch.mockRejectedValue(new Error('Network Error'));
    renderPage('/proveedores?q=levante');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Todavía no hay proveedores')).toBeNull();
  });

  it('«Reintentar» vuelve a pedir con los mismos criterios y, si responde, muestra el aviso', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Network Error'));
    renderPage('/proveedores?q=levante&includeInactive=true&page=2');
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Todavía no hay proveedores')).toBeTruthy();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(lastQuery()).toEqual({ q: 'levante', includeInactive: true, quarter: QUARTER, page: 2 });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

// Ficha del proveedor (010 US2): filas enlazadas, foco al volver y aviso de proveedor inexistente.
const ROWS: SupplierListItem[] = ['s1', 's2'].map((id, i) => ({
  id,
  name: `Proveedor ${i + 1}`,
  cif: `B0000000${i}`,
  city: 'Valencia',
  leadTimeDays: null,
  quarterPurchases: 0,
  yearPurchases: 0,
  active: true,
}));

function renderWith(
  entry: { pathname: string; search?: string; state?: unknown },
  lastId?: string,
) {
  const store = setupStore();
  if (lastId) {
    store.dispatch(loadSupplier.fulfilled({ id: lastId } as SupplierDetail, 'request', lastId));
  }
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[entry]}>
        <SuppliersPage />
      </MemoryRouter>
    </Provider>,
  );
}

const rowLink = (name: string) =>
  within(screen.getByRole('table', { name: 'Proveedores' })).getByRole('link', { name });

describe('SuppliersPage · enlace a la ficha y foco al volver (010 FR-012, FR-014)', () => {
  beforeEach(() => mockedFetch.mockResolvedValue({ ...EMPTY_PAGE, items: ROWS, total: 2 }));

  it('cada fila enlaza con la ficha conservando los criterios del listado', async () => {
    renderWith({ pathname: '/proveedores', search: '?q=prov&includeInactive=true' });
    await screen.findByText('2 proveedores');
    expect(rowLink('Proveedor 2').getAttribute('href')).toBe(
      '/proveedores/s2?q=prov&includeInactive=true',
    );
  });

  it('al volver de una ficha el foco queda en la fila de ese proveedor', async () => {
    renderWith({ pathname: '/proveedores' }, 's2');
    await screen.findByText('2 activos');
    expect(document.activeElement).toBe(rowLink('Proveedor 2'));
  });

  it('sin una ficha abierta antes no mueve el foco', async () => {
    renderWith({ pathname: '/proveedores' });
    await screen.findByText('2 activos');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('SuppliersPage · proveedor inexistente (010 FR-015)', () => {
  beforeEach(() => mockedFetch.mockResolvedValue({ ...EMPTY_PAGE, items: ROWS, total: 2 }));

  it('un enlace a un proveedor inexistente muestra el aviso, que se cierra con «Entendido»', async () => {
    renderWith({ pathname: '/proveedores', state: { notFound: true } });
    expect(
      await screen.findByText(
        'El enlace apunta a un proveedor que no existe. Busca el proveedor en el listado.',
      ),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByText(/El enlace apunta a un proveedor que no existe/)).toBeNull();
  });

  it('sin el aviso en la navegación no lo muestra', async () => {
    renderWith({ pathname: '/proveedores' });
    await screen.findByText('2 activos');
    expect(screen.queryByText(/El enlace apunta a un proveedor que no existe/)).toBeNull();
  });
});

const NO_PERMISSIONS: Record<AppModule, PermissionLevel> = {
  ventas: 'none',
  clientes: 'none',
  productos: 'none',
  proveedores: 'none',
  cobros: 'none',
  ajustes: 'none',
};

/** Listado con un usuario cuyo permiso en Proveedores es `level`. */
function renderAs(level: 'view' | 'edit') {
  const store = setupStore({
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
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/proveedores?q=ace']}>
        <SuppliersPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('SuppliersPage · alta con permiso de editar (010 US1, FR-002, FR-022)', () => {
  it('con permiso de editar muestra «Nuevo proveedor», que conserva los criterios', async () => {
    renderAs('edit');
    const link = await screen.findByRole('link', { name: 'Nuevo proveedor' });
    expect(link.getAttribute('href')).toBe('/proveedores/nuevo?q=ace');
  });

  it('con permiso de editar el aviso vacío invita a dar de alta uno', async () => {
    mockedFetch.mockResolvedValue(EMPTY_PAGE);
    renderAs('edit');
    expect(
      await screen.findByText('Mientras tanto, puedes dar de alta uno con «Nuevo proveedor».'),
    ).toBeTruthy();
  });

  it('solo con permiso de ver no muestra «Nuevo proveedor» ni la invitación', async () => {
    renderAs('view');
    await screen.findByText('Todavía no hay proveedores');
    expect(screen.queryByRole('link', { name: 'Nuevo proveedor' })).toBeNull();
    expect(screen.queryByText(/puedes dar de alta uno/)).toBeNull();
  });
});
