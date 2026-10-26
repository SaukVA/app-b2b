import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { BackLink } from './BackLink';

function Destination() {
  const location = useLocation();
  return <p>Destino {location.pathname + location.search}</p>;
}

function renderBackLink() {
  const router = createMemoryRouter(
    [
      {
        path: '/proveedores/:id',
        element: (
          <BackLink to="/proveedores?q=sur&page=2" label="Volver al listado de proveedores">
            Proveedores
          </BackLink>
        ),
      },
      { path: '/proveedores', element: <Destination /> },
    ],
    { initialEntries: ['/proveedores/1'] },
  );
  render(<RouterProvider router={router} />);
}

describe('BackLink', () => {
  it('es un enlace con el texto visible y el nombre accesible', () => {
    renderBackLink();
    const link = screen.getByRole('link', { name: 'Volver al listado de proveedores' });
    expect(link.textContent).toContain('Proveedores');
  });

  it('lleva al destino con su query', () => {
    renderBackLink();
    const link = screen.getByRole('link', { name: 'Volver al listado de proveedores' });
    expect(link.getAttribute('href')).toBe('/proveedores?q=sur&page=2');
  });

  it('dibuja la flecha como decoración, oculta a los lectores de pantalla', () => {
    renderBackLink();
    const svg = screen.getByRole('link').querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('usa la clase con el objetivo táctil de 44 px', () => {
    renderBackLink();
    expect(screen.getByRole('link').className).toContain('backLink');
  });
});
