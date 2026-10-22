import { EmptyState } from '../../../components/EmptyState';
import type { CustomersState } from '../customersSlice';
import styles from './CustomersListStatus.module.css';

export interface CustomersListStatusProps {
  status: CustomersState['status'];
  total: number;
  /** Vuelve a pedir el listado con los mismos criterios (US3). */
  onRetry: () => void;
}

/**
 * Zona de estado bajo las cabeceras del listado: cargando o aviso de cartera pendiente de carga, nunca dos a
 * la vez (FR-011, FR-012). Con clientes no muestra nada.
 */
export function CustomersListStatus({ status, total }: CustomersListStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className={styles.loading}>
        Cargando clientes…
      </p>
    );
  }
  if (status === 'succeeded' && total === 0) {
    return (
      <EmptyState title="Todavía no hay clientes">
        La cartera se cargará desde el sistema anterior.
      </EmptyState>
    );
  }
  return null;
}
