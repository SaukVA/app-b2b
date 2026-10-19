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
  return (
    <div className={styles.root}>
      <DesktopTable {...props} />
      <div className={styles.mob}>
        {props.rows.map((row) => (
          <article key={props.getRowKey(row)} className={styles.card}>
            {props.renderCard(row)}
          </article>
        ))}
      </div>
    </div>
  );
}
