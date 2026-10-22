import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerSearch } from './CustomerSearch';

function renderSearch(onSearchChange = jest.fn()) {
  render(<CustomerSearch search="" onSearchChange={onSearchChange} />);
  return screen.getByRole('search', { name: 'Buscar clientes' });
}

describe('CustomerSearch', () => {
  it('es una región de búsqueda con el campo «Buscar» limitado a 100 caracteres', () => {
    const region = renderSearch();
    const search = within(region).getByRole('searchbox', { name: 'Buscar' });
    expect(search.getAttribute('type')).toBe('search');
    expect(search.getAttribute('maxLength')).toBe('100');
    expect(search.getAttribute('placeholder')).toBe('Buscar cliente');
  });

  it('avisa de cada cambio del texto', async () => {
    const onSearchChange = jest.fn();
    const region = renderSearch(onSearchChange);
    await userEvent.type(within(region).getByRole('searchbox', { name: 'Buscar' }), 'f');
    expect(onSearchChange).toHaveBeenCalledWith('f');
  });
});
