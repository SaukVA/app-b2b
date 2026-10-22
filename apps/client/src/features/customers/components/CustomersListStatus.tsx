import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { CUSTOMERS_LOAD_ERROR_MESSAGE, type CustomersState } from '../customersSlice';
import styles from './CustomersListStatus.module.css';

export interface CustomersListStatusProps {
  status: CustomersState['status'];
  total: number;
  /** Vuelve a pedir el listado con los mismos criterios (US3). */
  onRetry: () => void;
}

/** Error que se anuncia de inmediato y se distingue de la cartera vacía por su texto (FR-013, FR-014). */
function LoadError({ onRetry }: Pick<CustomersListStatusProps, 'onRetry'>) {
  return (
    <div className={styles.error}>
      <Alert variant="error">{CUSTOMERS_LOAD_ERROR_MESSAGE}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Zona de estado bajo las cabeceras del listado: cargando, aviso de cartera pendiente de carga o error,
 * nunca dos a la vez (FR-011 a FR-013). Con clientes no muestra nada.
 */
export function CustomersListStatus({ status, total, onRetry }: CustomersListStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className={styles.loading}>
        Cargando clientes…
      </p>
    );
  }
  if (status === 'failed') return <LoadError onRetry={onRetry} />;
  if (status === 'succeeded' && total === 0) {
    return (
      <EmptyState title="Todavía no hay clientes">
        La cartera se cargará desde el sistema anterior.
      </EmptyState>
    );
  }
  return null;
}
