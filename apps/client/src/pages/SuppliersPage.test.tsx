import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { ListPage, SupplierListItem } from '@app/shared';
import { fetchSuppliers } from '../features/suppliers/suppliersApi';
import { setupStore } from '../store/store';
import { SuppliersPage } from './SuppliersPage';

jest.mock('../features/suppliers/suppliersApi', () => ({ fetchSuppliers: jest.fn() }));

const mockedFetch = jest.mocked(fetchSuppliers);
const EMPTY_PAGE: ListPage<SupplierListItem> = { items: [], total: 0, page: 1, pageSize: 10 };

beforeEach(() => {
  mockedFetch.mockReset();
  mockedFetch.mockResolvedValue(EMPTY_PAGE);
});

// MemoryRouter y no createMemoryRouter: el router de datos necesita `Request`, que jsdom no tiene.
function renderPage(path = '/proveedores') {
  render(
    <Provider store={setupStore()}>
      <MemoryRouter initialEntries={[path]}>
        <SuppliersPage />
      </MemoryRouter>
    </Provider>,
  );
}

describe('SuppliersPage (US1)', () => {
  it('muestra el título y «0 activos» tras resolver la petición', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Proveedores' })).toBeTruthy();
    expect(await screen.findByText('0 activos')).toBeTruthy();
  });

  it('la casilla «Mostrar dados de baja» empieza desmarcada', async () => {
    renderPage();
    await screen.findByText('0 activos');
    const checkbox = screen.getByRole('checkbox', { name: 'Mostrar dados de baja' });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
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
    expect(mockedFetch).toHaveBeenCalledWith({ includeInactive: false, page: 1 });
  });
});
