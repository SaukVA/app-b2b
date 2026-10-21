import { useEffect, useState } from 'react';
import { ProductFilters } from '../features/products/components/ProductFilters';
import { ProductsTable } from '../features/products/components/ProductsTable';
import { loadProducts } from '../features/products/productsSlice';
import { useAppDispatch, useAppSelector } from '../store/store';
import styles from './ProductsPage.module.css';

/** Productos (006): estructura del diseño «Albarán»; el catálogo aún no está cargado (FR-010). */
export function ProductsPage() {
  const dispatch = useAppDispatch();
  const { items, total } = useAppSelector((state) => state.products);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);

  // US2 sustituye esta llamada por los criterios de la dirección de la pantalla.
  useEffect(() => {
    void dispatch(loadProducts({ lowStock: false, page: 1 }));
  }, [dispatch]);

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
        lowStock={lowStock}
        onSearchChange={setSearch}
        onLowStockChange={setLowStock}
      />
      <ProductsTable rows={items} />
    </section>
  );
}
