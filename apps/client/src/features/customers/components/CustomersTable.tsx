import type { ReactNode } from 'react';
import { customerRiskLevel, type CustomerListItem, type CustomerRiskLevel } from '@app/shared';
import { ProgressBar, type ProgressTone } from '../../../components/ProgressBar';
import { Table, type TableColumn } from '../../../components/Table';
import { UserMoney } from '../../preferences/components/UserMoney';
import { formatOrderDate } from '../formatOrderDate';
import styles from './CustomersTable.module.css';

export interface CustomersTableProps {
  rows: readonly CustomerListItem[];
  /** Cargando, aviso de cartera pendiente o error, dentro del panel del listado. */
  status?: ReactNode;
  busy?: boolean;
}

const RISK_TONES: Record<CustomerRiskLevel, ProgressTone> = {
  low: 'ok',
  medium: 'warning',
  high: 'danger',
};

function CustomerName({ customer }: { customer: CustomerListItem }) {
  return (
    <span className={styles.names}>
      <span className={styles.name}>{customer.name}</span>
      {customer.city && <span className={styles.city}>{customer.city}</span>}
    </span>
  );
}

// El riesgo usado es un porcentaje, nunca un importe (FR-016): cifra Mono y barra del semáforo.
function RiskUsed({ customer }: { customer: CustomerListItem }) {
  const { riskUsed } = customer;
  if (riskUsed === null) return <span className={styles.unlimited}>Sin límite</span>;
  return (
    <span className={styles.risk}>
      <span className={styles.mono}>{riskUsed} %</span>
      <ProgressBar
        value={riskUsed}
        tone={RISK_TONES[customerRiskLevel(riskUsed)]}
        label="Riesgo usado"
      />
    </span>
  );
}

const lastOrder = (customer: CustomerListItem) => (
  <span className={styles.mono}>{formatOrderDate(customer.lastOrderDate)}</span>
);

const COLUMNS: TableColumn<CustomerListItem>[] = [
  { key: 'name', header: 'Cliente', render: (c) => <CustomerName customer={c} /> },
  { key: 'risk', header: 'Riesgo usado', render: (c) => <RiskUsed customer={c} /> },
  { key: 'balance', header: 'Saldo', align: 'end', render: (c) => <UserMoney value={c.balance} /> },
  { key: 'lastOrder', header: 'Último pedido', render: lastOrder },
];

/** Tarjeta móvil (ClientesMovil.dc.html): sin acciones ni ficha lateral en esta entrega (FR-005). */
function CustomerCard({ customer }: { customer: CustomerListItem }) {
  return (
    <div className={styles.card}>
      <CustomerName customer={customer} />
      <RiskUsed customer={customer} />
      <span className={styles.figures}>
        <UserMoney value={customer.balance} />
        {lastOrder(customer)}
      </span>
    </div>
  );
}

/** Listado de Clientes (FR-004): tabla en escritorio y tarjetas en móvil, sin columna de acciones. */
export function CustomersTable({ rows, status, busy }: CustomersTableProps) {
  return (
    <Table
      caption="Clientes"
      columns={COLUMNS}
      rows={rows}
      getRowKey={(customer) => customer.id}
      renderCard={(customer) => <CustomerCard customer={customer} />}
      status={status}
      busy={busy}
    />
  );
}
