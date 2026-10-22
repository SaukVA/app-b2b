import { useEffect, useState } from 'react';
import { CustomerSearch } from '../features/customers/components/CustomerSearch';
import { CustomersTable } from '../features/customers/components/CustomersTable';
import { loadCustomers } from '../features/customers/customersSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './CustomersPage.module.css';

/** Clientes (007): estructura del diseño «Albarán»; la cartera aún no está cargada (FR-009). */
export function CustomersPage() {
  const dispatch = useAppDispatch();
  const { items, total, status } = useAppSelector((state) => state.customers);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const request = dispatch(loadCustomers({ page: 1 }));
    return () => request.abort();
  }, [dispatch]);

  return (
    <section aria-labelledby="customers-title" className={styles.page}>
      <header className={styles.header}>
        <h1 id="customers-title" className={styles.title}>
          Clientes
        </h1>
        <span className={styles.count}>{total} fichas</span>
      </header>
      <CustomerSearch search={search} onSearchChange={setSearch} />
      <CustomersTable rows={items} busy={status === 'loading'} />
    </section>
  );
}
