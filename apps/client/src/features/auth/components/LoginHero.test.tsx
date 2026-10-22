import { render, screen, within } from '@testing-library/react';
import { LoginHero } from './LoginHero';

describe('LoginHero', () => {
  it('muestra el titular de presentación sin la marca (008, FR-001)', () => {
    render(<LoginHero />);
    const hero = screen.getByRole('region', { name: 'Presentación' });
    expect(
      within(hero).getByRole('heading', { name: 'Todo el ciclo de venta, en una sola hoja.' }),
    ).toBeTruthy();
    expect(within(hero).queryByText('Venta a mayoristas')).toBeNull();
    expect(within(hero).queryByText('M')).toBeNull();
  });
});
