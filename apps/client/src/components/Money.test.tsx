import { render, screen } from '@testing-library/react';
import { Money } from './Money';

describe('Money', () => {
  it('muestra el importe con el formato "es"', () => {
    render(<Money value={1248.5} format="es" />);
    expect(screen.getByText('1.248,50 €')).toBeTruthy();
  });

  it('muestra el importe con el formato "en"', () => {
    render(<Money value={1248.5} format="en" />);
    expect(screen.getByText('€ 1,248.50')).toBeTruthy();
  });

  it('solo formatea el número que recibe, sin añadir nada más (FR-013)', () => {
    const { container } = render(<Money value={-35} format="es" />);
    expect(container.textContent).toBe('-35,00 €');
  });
});
