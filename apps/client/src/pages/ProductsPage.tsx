import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ProductListQuery } from '@app/shared';
import { ProductFilters } from '../features/products/components/ProductFilters';
import { ProductsListStatus } from '../features/products/components/ProductsListStatus';
import { ProductsTable } from '../features/products/components/ProductsTable';
import {
  parseProductCriteria,
  serializeProductCriteria,
} from '../features/products/productCriteria';
import { loadProducts } from '../features/products/productsSlice';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './ProductsPage.module.css';

const SEARCH_DELAY_MS = 300;

type UpdateCriteria = (changes: Partial<ProductListQuery>, options: { replace: boolean }) => void;

/**
 * Criterios leídos de la dirección (research R6). Una dirección con valores no válidos o parámetros que
 * todavía no se usan se normaliza con `replace`. Cambiar un criterio vuelve a la página 1.
 */
function useProductCriteria(): { criteria: ProductListQuery; update: UpdateCriteria } {
  const [params, setParams] = useSearchParams();
  const canonical = serializeProductCriteria(parseProductCriteria(params)).toString();
  const criteria = useMemo(() => parseProductCriteria(new URLSearchParams(canonical)), [canonical]);

  useEffect(() => {
    if (params.toString() !== canonical) setParams(canonical, { replace: true });
  }, [params, canonical, setParams]);

  const update = useCallback<UpdateCriteria>(
    (changes, { replace }) =>
      setParams(serializeProductCriteria({ ...criteria, ...changes, page: 1 }), { replace }),
    [criteria, setParams],
  );
  return { criteria, update };
}

/**
 * Texto del campo de búsqueda: pasa a la dirección 300 ms después de la última tecla (FR-008) y solo si
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

/** Pide el listado cada vez que cambian los criterios y aborta la petición anterior (research R7). */
function useLoadProducts(criteria: ProductListQuery): () => void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const request = dispatch(loadProducts(criteria));
    return () => request.abort();
  }, [dispatch, criteria]);
  return useCallback(() => void dispatch(loadProducts(criteria)), [dispatch, criteria]);
}

/** Productos (006): estructura del diseño «Albarán»; el catálogo aún no está cargado (FR-010). */
export function ProductsPage() {
  const { items, total, status } = useAppSelector((state) => state.products);
  const { criteria, update } = useProductCriteria();
  const [search, setSearch] = useSearchField(criteria.q, update);
  const retry = useLoadProducts(criteria);

  return (
    <section aria-labelledby="products-title" className={styles.page}>
      <header className={styles.header}>
        <h1 id="products-title" className={styles.title}>
          Productos
        </h1>
        <span className={styles.count}>{total} referencias</span>
      </header>
      <ProductFilters
        search={search}
        lowStock={criteria.lowStock}
        onSearchChange={setSearch}
        onLowStockChange={(lowStock) => update({ lowStock }, { replace: false })}
      />
      <ProductsTable
        rows={items}
        busy={status === 'loading'}
        status={<ProductsListStatus status={status} total={total} onRetry={retry} />}
      />
    </section>
  );
}
