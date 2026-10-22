import { render, screen } from '@testing-library/react';
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
