import type { ProductListItem, ProductStatus } from '@app/shared';
import { StatusStamp, type StatusTone } from '../../../components/StatusStamp';
import { Table, type TableColumn } from '../../../components/Table';
import { UserMoney } from '../../preferences/components/UserMoney';
import styles from './ProductsTable.module.css';

export interface ProductsTableProps {
  rows: readonly ProductListItem[];
}

const STATUS_TONES: Record<ProductStatus, StatusTone> = {
  Disponible: 'ok',
  'Stock bajo': 'warning',
  'Sin stock': 'danger',
};

const categoryPath = (product: ProductListItem) =>
  product.subcategory ? `${product.category} › ${product.subcategory}` : product.category;

// Stock y mínimo son cantidades, nunca importes (CLAUDE.md): cifras Mono sin UserMoney.
const stockText = (product: ProductListItem) => `${product.stock} / mín. ${product.minStock}`;

function Status({ product }: { product: ProductListItem }) {
  return <StatusStamp tone={STATUS_TONES[product.status]}>{product.status}</StatusStamp>;
}

function ProductName({ product }: { product: ProductListItem }) {
  return (
    <span className={styles.names}>
      <span className={styles.name}>{product.name}</span>
      {product.supplierName && <span className={styles.supplier}>{product.supplierName}</span>}
    </span>
  );
}

const COLUMNS: TableColumn<ProductListItem>[] = [
  { key: 'code', header: 'Código', render: (p) => <span className={styles.mono}>{p.code}</span> },
  { key: 'name', header: 'Producto', render: (p) => <ProductName product={p} /> },
  { key: 'category', header: 'Categoría', render: categoryPath },
  {
    key: 'stock',
    header: 'Stock',
    align: 'end',
    render: (p) => <span className={styles.mono}>{stockText(p)}</span>,
  },
  { key: 'price', header: 'Precio', align: 'end', render: (p) => <UserMoney value={p.price} /> },
  { key: 'status', header: 'Estado', render: (p) => <Status product={p} /> },
];

/** Tarjeta móvil (ProductosMovil.dc.html): sin acciones en esta entrega (FR-005). */
function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <div className={styles.card}>
      <ProductName product={product} />
      <span className={styles.meta}>
        {product.code} · {categoryPath(product)}
      </span>
      <span className={styles.figures}>
        <span className={styles.mono}>{stockText(product)}</span>
        <UserMoney value={product.price} />
      </span>
      <Status product={product} />
    </div>
  );
}

/** Listado de Productos (FR-004): tabla en escritorio y tarjetas en móvil, sin columna de acciones. */
export function ProductsTable({ rows }: ProductsTableProps) {
  return (
    <Table
      caption="Productos"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(product) => product.id}
      renderCard={(product) => <ProductCard product={product} />}
    />
  );
}
