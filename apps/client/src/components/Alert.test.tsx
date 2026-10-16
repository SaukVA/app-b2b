import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert', () => {
  it('la variante error se anuncia con role="alert"', () => {
    render(<Alert>Email o contraseña incorrectos.</Alert>);
    expect(screen.getByRole('alert').textContent).toContain('Email o contraseña incorrectos.');
  });

  it('la variante info usa role="status"', () => {
    render(<Alert variant="info">Contacta con un administrador.</Alert>);
    expect(screen.getByRole('status').textContent).toContain('Contacta con un administrador.');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
