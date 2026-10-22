import { CUSTOMER_SEARCH_MAX_LENGTH } from '@app/shared';
import { TextField } from '../../../components/TextField';
import styles from './CustomerSearch.module.css';

export interface CustomerSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

/** Búsqueda del listado de Clientes (FR-004). Controlada: no guarda estado. */
export function CustomerSearch({ search, onSearchChange }: CustomerSearchProps) {
  return (
    <div role="search" aria-label="Buscar clientes" className={styles.search}>
      <TextField
        label="Buscar"
        type="search"
        placeholder="Buscar cliente"
        maxLength={CUSTOMER_SEARCH_MAX_LENGTH}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>
  );
}
