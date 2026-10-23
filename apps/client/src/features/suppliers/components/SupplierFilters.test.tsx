import { fireEvent, render, screen, within } from '@testing-library/react';
import { SupplierFilters } from './SupplierFilters';

function renderFilters(includeInactive = false) {
  const onSearchChange = jest.fn();
  const onIncludeInactiveChange = jest.fn();
  render(
    <SupplierFilters
      search=""
      includeInactive={includeInactive}
      onSearchChange={onSearchChange}
      onIncludeInactiveChange={onIncludeInactiveChange}
    />,
  );
  const region = screen.getByRole('search', { name: 'Buscar proveedores' });
  return { region, onSearchChange, onIncludeInactiveChange };
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
