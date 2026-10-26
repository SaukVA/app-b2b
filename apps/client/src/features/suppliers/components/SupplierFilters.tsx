import { useId } from 'react';
import { SUPPLIER_SEARCH_MAX_LENGTH, type Quarter } from '@app/shared';
import { Checkbox } from '../../../components/Checkbox';
import { OptionGroup, type OptionGroupOption } from '../../../components/OptionGroup';
import { TextField } from '../../../components/TextField';
import styles from './SupplierFilters.module.css';

export interface SupplierFiltersProps {
  search: string;
  includeInactive: boolean;
  quarter: Quarter;
  /** Año en curso, para la etiqueta «Gasto por trimestre · <año>». */
  year: number;
  onSearchChange: (search: string) => void;
  onIncludeInactiveChange: (includeInactive: boolean) => void;
  onQuarterChange: (quarter: Quarter) => void;
}

const QUARTER_OPTIONS: OptionGroupOption<'1' | '2' | '3' | '4'>[] = [
  { value: '1', label: '1T' },
  { value: '2', label: '2T' },
  { value: '3', label: '3T' },
  { value: '4', label: '4T' },
];

/**
 * Búsqueda por nombre o CIF, filtro de bajas y trimestre del gasto del listado de Proveedores (009 FR-004,
 * 010 FR-021a). Controlado.
 */
export function SupplierFilters(props: SupplierFiltersProps) {
  const quarterLabelId = useId();
  return (
    <div role="search" aria-label="Buscar proveedores" className={styles.filters}>
      <div className={styles.search}>
        <TextField
          label="Buscar"
          type="search"
          placeholder="Nombre o CIF"
          maxLength={SUPPLIER_SEARCH_MAX_LENGTH}
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
        />
      </div>
      <Checkbox
        label="Mostrar dados de baja"
        checked={props.includeInactive}
        onChange={(event) => props.onIncludeInactiveChange(event.target.checked)}
      />
      <div className={styles.quarter}>
        <span id={quarterLabelId} className={styles.quarterLabel}>
          Gasto por trimestre · {props.year}
        </span>
        <OptionGroup
          labelledBy={quarterLabelId}
          options={QUARTER_OPTIONS}
          value={String(props.quarter) as '1' | '2' | '3' | '4'}
          onChange={(value) => props.onQuarterChange(Number(value) as Quarter)}
        />
      </div>
    </div>
  );
}
