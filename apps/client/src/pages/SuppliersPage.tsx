import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { SupplierListQuery } from '@app/shared';
import { SupplierFilters } from '../features/suppliers/components/SupplierFilters';
import { SuppliersListStatus } from '../features/suppliers/components/SuppliersListStatus';
import { SuppliersTable } from '../features/suppliers/components/SuppliersTable';
import {
  parseSupplierCriteria,
  serializeSupplierCriteria,
} from '../features/suppliers/supplierCriteria';
import { loadSuppliers } from '../features/suppliers/suppliersSlice';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './SuppliersPage.module.css';

const SEARCH_DELAY_MS = 300;

type UpdateCriteria = (changes: Partial<SupplierListQuery>, options: { replace: boolean }) => void;

/**
 * Criterios leídos de la dirección (research R8). Una dirección con valores no válidos se normaliza con
 * `replace`, sin error. Cambiar un criterio vuelve a la página 1.
 */
function useSupplierCriteria(): { criteria: SupplierListQuery; update: UpdateCriteria } {
  const [params, setParams] = useSearchParams();
  const canonical = serializeSupplierCriteria(parseSupplierCriteria(params)).toString();
  const criteria = useMemo(
    () => parseSupplierCriteria(new URLSearchParams(canonical)),
    [canonical],
  );

  useEffect(() => {
    if (params.toString() !== canonical) setParams(canonical, { replace: true });
  }, [params, canonical, setParams]);

  const update = useCallback<UpdateCriteria>(
    (changes, { replace }) =>
      setParams(serializeSupplierCriteria({ ...criteria, ...changes, page: 1 }), { replace }),
    [criteria, setParams],
  );
  return { criteria, update };
}

/**
 * Texto del campo de búsqueda: pasa a la dirección 300 ms después de la última tecla (FR-007) y solo si
 * cambia, así montar la pantalla no pierde la página. Si la dirección cambia desde fuera («Atrás», enlace),
 * el campo se resincroniza durante el render, antes de que el valor desfasado pueda reescribirla.
 */
function useSearchField(q: string | undefined, update: UpdateCriteria) {
  const current = q ?? '';
  const [search, setSearch] = useState(current);
  const [syncedQ, setSyncedQ] = useState(current);
  if (current !== syncedQ) {
    setSyncedQ(current);
    if (search.trim() !== current) setSearch(current);
  }
  const debounced = useDebouncedValue(search, SEARCH_DELAY_MS);

  useEffect(() => {
    if (debounced !== search || debounced.trim() === current) return;
    update({ q: debounced.trim() || undefined }, { replace: true });
  }, [debounced, search, current, update]);

  return [search, setSearch] as const;
}

/** Pide el listado cada vez que cambian los criterios y aborta la petición anterior (research R9). */
function useLoadSuppliers(criteria: SupplierListQuery): () => void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const request = dispatch(loadSuppliers(criteria));
    return () => request.abort();
  }, [dispatch, criteria]);
  return useCallback(() => void dispatch(loadSuppliers(criteria)), [dispatch, criteria]);
}

/** «N activos» sin el filtro de bajas y «N proveedores» con él, con su singular (FR-004a). */
function supplierCountLabel(total: number, includeInactive: boolean): string {
  if (includeInactive) return total === 1 ? '1 proveedor' : `${total} proveedores`;
  return total === 1 ? '1 activo' : `${total} activos`;
}

/** Proveedores (009): estructura del diseño «Albarán»; los proveedores aún no están cargados (FR-009). */
export function SuppliersPage() {
  const { items, total, status } = useAppSelector((state) => state.suppliers);
  const { criteria, update } = useSupplierCriteria();
  const [search, setSearch] = useSearchField(criteria.q, update);
  const retry = useLoadSuppliers(criteria);

  return (
    <section aria-labelledby="suppliers-title" className={styles.page}>
      <header className={styles.header}>
        <h1 id="suppliers-title" className={styles.title}>
          Proveedores
        </h1>
        <span className={styles.count}>{supplierCountLabel(total, criteria.includeInactive)}</span>
      </header>
      <SupplierFilters
        search={search}
        includeInactive={criteria.includeInactive}
        onSearchChange={setSearch}
        onIncludeInactiveChange={(includeInactive) =>
          update({ includeInactive }, { replace: false })
        }
        quarter={criteria.quarter}
        year={new Date().getFullYear()}
        onQuarterChange={(quarter) => update({ quarter }, { replace: false })}
      />
      <SuppliersTable
        rows={items}
        quarter={criteria.quarter}
        busy={status === 'loading'}
        status={<SuppliersListStatus status={status} total={total} onRetry={retry} />}
      />
    </section>
  );
}
