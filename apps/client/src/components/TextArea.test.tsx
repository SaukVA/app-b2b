import { render, screen } from '@testing-library/react';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  it('asocia la etiqueta al área de texto', () => {
    render(<TextArea label="Observaciones" />);
    expect(screen.getByLabelText('Observaciones').tagName).toBe('TEXTAREA');
  });

  it('muestra el error, lo enlaza con aria-describedby y marca aria-invalid', () => {
    render(<TextArea label="Observaciones" error="Demasiado largo" />);
    const textarea = screen.getByLabelText('Observaciones');
    const message = screen.getByText('Demasiado largo');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('sin error no marca aria-invalid ni aria-describedby', () => {
    render(<TextArea label="Observaciones" />);
    const textarea = screen.getByLabelText('Observaciones');
    expect(textarea.getAttribute('aria-invalid')).toBeNull();
    expect(textarea.getAttribute('aria-describedby')).toBeNull();
  });

  it('pasa maxLength y rows al área de texto', () => {
    render(<TextArea label="Observaciones" maxLength={2000} rows={4} />);
    const textarea = screen.getByLabelText('Observaciones');
    expect(textarea.getAttribute('maxlength')).toBe('2000');
    expect(textarea.getAttribute('rows')).toBe('4');
  });
});
