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

  it('la variante warning es una nota que no interrumpe (role="note")', () => {
    render(<Alert variant="warning">Has entrado con la cuenta inicial.</Alert>);
    expect(screen.getByRole('note').textContent).toContain('Has entrado con la cuenta inicial.');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
