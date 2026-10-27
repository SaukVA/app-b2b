import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import type { SupplierListQuery } from '@app/shared';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { SupplierFilters } from '../features/suppliers/components/SupplierFilters';
import { SuppliersListStatus } from '../features/suppliers/components/SuppliersListStatus';
import { SuppliersTable } from '../features/suppliers/components/SuppliersTable';
import {
  parseSupplierCriteria,
  serializeSupplierCriteria,
} from '../features/suppliers/supplierCriteria';
import { loadSuppliers } from '../features/suppliers/suppliersSlice';
import { selectCan } from '../features/auth/authSelectors';
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

/** Aviso de un enlace a un proveedor que no existe (010 FR-015); se cierra con «Entendido». */
function NotFoundNotice() {
  const { state } = useLocation();
  const [visible, setVisible] = useState(
    Boolean((state as { notFound?: boolean } | null)?.notFound),
  );
  if (!visible) return null;
  return (
    <div className={styles.notice}>
      <Alert variant="info">
        El enlace apunta a un proveedor que no existe. Busca el proveedor en el listado.
      </Alert>
      <Button variant="secondary" onClick={() => setVisible(false)}>
        Entendido
      </Button>
    </div>
  );
}

/** Título, contador y, con permiso de editar, «Nuevo proveedor» con los criterios del listado (010 FR-002). */
function SuppliersHeader({ countLabel, newUrl }: { countLabel: string; newUrl: string | null }) {
  return (
    <header className={styles.header}>
      <h1 id="suppliers-title" className={styles.title}>
        Proveedores
      </h1>
      <span className={styles.count}>{countLabel}</span>
      {newUrl && (
        <Link to={newUrl} className={styles.newButton}>
          Nuevo proveedor
        </Link>
      )}
    </header>
  );
}

/** Proveedores: listado con búsqueda, filtro de bajas y trimestre; cada fila abre su ficha (010). */
export function SuppliersPage() {
  const { items, total, status } = useAppSelector((state) => state.suppliers);
  const lastOpenedId = useAppSelector((state) => state.suppliers.detail.data?.id);
  const canEdit = useAppSelector(selectCan('proveedores', 'edit'));
  const { criteria, update } = useSupplierCriteria();
  const listQuery = serializeSupplierCriteria(criteria).toString();
  const [search, setSearch] = useSearchField(criteria.q, update);
  const retry = useLoadSuppliers(criteria);

  return (
    <section aria-labelledby="suppliers-title" className={styles.page}>
      <SuppliersHeader
        countLabel={supplierCountLabel(total, criteria.includeInactive)}
        newUrl={canEdit ? `/proveedores/nuevo${listQuery ? `?${listQuery}` : ''}` : null}
      />
      <NotFoundNotice />
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
        search={listQuery}
        focusId={lastOpenedId}
        busy={status === 'loading'}
        status={
          <SuppliersListStatus status={status} total={total} onRetry={retry} canEdit={canEdit} />
        }
      />
    </section>
  );
}
