import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
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
  /** Criterios del listado (query sin «?») que la ficha conserva para volver (010 FR-014). */
  search: string;
  /** Proveedor cuya fila se enfoca al montar: el último abierto, al volver de su ficha. */
  focusId?: string;
}

type RowLink = { search: string; focusId?: string; focusRef: RefObject<HTMLAnchorElement | null> };

const detailUrl = (id: string, search: string) => `/proveedores/${id}${search ? `?${search}` : ''}`;

// En móvil se ven las tarjetas y no la tabla (las dos están en el DOM): se enfoca la que se ve.
const isNarrow = () => window.matchMedia?.('(max-width: 759px)').matches ?? false;

/** Enlace a la ficha que, si es el proveedor de `focusId`, recibe la referencia del foco. */
function linkRef(supplier: SupplierListItem, link: RowLink, card: boolean) {
  return supplier.id === link.focusId && card === isNarrow() ? link.focusRef : undefined;
}

// Un proveedor dado de baja no es una alerta: sello neutro, que se entiende por el texto (FR-004a).
// La población va debajo del nombre (tablero «Proveedores»).
// Cada fila es un enlace a su ficha: el del nombre se estira a toda la fila (010 FR-012).
function SupplierName({ supplier, link }: { supplier: SupplierListItem; link?: RowLink }) {
  return (
    <span className={styles.who}>
      <span className={styles.name}>
        {link ? (
          <Link
            to={detailUrl(supplier.id, link.search)}
            ref={linkRef(supplier, link, false)}
            className={styles.rowLink}
          >
            {supplier.name}
          </Link>
        ) : (
          supplier.name
        )}
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

function columns(quarter: Quarter, link: RowLink): TableColumn<SupplierListItem>[] {
  return [
    {
      key: 'name',
      header: 'Proveedor',
      render: (s) => <SupplierName supplier={s} link={link} />,
    },
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
function SupplierCard({ supplier, link }: { supplier: SupplierListItem; link: RowLink }) {
  return (
    <Link
      to={detailUrl(supplier.id, link.search)}
      ref={linkRef(supplier, link, true)}
      className={styles.card}
    >
      <SupplierName supplier={supplier} />
      <UserMoney value={supplier.yearPurchases} />
    </Link>
  );
}

/** Enfoca la fila de `focusId` en cuanto aparece en el listado (al volver de la ficha, FR-014). */
function useRowFocus(rows: readonly SupplierListItem[], focusId?: string) {
  const focusRef = useRef<HTMLAnchorElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !focusRef.current) return;
    done.current = true;
    focusRef.current.focus();
  }, [rows, focusId]);
  return focusRef;
}

/** Listado de Proveedores: tabla en escritorio y tarjetas en móvil; cada fila abre su ficha. */
export function SuppliersTable(props: SuppliersTableProps) {
  const { rows, quarter, status, busy, search, focusId } = props;
  const link: RowLink = { search, focusId, focusRef: useRowFocus(rows, focusId) };
  return (
    <Table
      caption="Proveedores"
      columns={columns(quarter, link)}
      rows={rows}
      getRowKey={(supplier) => supplier.id}
      renderCard={(supplier) => <SupplierCard supplier={supplier} link={link} />}
      status={status}
      busy={busy}
    />
  );
}
