import { PRODUCT_SEARCH_MAX_LENGTH } from '@app/shared';
import { Checkbox } from '../../../components/Checkbox';
import { Select } from '../../../components/Select';
import { TextField } from '../../../components/TextField';
import styles from './ProductFilters.module.css';

export interface ProductFiltersProps {
  search: string;
  lowStock: boolean;
  onSearchChange: (search: string) => void;
  onLowStockChange: (lowStock: boolean) => void;
}

// Sin catálogo no hay opciones reales: saldrán de los datos cuando se migre (FR-006).
const ALL_FEMININE = [{ value: '', label: 'Todas' }];
const ALL_MASCULINE = [{ value: '', label: 'Todos' }];

/** Búsqueda y filtros del listado de Productos (FR-004, FR-006). Controlado: no guarda estado. */
export function ProductFilters({
  search,
  lowStock,
  onSearchChange,
  onLowStockChange,
}: ProductFiltersProps) {
  return (
    <div role="search" aria-label="Filtrar productos" className={styles.filters}>
      <div className={styles.search}>
        <TextField
          label="Buscar"
          type="search"
          placeholder="Código o nombre"
          maxLength={PRODUCT_SEARCH_MAX_LENGTH}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <Select label="Categoría" options={ALL_FEMININE} defaultValue="" />
      <Select label="Subcategoría" options={ALL_FEMININE} defaultValue="" />
      <Select label="Proveedor" options={ALL_MASCULINE} defaultValue="" />
      <Checkbox
        label="Solo stock bajo"
        checked={lowStock}
        onChange={(event) => onLowStockChange(event.target.checked)}
      />
    </div>
  );
}
