import { Alert } from '../../../components/Alert';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PRODUCTS_LOAD_ERROR_MESSAGE, type ProductsState } from '../productsSlice';
import styles from './ProductsListStatus.module.css';

export interface ProductsListStatusProps {
  status: ProductsState['status'];
  total: number;
  /** Vuelve a pedir el listado con los mismos criterios (US3). */
  onRetry: () => void;
}

/** Error que se anuncia de inmediato y se distingue del catálogo vacío por su texto (FR-014, FR-015). */
function LoadError({ onRetry }: Pick<ProductsListStatusProps, 'onRetry'>) {
  return (
    <div className={styles.error}>
      <Alert variant="error">{PRODUCTS_LOAD_ERROR_MESSAGE}</Alert>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/**
 * Zona de estado bajo las cabeceras del listado: cargando, aviso de catálogo pendiente de carga o error,
 * nunca dos a la vez (FR-012 a FR-014). Con productos no muestra nada.
 */
export function ProductsListStatus({ status, total, onRetry }: ProductsListStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className={styles.loading}>
        Cargando productos…
      </p>
    );
  }
  if (status === 'failed') return <LoadError onRetry={onRetry} />;
  if (status === 'succeeded' && total === 0) {
    return (
      <EmptyState title="Todavía no hay productos">
        El catálogo se cargará desde el sistema anterior.
      </EmptyState>
    );
  }
  return null;
}
