import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('oculta la contraseña por defecto', () => {
    render(<PasswordField label="Contraseña" />);
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('password');
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('alterna la visibilidad con texto accesible y aria-pressed', async () => {
    render(<PasswordField label="Contraseña" />);
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('text');
    const toggle = screen.getByRole('button', { name: 'Ocultar contraseña' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(toggle);
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('password');
  });
});
