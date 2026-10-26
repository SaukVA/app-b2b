import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router';
import { currentQuarter, type ListPage, type SupplierListItem } from '@app/shared';
import { fetchSuppliers } from '../features/suppliers/suppliersApi';
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
