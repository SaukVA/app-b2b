import { render, screen } from '@testing-library/react';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('muestra la inicial, el nombre y el subtítulo', () => {
    render(<BrandMark name="Mayorista" subtitle="Venta a mayoristas" />);
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('Mayorista')).toBeTruthy();
    expect(screen.getByText('Venta a mayoristas')).toBeTruthy();
  });

  it('sin nombre solo muestra el logotipo', () => {
    const { container } = render(<BrandMark />);
    expect(container.textContent).toBe('M');
  });
});
