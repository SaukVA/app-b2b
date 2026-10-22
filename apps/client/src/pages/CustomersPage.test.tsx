import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router';
import type { CustomerListItem, ListPage } from '@app/shared';
import { fetchCustomers } from '../features/customers/customersApi';
import { setupStore } from '../store/store';
import { CustomersPage } from './CustomersPage';

jest.mock('../features/customers/customersApi', () => ({ fetchCustomers: jest.fn() }));

const mockedFetch = jest.mocked(fetchCustomers);
const EMPTY_PAGE: ListPage<CustomerListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

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

function renderPage(path = '/clientes') {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={[path]}>
        <CustomersPage />
        <LocationProbe />
      </MemoryRouter>
    </Provider>,
  );
  return { url: () => probe.url, navigate: (to: string) => probe.navigate?.(to) };
}

describe('CustomersPage (US1)', () => {
  it('muestra el título y «0 fichas» tras resolver la petición', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeTruthy();
    expect(await screen.findByText('0 fichas')).toBeTruthy();
  });

  it('no muestra «Nuevo cliente» ni las acciones de la ficha lateral (FR-005)', async () => {
    renderPage();
    await screen.findByText('0 fichas');
    for (const name of [/Nuevo cliente/, /Nueva venta/, /Editar ficha/, /Ver ventas/]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
      expect(screen.queryByRole('link', { name })).toBeNull();
    }
  });

  it('al montar pide el listado una vez con los criterios por defecto', async () => {
    renderPage();
    await screen.findByText('0 fichas');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith({ page: 1 });
  });
});

const searchBox = () => screen.getByRole('searchbox', { name: 'Buscar' });
const lastQuery = () => mockedFetch.mock.calls.at(-1)?.[0];

describe('CustomersPage · aviso y criterios en la dirección (US2)', () => {
  it('con el listado vacío muestra el aviso de cartera pendiente y no hay paginación', async () => {
    renderPage();
    expect(await screen.findByText('Todavía no hay clientes')).toBeTruthy();
    expect(screen.getByText('La cartera se cargará desde el sistema anterior.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: /Paginación/ })).toBeNull();
  });

  it('lee la búsqueda de la dirección y pide el listado con ella', async () => {
    renderPage('/clientes?q=ferreteria');
    await screen.findByText('Todavía no hay clientes');
    expect((searchBox() as HTMLInputElement).value).toBe('ferreteria');
    expect(mockedFetch).toHaveBeenCalledWith({ q: 'ferreteria', page: 1 });
  });
});

describe('CustomersPage · normalización de la dirección (US2, FR-007a)', () => {
  it('sustituye los valores no válidos por los de por defecto, sin error', async () => {
    const { url } = renderPage('/clientes?page=abc&q=');
    await screen.findByText('Todavía no hay clientes');
    expect(url()).toBe('/clientes');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(lastQuery()).toEqual({ page: 1 });
  });

  it('al montar conserva la página de la dirección', async () => {
    const { url } = renderPage('/clientes?q=ferreteria&page=2');
    await screen.findByText('Todavía no hay clientes');
    expect(url()).toBe('/clientes?q=ferreteria&page=2');
    expect(lastQuery()).toEqual({ q: 'ferreteria', page: 2 });
  });
});

const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
const wait = (ms: number) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));

describe('CustomersPage · búsqueda con espera (US2, FR-007)', () => {
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
    expect(lastQuery()).toEqual({ q: 'café', page: 1 });
    expect(url()).toBe('/clientes?q=caf%C3%A9');
  });

  it('cambiar la búsqueda vuelve a la página 1', async () => {
    const user = setupUser();
    const { url } = renderPage('/clientes?q=ferreteria&page=2');
    await wait(0);
    await user.clear(searchBox());
    await user.type(searchBox(), 'bazar');
    await wait(300);
    expect(url()).toBe('/clientes?q=bazar');
    expect(lastQuery()).toEqual({ q: 'bazar', page: 1 });
  });
});

describe('CustomersPage · dirección cambiada desde fuera (US2, FR-007a)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('si la dirección cambia desde fuera, el campo se resincroniza y la espera no la deshace', async () => {
    const user = setupUser();
    const { url, navigate } = renderPage();
    await wait(0);
    await user.type(searchBox(), 'ferreteria');
    await wait(300);
    await act(async () => void (await navigate('/clientes?q=bazar')));
    await wait(300);
    expect((searchBox() as HTMLInputElement).value).toBe('bazar');
    expect(url()).toBe('/clientes?q=bazar');
    expect(lastQuery()).toEqual({ q: 'bazar', page: 1 });
  });
});
