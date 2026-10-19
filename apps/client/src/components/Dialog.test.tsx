import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';

function Harness({ onClose = () => undefined }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onClose();
    setOpen(false);
  };
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <Dialog
          title="¿Bloquear a Ana?"
          description="Perderá el acceso en 15 minutos como máximo."
          onClose={close}
          actions={
            <>
              <button onClick={close}>Cancelar</button>
              <button>Bloquear</button>
            </>
          }
        >
          <input aria-label="Motivo" />
        </Dialog>
      )}
    </>
  );
}

async function openDialog(onClose?: () => void) {
  render(<Harness onClose={onClose} />);
  await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
  return screen.getByRole('dialog');
}

describe('Dialog', () => {
  it('es un diálogo modal con nombre y descripción accesibles', async () => {
    const dialog = await openDialog();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByRole('dialog', { name: '¿Bloquear a Ana?' })).toBe(dialog);
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Perderá el acceso en 15 minutos como máximo.').id,
    );
  });

  it('pone el foco en el primer control', async () => {
    await openDialog();
    expect(document.activeElement).toBe(screen.getByLabelText('Motivo'));
  });

  it('atrapa el foco con Tab dentro del diálogo', async () => {
    await openDialog();
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bloquear' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Motivo'));
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Bloquear' }));
  });

  it('Escape cierra y devuelve el foco al disparador', async () => {
    const onClose = jest.fn();
    await openDialog(onClose);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Abrir' }));
  });
});
