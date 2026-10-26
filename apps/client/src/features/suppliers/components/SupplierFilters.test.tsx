import { fireEvent, render, screen, within } from '@testing-library/react';
import { SupplierFilters } from './SupplierFilters';

function renderFilters(includeInactive = false) {
  const onSearchChange = jest.fn();
  const onIncludeInactiveChange = jest.fn();
  const onQuarterChange = jest.fn();
  render(
    <SupplierFilters
      search=""
      includeInactive={includeInactive}
      quarter={2}
      year={2026}
      onSearchChange={onSearchChange}
      onIncludeInactiveChange={onIncludeInactiveChange}
      onQuarterChange={onQuarterChange}
    />,
  );
  const region = screen.getByRole('search', { name: 'Buscar proveedores' });
  return { region, onSearchChange, onIncludeInactiveChange, onQuarterChange };
}

describe('SupplierFilters', () => {
  it('es una región de búsqueda con «Buscar» por nombre o CIF, limitado a 100 caracteres', () => {
    const { region } = renderFilters();
    const search = within(region).getByRole('searchbox', { name: 'Buscar' });
    expect(search.getAttribute('type')).toBe('search');
    expect(search.getAttribute('maxLength')).toBe('100');
    expect(search.getAttribute('placeholder')).toBe('Nombre o CIF');
  });

  it('la casilla «Mostrar dados de baja» refleja includeInactive', () => {
    const { region } = renderFilters(true);
    const checkbox = within(region).getByRole('checkbox', { name: 'Mostrar dados de baja' });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('avisa al escribir y al marcar la casilla', () => {
    const { region, onSearchChange, onIncludeInactiveChange } = renderFilters();
    fireEvent.change(within(region).getByRole('searchbox', { name: 'Buscar' }), {
      target: { value: 'levante' },
    });
    fireEvent.click(within(region).getByRole('checkbox', { name: 'Mostrar dados de baja' }));
    expect(onSearchChange).toHaveBeenCalledWith('levante');
    expect(onIncludeInactiveChange).toHaveBeenCalledWith(true);
  });
});

describe('SupplierFilters · gasto por trimestre (FR-021a)', () => {
  it('ofrece 1T–4T del año con el trimestre elegido marcado', () => {
    const { region } = renderFilters();
    const group = within(region).getByRole('radiogroup', { name: 'Gasto por trimestre · 2026' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.textContent?.slice(0, 2))).toEqual(['1T', '2T', '3T', '4T']);
    expect(within(group).getByRole('radio', { name: /^2T/ }).getAttribute('aria-checked')).toBe(
      'true',
    );
  });

  it('avisa del trimestre elegido como número', () => {
    const { region, onQuarterChange } = renderFilters();
    fireEvent.click(within(region).getByRole('radio', { name: /^4T/ }));
    expect(onQuarterChange).toHaveBeenCalledWith(4);
  });
});
