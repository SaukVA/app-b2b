import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Tabs } from './Tabs';

const TABS = [
  { to: '/ajustes/apariencia', label: 'Apariencia' },
  { to: '/ajustes/usuarios', label: 'Usuarios' },
];

describe('Tabs', () => {
  it('pinta una navegación con un enlace por pestaña', () => {
    render(
      <MemoryRouter initialEntries={['/ajustes/usuarios']}>
        <Tabs label="Secciones de Ajustes" tabs={TABS} />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Secciones de Ajustes' });
    expect(nav).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Apariencia' }).getAttribute('href')).toBe(
      '/ajustes/apariencia',
    );
  });

  it('marca la pestaña activa con aria-current="page"', () => {
    render(
      <MemoryRouter initialEntries={['/ajustes/usuarios']}>
        <Tabs label="Secciones de Ajustes" tabs={TABS} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Usuarios' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Apariencia' }).getAttribute('aria-current'),
    ).toBeNull();
  });
});
