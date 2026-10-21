import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { NavBar, type NavBarItem } from './NavBar';

const ITEMS: NavBarItem[] = [
  { to: '/ajustes', label: 'Ajustes', icon: <svg />, section: 'footer' },
  { to: '/ventas', label: 'Ventas', icon: <svg /> },
  { to: '/clientes', label: 'Clientes', icon: <svg /> },
];

function renderNavBar(items: NavBarItem[] = ITEMS, path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
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

describe('NavBar · elemento activo', () => {
  it.each(['/ajustes/usuarios', '/ajustes'])(
    'en %s, Ajustes es el único con aria-current="page" (contrato N2)',
    (path) => {
      renderNavBar(ITEMS, path);
      const current = within(nav())
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page');
      expect(current.map((link) => link.textContent)).toEqual(['Ajustes']);
    },
  );
});

function LocationProbe() {
  return <p>Ruta: {useLocation().pathname}</p>;
}

function renderWithPending() {
  render(
    <MemoryRouter initialEntries={['/ajustes']}>
      <NavBar
        label="Principal"
        brand={<span>Marca</span>}
        items={[
          { to: '/ventas', label: 'Ventas', icon: <svg />, pending: true },
          ...ITEMS.slice(0, 1),
        ]}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
  return within(nav()).getByRole('link', { name: /Ventas/ });
}

describe('NavBar · elemento pendiente (contrato N3)', () => {
  it('es un link deshabilitado, enfocable y sin href, con «Pendiente» escrito', () => {
    const ventas = renderWithPending();
    expect(ventas.getAttribute('aria-disabled')).toBe('true');
    expect(ventas.tabIndex).toBe(0);
    expect(ventas.hasAttribute('href')).toBe(false);
    expect(within(ventas).getByText('Pendiente')).toBeTruthy();
  });

  it('recibe el foco con Tab', async () => {
    const ventas = renderWithPending();
    await userEvent.tab();
    expect(document.activeElement).toBe(ventas);
  });

  it('ni el clic, ni Intro, ni Espacio cambian la ruta', async () => {
    const ventas = renderWithPending();
    await userEvent.click(ventas);
    ventas.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(screen.getByText('Ruta: /ajustes')).toBeTruthy();
  });
});

function renderCollapsible({ collapsed = false, onToggle = jest.fn() } = {}) {
  render(
    <MemoryRouter initialEntries={['/ajustes']}>
      <NavBar
        label="Principal"
        brand={<span>Marca completa</span>}
        brandCollapsed={<span>Logo</span>}
        items={[...ITEMS, { to: '/cobros', label: 'Cobros', icon: <svg />, pending: true }]}
        footer={<button type="button">Cerrar sesión</button>}
        collapsed={collapsed}
        onToggleCollapsed={onToggle}
        toggleIcon={<svg />}
      />
    </MemoryRouter>,
  );
  return onToggle;
}

describe('NavBar · plegado (contrato N4, N5)', () => {
  it('desplegado: botón «Plegar menú» con aria-expanded="true" que controla el nav', () => {
    renderCollapsible();
    const toggle = screen.getByRole('button', { name: 'Plegar menú' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(nav().id).not.toBe('');
    expect(toggle.getAttribute('aria-controls')).toBe(nav().id);
    expect(within(nav()).getByText('Marca completa')).toBeTruthy();
  });

  it('plegado: botón «Desplegar menú» con aria-expanded="false"', () => {
    renderCollapsible({ collapsed: true });
    const toggle = screen.getByRole('button', { name: 'Desplegar menú' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe(nav().id);
  });

  it('plegado: los enlaces conservan su nombre y el pendiente sigue anunciando «Pendiente»', () => {
    renderCollapsible({ collapsed: true });
    expect(within(nav()).getByRole('link', { name: 'Clientes' })).toBeTruthy();
    expect(within(nav()).getByRole('link', { name: 'Ajustes' })).toBeTruthy();
    const cobros = within(nav()).getByRole('link', { name: /Cobros/ });
    expect(cobros.textContent).toContain('Pendiente');
  });

  it('plegado: pinta brandCollapsed en lugar de brand', () => {
    renderCollapsible({ collapsed: true });
    expect(within(nav()).getByText('Logo')).toBeTruthy();
    expect(within(nav()).queryByText('Marca completa')).toBeNull();
  });

  it('plegado: el footer sigue pintado y «Cerrar sesión» accesible por nombre (FR-013)', () => {
    renderCollapsible({ collapsed: true });
    expect(within(nav()).getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
  });

  it('pulsar el botón llama a onToggleCollapsed', async () => {
    const onToggle = renderCollapsible();
    await userEvent.click(screen.getByRole('button', { name: 'Plegar menú' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
