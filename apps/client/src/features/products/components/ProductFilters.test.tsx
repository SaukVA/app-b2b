import { render, screen, within } from '@testing-library/react';
import { ProductFilters } from './ProductFilters';

function renderFilters() {
  render(
    <ProductFilters
      search=""
      lowStock={false}
      onSearchChange={jest.fn()}
      onLowStockChange={jest.fn()}
    />,
  );
  return screen.getByRole('search', { name: 'Filtrar productos' });
}

const optionTexts = (select: HTMLElement) =>
  Array.from((select as HTMLSelectElement).options).map((option) => option.text);

describe('ProductFilters', () => {
  it('es una región de búsqueda con el campo «Buscar» limitado a 100 caracteres', () => {
    const region = renderFilters();
    const search = within(region).getByRole('searchbox', { name: 'Buscar' });
    expect(search.getAttribute('type')).toBe('search');
    expect(search.getAttribute('maxLength')).toBe('100');
  });

  it('sin catálogo, Categoría y Subcategoría solo ofrecen «Todas» y Proveedor solo «Todos»', () => {
    const region = renderFilters();
    expect(optionTexts(within(region).getByRole('combobox', { name: 'Categoría' }))).toEqual([
      'Todas',
    ]);
    expect(optionTexts(within(region).getByRole('combobox', { name: 'Subcategoría' }))).toEqual([
      'Todas',
    ]);
    expect(optionTexts(within(region).getByRole('combobox', { name: 'Proveedor' }))).toEqual([
      'Todos',
    ]);
  });

  it('tiene la casilla «Solo stock bajo»', () => {
    const region = renderFilters();
    expect(within(region).getByRole('checkbox', { name: 'Solo stock bajo' })).toBeTruthy();
  });
});
