import type { ReactNode } from 'react';
import type { SupplierListItem } from '@app/shared';
import { StatusStamp } from '../../../components/StatusStamp';
import { Table, type TableColumn } from '../../../components/Table';
import { UserMoney } from '../../preferences/components/UserMoney';
import { formatLeadTime } from '../formatLeadTime';
import styles from './SuppliersTable.module.css';

export interface SuppliersTableProps {
  rows: readonly SupplierListItem[];
  /** Cargando, aviso de proveedores pendientes o error, dentro del panel del listado. */
  status?: ReactNode;
  busy?: boolean;
}

// Un proveedor dado de baja no es una alerta: sello neutro, que se entiende por el texto (FR-004a).
function SupplierName({ supplier }: { supplier: SupplierListItem }) {
  return (
    <span className={styles.name}>
      {supplier.name}
      {!supplier.active && <StatusStamp tone="neutral">Baja</StatusStamp>}
    </span>
  );
}

// El plazo son días, nunca un importe (FR-016).
const leadTime = (supplier: SupplierListItem) => (
  <span className={styles.mono}>{formatLeadTime(supplier.leadTimeDays)}</span>
);

const COLUMNS: TableColumn<SupplierListItem>[] = [
  { key: 'name', header: 'Proveedor', render: (s) => <SupplierName supplier={s} /> },
  { key: 'leadTime', header: 'Plazo', align: 'end', render: leadTime },
  {
    key: 'yearPurchases',
    header: 'Compras año',
    align: 'end',
    render: (s) => <UserMoney value={s.yearPurchases} />,
  },
];

/** Tarjeta móvil (ProveedoresMovil.dc.html): sin plazo ni acciones en esta entrega (FR-005, FR-015). */
function SupplierCard({ supplier }: { supplier: SupplierListItem }) {
  return (
    <div className={styles.card}>
      <SupplierName supplier={supplier} />
      <UserMoney value={supplier.yearPurchases} />
    </div>
  );
}

/** Listado de Proveedores (FR-004): tabla en escritorio y tarjetas en móvil, sin columna de acciones. */
export function SuppliersTable({ rows, status, busy }: SuppliersTableProps) {
  return (
    <Table
      caption="Proveedores"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(supplier) => supplier.id}
      renderCard={(supplier) => <SupplierCard supplier={supplier} />}
      status={status}
      busy={busy}
    />
  );
}
