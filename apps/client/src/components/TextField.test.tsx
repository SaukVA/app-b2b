import { render, screen } from '@testing-library/react';
import { TextField } from './TextField';

describe('TextField', () => {
  it('asocia la etiqueta al campo', () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText('Email').tagName).toBe('INPUT');
  });

  it('muestra el error, lo enlaza con aria-describedby y marca aria-invalid', () => {
    render(<TextField label="Email" error="Introduce tu email" />);
    const input = screen.getByLabelText('Email');
    const message = screen.getByText('Introduce tu email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('marca aria-invalid sin mensaje con invalid', () => {
    render(<TextField label="Email" invalid />);
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });

  it('muestra la acción de la etiqueta', () => {
    render(<TextField label="Contraseña" labelAction={<a href="#x">¿La has olvidado?</a>} />);
    expect(screen.getByText('¿La has olvidado?')).toBeTruthy();
  });
});
