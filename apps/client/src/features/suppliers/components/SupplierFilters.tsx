import { SUPPLIER_SEARCH_MAX_LENGTH } from '@app/shared';
import { Checkbox } from '../../../components/Checkbox';
import { TextField } from '../../../components/TextField';
import styles from './SupplierFilters.module.css';

export interface SupplierFiltersProps {
  search: string;
  includeInactive: boolean;
  onSearchChange: (search: string) => void;
  onIncludeInactiveChange: (includeInactive: boolean) => void;
}

/** Búsqueda por nombre o CIF y filtro de bajas del listado de Proveedores (FR-004, FR-018). Controlado. */
export function SupplierFilters({
  search,
  includeInactive,
  onSearchChange,
  onIncludeInactiveChange,
}: SupplierFiltersProps) {
  return (
    <div role="search" aria-label="Buscar proveedores" className={styles.filters}>
      <div className={styles.search}>
        <TextField
          label="Buscar"
          type="search"
          placeholder="Nombre o CIF"
          maxLength={SUPPLIER_SEARCH_MAX_LENGTH}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <Checkbox
        label="Mostrar dados de baja"
        checked={includeInactive}
        onChange={(event) => onIncludeInactiveChange(event.target.checked)}
      />
    </div>
  );
}
