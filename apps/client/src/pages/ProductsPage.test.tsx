import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
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

function renderPage(path = '/productos') {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={[path]}>
        <ProductsPage />
      </MemoryRouter>
    </Provider>,
  );
}

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
