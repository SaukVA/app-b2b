import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { CustomerListQuery } from '@app/shared';
import { CustomerSearch } from '../features/customers/components/CustomerSearch';
import { CustomersListStatus } from '../features/customers/components/CustomersListStatus';
import { CustomersTable } from '../features/customers/components/CustomersTable';
import {
  parseCustomerCriteria,
  serializeCustomerCriteria,
} from '../features/customers/customerCriteria';
import { loadCustomers } from '../features/customers/customersSlice';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './CustomersPage.module.css';

const SEARCH_DELAY_MS = 300;

type UpdateSearch = (q: string | undefined) => void;

/**
 * Criterios leídos de la dirección (research R8). Una dirección con valores no válidos se normaliza con
 * `replace`, sin error. Cambiar la búsqueda vuelve a la página 1.
 */
function useCustomerCriteria(): { criteria: CustomerListQuery; updateSearch: UpdateSearch } {
  const [params, setParams] = useSearchParams();
  const canonical = serializeCustomerCriteria(parseCustomerCriteria(params)).toString();
  const criteria = useMemo(
    () => parseCustomerCriteria(new URLSearchParams(canonical)),
    [canonical],
  );

  useEffect(() => {
    if (params.toString() !== canonical) setParams(canonical, { replace: true });
  }, [params, canonical, setParams]);

  const updateSearch = useCallback<UpdateSearch>(
    (q) => setParams(serializeCustomerCriteria({ q, page: 1 }), { replace: true }),
    [setParams],
  );
  return { criteria, updateSearch };
}

/**
 * Texto del campo de búsqueda: pasa a la dirección 300 ms después de la última tecla (FR-007) y solo si
 * cambia, así montar la pantalla no pierde la página. Si la dirección cambia desde fuera («Atrás», enlace),
 * el campo se resincroniza durante el render, antes de que el valor desfasado pueda reescribirla.
 */
function useSearchField(q: string | undefined, updateSearch: UpdateSearch) {
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
    updateSearch(debounced.trim() || undefined);
  }, [debounced, search, current, updateSearch]);

  return [search, setSearch] as const;
}

/** Pide el listado cada vez que cambian los criterios y aborta la petición anterior (research R9). */
function useLoadCustomers(criteria: CustomerListQuery): () => void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const request = dispatch(loadCustomers(criteria));
    return () => request.abort();
  }, [dispatch, criteria]);
  return useCallback(() => void dispatch(loadCustomers(criteria)), [dispatch, criteria]);
}

/** Clientes (007): estructura del diseño «Albarán»; la cartera aún no está cargada (FR-009). */
export function CustomersPage() {
  const { items, total, status } = useAppSelector((state) => state.customers);
  const { criteria, updateSearch } = useCustomerCriteria();
  const [search, setSearch] = useSearchField(criteria.q, updateSearch);
  const retry = useLoadCustomers(criteria);

  return (
    <section aria-labelledby="customers-title" className={styles.page}>
      <header className={styles.header}>
        <h1 id="customers-title" className={styles.title}>
          Clientes
        </h1>
        <span className={styles.count}>{total} fichas</span>
      </header>
      <CustomerSearch search={search} onSearchChange={setSearch} />
      <CustomersTable
        rows={items}
        busy={status === 'loading'}
        status={<CustomersListStatus status={status} total={total} onRetry={retry} />}
      />
    </section>
  );
}
