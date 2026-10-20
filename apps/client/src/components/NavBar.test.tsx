import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NavBar, type NavBarItem } from './NavBar';

const ITEMS: NavBarItem[] = [
  { to: '/ajustes', label: 'Ajustes', icon: <svg />, section: 'footer' },
  { to: '/ventas', label: 'Ventas', icon: <svg /> },
  { to: '/clientes', label: 'Clientes', icon: <svg /> },
];

function renderNavBar(items: NavBarItem[] = ITEMS) {
  render(
    <MemoryRouter>
      <NavBar
        label="Principal"
        brand={<span>Marca</span>}
        items={items}
        footer={<span>Pie del menú</span>}
      />
    </MemoryRouter>,
  );
}

const nav = () => screen.getByRole('navigation', { name: 'Principal' });

describe('NavBar', () => {
  it('pinta un único navigation con el label recibido', () => {
    renderNavBar();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(nav()).toBeTruthy();
  });

  it('pone los elementos principales en orden y los del pie después', () => {
    renderNavBar();
    const links = within(nav()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Ventas', 'Clientes', 'Ajustes']);
  });

  it('cada elemento es un enlace con su label que lleva a su ruta', () => {
    renderNavBar();
    const clientes = within(nav()).getByRole('link', { name: 'Clientes' });
    expect(clientes.getAttribute('href')).toBe('/clientes');
  });

  it('pinta el footer y la marca recibidos', () => {
    renderNavBar();
    expect(within(nav()).getByText('Pie del menú')).toBeTruthy();
    expect(within(nav()).getByText('Marca')).toBeTruthy();
  });

  it('sin onToggleCollapsed no hay botón de plegar', () => {
    renderNavBar();
    expect(screen.queryByRole('button', { name: /menú/ })).toBeNull();
  });
});
