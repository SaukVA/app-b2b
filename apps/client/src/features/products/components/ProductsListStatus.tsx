import { EmptyState } from '../../../components/EmptyState';
import type { ProductsState } from '../productsSlice';
import styles from './ProductsListStatus.module.css';

export interface ProductsListStatusProps {
  status: ProductsState['status'];
  total: number;
  /** Vuelve a pedir el listado con los mismos criterios (US3). */
  onRetry: () => void;
}

/**
 * Zona de estado bajo las cabeceras del listado: cargando o aviso de catálogo pendiente de carga, nunca
 * los dos a la vez (FR-012, FR-013). Con productos no muestra nada.
 */
export function ProductsListStatus({ status, total }: ProductsListStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className={styles.loading}>
        Cargando productos…
      </p>
    );
  }
  if (status === 'succeeded' && total === 0) {
    return (
      <EmptyState title="Todavía no hay productos">
        El catálogo se cargará desde el sistema anterior.
      </EmptyState>
    );
  }
  return null;
}
