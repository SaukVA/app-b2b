import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('muestra el título y el texto en un contenedor que se anuncia (role="status")', () => {
    render(<EmptyState title="Todavía no hay datos">Se cargarán más adelante.</EmptyState>);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Todavía no hay datos');
    expect(status.textContent).toContain('Se cargarán más adelante.');
  });
});
