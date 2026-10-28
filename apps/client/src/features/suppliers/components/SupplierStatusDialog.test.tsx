import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierStatusDialog } from './SupplierStatusDialog';

const onConfirm = jest.fn();
const onCancel = jest.fn();

beforeEach(() => {
  onConfirm.mockReset();
  onCancel.mockReset();
});

function renderDialog(props: { error?: string | null; busy?: boolean } = {}) {
  render(
    <SupplierStatusDialog
      supplierName="Aceites del Sur"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
}

describe('SupplierStatusDialog (FR-017, contracts/suppliers-ui.md)', () => {
  it('pregunta por el proveedor y explica que no se borra nada', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: '¿Dar de baja a Aceites del Sur?' })).toBeTruthy();
    expect(
      screen.getByText(
        'Dejará de aparecer en el listado. No se borra ningún dato: podrás verlo con «Mostrar dados de baja» y reactivarlo cuando quieras.',
      ),
    ).toBeTruthy();
  });

  it('«Dar de baja» confirma y «Cancelar» cierra', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('muestra el error dentro del diálogo', () => {
    renderDialog({
      error: 'No se ha podido cambiar el estado del proveedor. Vuelve a intentarlo.',
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'No se ha podido cambiar el estado del proveedor. Vuelve a intentarlo.',
    );
  });

  it('mientras guarda deshabilita «Dar de baja»', () => {
    renderDialog({ busy: true });
    expect(
      (screen.getByRole('button', { name: 'Dar de baja' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
