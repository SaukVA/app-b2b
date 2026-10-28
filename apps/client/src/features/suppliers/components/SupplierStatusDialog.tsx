import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';

export interface SupplierStatusDialogProps {
  supplierName: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Error del último intento; se muestra dentro del diálogo. */
  error?: string | null;
  busy?: boolean;
}

/** Confirmación de baja: no borra nada y se puede deshacer con «Reactivar» (FR-017, FR-018). */
export function SupplierStatusDialog({
  supplierName,
  onConfirm,
  onCancel,
  error,
  busy = false,
}: SupplierStatusDialogProps) {
  return (
    <Dialog
      title={`¿Dar de baja a ${supplierName}?`}
      description="Dejará de aparecer en el listado. No se borra ningún dato: podrás verlo con «Mostrar dados de baja» y reactivarlo cuando quieras."
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            Dar de baja
          </Button>
        </>
      }
    >
      {error && <Alert variant="error">{error}</Alert>}
    </Dialog>
  );
}
