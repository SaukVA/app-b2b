import { useEffect, useState } from 'react';
import { SupplierFilters } from '../features/suppliers/components/SupplierFilters';
import { SuppliersTable } from '../features/suppliers/components/SuppliersTable';
import { loadSuppliers } from '../features/suppliers/suppliersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './SuppliersPage.module.css';

/** «N activos» con el singular «1 activo» (FR-004a). */
function activeCountLabel(total: number): string {
  return total === 1 ? '1 activo' : `${total} activos`;
}

/** Proveedores (009): estructura del diseño «Albarán»; los proveedores aún no están cargados (FR-009). */
export function SuppliersPage() {
  const dispatch = useAppDispatch();
  const { items, total, status } = useAppSelector((state) => state.suppliers);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    const request = dispatch(loadSuppliers({ includeInactive: false, page: 1 }));
    return () => request.abort();
  }, [dispatch]);

  return (
    <section aria-labelledby="suppliers-title" className={styles.page}>
      <header className={styles.header}>
        <h1 id="suppliers-title" className={styles.title}>
          Proveedores
        </h1>
        <span className={styles.count}>{activeCountLabel(total)}</span>
      </header>
      <SupplierFilters
        search={search}
        includeInactive={includeInactive}
        onSearchChange={setSearch}
        onIncludeInactiveChange={setIncludeInactive}
      />
      <SuppliersTable rows={items} busy={status === 'loading'} />
    </section>
  );
}
