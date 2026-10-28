import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { SUPPLIERS_LOAD_ERROR_MESSAGE, type SuppliersState } from '../suppliersSlice';
import styles from './SuppliersListStatus.module.css';

export interface SuppliersListStatusProps {
  status: SuppliersState['status'];
  total: number;
  /** Vuelve a pedir el listado con los mismos criterios (US3). */
  onRetry: () => void;
  /** Con permiso de editar, el aviso vacío invita a dar de alta uno (010 FR-022). */
  canEdit?: boolean;
}

/** Error que se anuncia de inmediato y se distingue del listado vacío por su texto (FR-013, FR-014). */
function LoadError({ onRetry }: Pick<SuppliersListStatusProps, 'onRetry'>) {
  return (
    <div className={styles.error}>
      <Alert variant="error">{SUPPLIERS_LOAD_ERROR_MESSAGE}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Zona de estado bajo las cabeceras del listado: cargando, aviso de proveedores pendientes de carga o
 * error, nunca dos a la vez (FR-011 a FR-013). Con proveedores no muestra nada.
 */
export function SuppliersListStatus({
  status,
  total,
  onRetry,
  canEdit = false,
}: SuppliersListStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className={styles.loading}>
        Cargando proveedores…
      </p>
    );
  }
  if (status === 'failed') return <LoadError onRetry={onRetry} />;
  if (status === 'succeeded' && total === 0) {
    return (
      <EmptyState title="Todavía no hay proveedores">
        Los proveedores se cargarán desde el sistema anterior.
        {canEdit && (
          <>
            {' '}
            <span>Mientras tanto, puedes dar de alta uno con «Nuevo proveedor».</span>
          </>
        )}
      </EmptyState>
    );
  }
  return null;
}
