import { render, screen } from '@testing-library/react';
import { StatusStamp } from './StatusStamp';

describe('StatusStamp', () => {
  it('muestra el estado como texto legible', () => {
    render(<StatusStamp tone="ok">Activo</StatusStamp>);
    expect(screen.getByText('Activo')).toBeTruthy();
  });

  it('aplica el tono indicado (por defecto, neutral)', () => {
    const { container, rerender } = render(<StatusStamp tone="danger">Bloqueado</StatusStamp>);
    expect(container.firstElementChild?.getAttribute('data-tone')).toBe('danger');
    rerender(<StatusStamp>Borrador</StatusStamp>);
    expect(container.firstElementChild?.getAttribute('data-tone')).toBe('neutral');
  });

  it('el marcador cuadrado es decorativo', () => {
    const { container } = render(<StatusStamp tone="ok">Activo</StatusStamp>);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
