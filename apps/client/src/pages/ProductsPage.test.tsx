import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router';
import type { ListPage, ProductListItem } from '@app/shared';
import { fetchProducts } from '../features/products/productsApi';
import { setupStore } from '../store/store';
import { ProductsPage } from './ProductsPage';

jest.mock('../features/products/productsApi', () => ({ fetchProducts: jest.fn() }));

const mockedFetch = jest.mocked(fetchProducts);
const EMPTY_PAGE: ListPage<ProductListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

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

function renderPage(path = '/productos') {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={[path]}>
        <ProductsPage />
        <LocationProbe />
      </MemoryRouter>
    </Provider>,
  );
  return { url: () => probe.url, goBack: () => probe.navigate?.(-1) };
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Buscar' });
const lowStockBox = () => screen.getByRole('checkbox', { name: 'Solo stock bajo' });
const lastQuery = () => mockedFetch.mock.calls.at(-1)?.[0];

describe('ProductsPage (US1)', () => {
  it('muestra el título y «0 referencias» tras resolver la petición', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeTruthy();
    expect(await screen.findByText('0 referencias')).toBeTruthy();
  });

  it('no muestra «Importar CSV» ni «Nuevo producto»', async () => {
    renderPage();
    await screen.findByText('0 referencias');
    expect(screen.queryByRole('button', { name: /Importar CSV/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Nuevo producto/ })).toBeNull();
  });

  it('al montar pide el listado una vez con los criterios por defecto', async () => {
    renderPage();
    await screen.findByText('0 referencias');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith({ lowStock: false, page: 1 });
  });
});

describe('ProductsPage · aviso y criterios en la dirección (US2)', () => {
  it('con el listado vacío muestra el aviso de catálogo pendiente y no hay paginación', async () => {
    renderPage();
    expect(await screen.findByText('Todavía no hay productos')).toBeTruthy();
    expect(screen.getByText('El catálogo se cargará desde el sistema anterior.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: /Paginación/ })).toBeNull();
  });

  it('lee la búsqueda y «solo stock bajo» de la dirección y pide el listado con ellos', async () => {
    renderPage('/productos?q=aceite&lowStock=true');
    await screen.findByText('Todavía no hay productos');
    expect((searchBox() as HTMLInputElement).value).toBe('aceite');
    expect((lowStockBox() as HTMLInputElement).checked).toBe(true);
    expect(mockedFetch).toHaveBeenCalledWith({ q: 'aceite', lowStock: true, page: 1 });
  });

  it('marcar «Solo stock bajo» pide el listado con lowStock y la página 1', async () => {
    const user = userEvent.setup();
    const { url } = renderPage('/productos?page=2');
    await screen.findByText('Todavía no hay productos');
    await user.click(lowStockBox());
    expect(lastQuery()).toEqual({ lowStock: true, page: 1 });
    expect(url()).toBe('/productos?lowStock=true');
  });
});

describe('ProductsPage · normalización de la dirección (US2, FR-008a)', () => {
  it('normaliza una dirección con valores no válidos', async () => {
    const { url } = renderPage('/productos?page=0&q=');
    await screen.findByText('Todavía no hay productos');
    expect(url()).toBe('/productos');
  });

  it('quita de la dirección la categoría, que aún no se puede filtrar, y no la envía', async () => {
    const { url } = renderPage('/productos?category=alimentacion&q=aceite');
    await screen.findByText('Todavía no hay productos');
    expect(url()).toBe('/productos?q=aceite');
    expect(mockedFetch).toHaveBeenCalledWith({ q: 'aceite', lowStock: false, page: 1 });
    expect(mockedFetch.mock.calls.some(([query]) => 'category' in query)).toBe(false);
  });

  it('al montar conserva la página de la dirección', async () => {
    const { url } = renderPage('/productos?q=aceite&page=2');
    await screen.findByText('Todavía no hay productos');
    expect(url()).toBe('/productos?q=aceite&page=2');
    expect(lastQuery()).toEqual({ q: 'aceite', lowStock: false, page: 2 });
  });
});

describe('ProductsPage · búsqueda con espera (US2, FR-008)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setupUser = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const wait = (ms: number) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));

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
    expect(lastQuery()).toEqual({ q: 'café', lowStock: false, page: 1 });
    expect(url()).toBe('/productos?q=caf%C3%A9');
  });

  it('«Atrás» devuelve la búsqueda anterior y el debounce no la deshace', async () => {
    const user = setupUser();
    const { url, goBack } = renderPage();
    await wait(0);
    await user.type(searchBox(), 'aceite');
    await wait(300);
    await user.click(lowStockBox());
    await user.clear(searchBox());
    await user.type(searchBox(), 'café');
    await wait(300);
    expect(url()).toBe('/productos?q=caf%C3%A9&lowStock=true');

    await act(async () => void (await goBack()));
    await wait(300);
    expect((searchBox() as HTMLInputElement).value).toBe('aceite');
    expect(url()).toBe('/productos?q=aceite');
    expect(lastQuery()).toEqual({ q: 'aceite', lowStock: false, page: 1 });
  });
});
