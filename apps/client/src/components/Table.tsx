import type { Key, ReactNode } from 'react';
import styles from './Table.module.css';

export interface TableColumn<Row> {
  key: string;
  header: ReactNode;
  /** Cifras a la derecha (docs/design/README.md, «Las cifras mandan»). */
  align?: 'start' | 'end';
  render: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  /** Nombre accesible de la tabla (se muestra solo a lectores de pantalla). */
  caption: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
  /** Variante móvil: una tarjeta (`article`) por fila por debajo de 760 px. */
  renderCard: (row: Row) => ReactNode;
  /**
   * Zona de estado bajo las filas (cargando, sin datos, error), dentro del panel de la tabla y bajo las
   * tarjetas en móvil. Se pinta una sola vez para que los lectores de pantalla no la anuncien dos veces.
   */
  status?: ReactNode;
  /** Marca el listado con aria-busy mientras se cargan las filas. */
  busy?: boolean;
}

function alignClass(align: TableColumn<unknown>['align']): string | undefined {
  return align === 'end' ? styles.end : undefined;
}

function DesktopTable<Row>({ caption, columns, rows, getRowKey }: TableProps<Row>) {
  return (
    <div className={styles.desk}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={alignClass(column.align)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={alignClass(column.align)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tabla «Albarán» con su variante de tarjetas para móvil; las dos están en el DOM y el CSS elige. */
export function Table<Row>(props: TableProps<Row>) {
  const withStatus = props.status != null && props.status !== false;
  return (
    <div
      className={[styles.root, withStatus && styles.withStatus].filter(Boolean).join(' ')}
      aria-busy={props.busy || undefined}
    >
      <DesktopTable {...props} />
      <div className={styles.mob}>
        {props.rows.map((row) => (
          <article key={props.getRowKey(row)} className={styles.card}>
            {props.renderCard(row)}
          </article>
        ))}
      </div>
      {withStatus && <div className={styles.status}>{props.status}</div>}
    </div>
  );
}
