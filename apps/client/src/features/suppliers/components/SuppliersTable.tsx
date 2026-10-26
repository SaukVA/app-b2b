import type { ReactNode } from 'react';
import type { Quarter, SupplierListItem } from '@app/shared';
import { StatusStamp } from '../../../components/StatusStamp';
import { Table, type TableColumn } from '../../../components/Table';
import { UserMoney } from '../../preferences/components/UserMoney';
import { formatLeadTime } from '../formatLeadTime';
import styles from './SuppliersTable.module.css';

export interface SuppliersTableProps {
  rows: readonly SupplierListItem[];
  /** Trimestre de la columna «Gasto <T>» (010 FR-021a). */
  quarter: Quarter;
  /** Cargando, aviso de proveedores pendientes o error, dentro del panel del listado. */
  status?: ReactNode;
  busy?: boolean;
}

// Un proveedor dado de baja no es una alerta: sello neutro, que se entiende por el texto (FR-004a).
// La población va debajo del nombre (tablero «Proveedores»).
function SupplierName({ supplier }: { supplier: SupplierListItem }) {
  return (
    <span className={styles.who}>
      <span className={styles.name}>
        {supplier.name}
        {!supplier.active && <StatusStamp tone="neutral">Baja</StatusStamp>}
      </span>
      <span className={styles.city}>{supplier.city}</span>
    </span>
  );
}

// El plazo son días, nunca un importe (FR-016).
const leadTime = (supplier: SupplierListItem) => (
  <span className={styles.mono}>{formatLeadTime(supplier.leadTimeDays)}</span>
);

function columns(quarter: Quarter): TableColumn<SupplierListItem>[] {
  return [
    { key: 'name', header: 'Proveedor', render: (s) => <SupplierName supplier={s} /> },
    { key: 'cif', header: 'CIF', render: (s) => <span className={styles.mono}>{s.cif}</span> },
    { key: 'leadTime', header: 'Plazo', align: 'end', render: leadTime },
    {
      key: 'quarterPurchases',
      header: `Gasto ${quarter}T`,
      align: 'end',
      render: (s) => <UserMoney value={s.quarterPurchases} />,
    },
    {
      key: 'yearPurchases',
      header: 'Compras año',
      align: 'end',
      render: (s) => <UserMoney value={s.yearPurchases} />,
    },
  ];
}

/** Tarjeta móvil (ProveedoresMovil.dc.html): solo el proveedor y las compras del año (010 FR-021b). */
function SupplierCard({ supplier }: { supplier: SupplierListItem }) {
  return (
    <div className={styles.card}>
      <SupplierName supplier={supplier} />
      <UserMoney value={supplier.yearPurchases} />
    </div>
  );
}

/** Listado de Proveedores: tabla en escritorio y tarjetas en móvil, sin columna de acciones. */
export function SuppliersTable({ rows, quarter, status, busy }: SuppliersTableProps) {
  return (
    <Table
      caption="Proveedores"
      columns={columns(quarter)}
      rows={rows}
      getRowKey={(supplier) => supplier.id}
      renderCard={(supplier) => <SupplierCard supplier={supplier} />}
      status={status}
      busy={busy}
    />
  );
}
