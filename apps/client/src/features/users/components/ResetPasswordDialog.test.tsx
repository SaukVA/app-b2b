import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordDialog } from './ResetPasswordDialog';

const NOTICE =
  'Pon una contraseña nueva a Bea Gómez y comunícasela por tu cuenta. Sus sesiones abiertas se cerrarán y la contraseña anterior dejará de servir.';

function renderDialog(props: { error?: string | null } = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  render(
    <ResetPasswordDialog userName="Bea Gómez" onSubmit={onSubmit} onClose={onClose} {...props} />,
  );
  return { onSubmit, onClose };
}

function passwordInput(): HTMLInputElement {
  return screen.getByLabelText('Contraseña nueva');
}

/** Texto de los elementos a los que apunta `aria-describedby`. */
function descriptionOf(element: HTMLElement): string {
  const ids = (element.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
}

async function submitPassword(value: string) {
  await userEvent.type(passwordInput(), value);
  await userEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
}

describe('ResetPasswordDialog (US5)', () => {
  it('muestra el título y el texto con el nombre del usuario', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Restablecer contraseña' });
    expect(descriptionOf(dialog)).toBe(NOTICE);
    expect(descriptionOf(passwordInput())).toBe('Mínimo 8 caracteres.');
  });

  it('con menos de 8 caracteres no envía e indica el motivo', async () => {
    const { onSubmit } = renderDialog();
    await submitPassword('1234567');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(passwordInput().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionOf(passwordInput())).toBe('Mínimo 8 caracteres.');
  });

  it('con 8 caracteres o más llama a onSubmit con la contraseña', async () => {
    const { onSubmit } = renderDialog();
    await submitPassword('nuevaClave456');
    expect(onSubmit).toHaveBeenCalledWith('nuevaClave456');
  });

  it('muestra el error recibido', () => {
    renderDialog({ error: 'El usuario no existe.' });
    expect(screen.getByRole('alert').textContent).toContain('El usuario no existe.');
  });

  it('«Cancelar» cierra sin enviar', async () => {
    const { onSubmit, onClose } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
