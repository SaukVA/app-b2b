import { render, screen, within } from '@testing-library/react';
import { Table, type TableColumn } from './Table';

interface Row {
  id: string;
  name: string;
  email: string;
}

const ROWS: Row[] = [
  { id: '1', name: 'Ana García', email: 'ana@empresa.es' },
  { id: '2', name: 'Luis Pérez', email: 'luis@empresa.es' },
];

const COLUMNS: TableColumn<Row>[] = [
  { key: 'name', header: 'Nombre', render: (row) => row.name },
  { key: 'email', header: 'Email', render: (row) => row.email },
];

function renderTable() {
  render(
    <Table
      caption="Usuarios"
      columns={COLUMNS}
      rows={ROWS}
      getRowKey={(row) => row.id}
      renderCard={(row) => <p>Tarjeta de {row.name}</p>}
    />,
  );
}

describe('Table', () => {
  it('pinta una tabla accesible con cabeceras y una fila por elemento', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Usuarios' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual(['Nombre', 'Email']);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByText('luis@empresa.es')).toBeTruthy();
  });

  it('incluye la variante de tarjetas para móvil, un article por fila', () => {
    renderTable();
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Tarjeta de Ana García')).toBeTruthy();
  });
});
