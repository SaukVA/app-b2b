import { EmptyState } from '../../../components/EmptyState';
import type { SuppliersState } from '../suppliersSlice';
import styles from './SuppliersListStatus.module.css';

export interface SuppliersListStatusProps {
  status: SuppliersState['status'];
  total: number;
  /** Vuelve a pedir el listado con los mismos criterios (US3). */
  onRetry: () => void;
}

/**
 * Zona de estado bajo las cabeceras del listado: cargando o aviso de proveedores pendientes de carga,
 * nunca los dos a la vez (FR-011, FR-012). Con proveedores no muestra nada.
 */
export function SuppliersListStatus({ status, total }: SuppliersListStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className={styles.loading}>
        Cargando proveedores…
      </p>
    );
  }
  if (status === 'succeeded' && total === 0) {
    return (
      <EmptyState title="Todavía no hay proveedores">
        Los proveedores se cargarán desde el sistema anterior.
      </EmptyState>
    );
  }
  return null;
}
