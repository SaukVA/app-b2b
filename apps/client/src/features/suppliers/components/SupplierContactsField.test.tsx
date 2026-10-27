import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ContactRow } from '../supplierForm';
import { SupplierContactsField, type SupplierContactsFieldProps } from './SupplierContactsField';

/** Envoltorio con estado: el componente es controlado. */
function Harness(props: Partial<SupplierContactsFieldProps> & { initial?: ContactRow[] }) {
  const [rows, setRows] = useState<ContactRow[]>(props.initial ?? []);
  return (
    <SupplierContactsField kind="phone" rows={rows} onChange={setRows} errors={props.errors} />
  );
}

const group = () => screen.getByRole('group', { name: 'Teléfonos' });
const addButton = () => screen.getByRole('button', { name: 'Añadir teléfono' });

describe('SupplierContactsField · teléfonos (FR-004)', () => {
  it('sin filas muestra el grupo, el botón de añadir y el contador «0 de 5»', () => {
    render(<Harness />);
    expect(group()).toBeTruthy();
    expect(within(group()).getByText('0 de 5')).toBeTruthy();
    expect(within(group()).queryAllByLabelText('Número')).toHaveLength(0);
  });

  it('añadir crea una fila con etiqueta y número, y enfoca la etiqueta', async () => {
    render(<Harness />);
    await userEvent.click(addButton());
    expect(within(group()).getAllByLabelText('Número')).toHaveLength(1);
    expect(document.activeElement).toBe(within(group()).getByLabelText('Etiqueta'));
    expect(within(group()).getByText('1 de 5')).toBeTruthy();
  });

  it('escribe la etiqueta y el número de cada fila', async () => {
    render(<Harness initial={[{ label: '', value: '' }]} />);
    await userEvent.type(screen.getByLabelText('Etiqueta'), 'Pedidos');
    await userEvent.type(screen.getByLabelText('Número'), '961 234 567');
    expect((screen.getByLabelText('Etiqueta') as HTMLInputElement).value).toBe('Pedidos');
    expect((screen.getByLabelText('Número') as HTMLInputElement).value).toBe('961 234 567');
  });
});

describe('SupplierContactsField · quitar filas, máximo y errores', () => {
  it('quita la fila indicada con «Quitar teléfono N»', async () => {
    render(
      <Harness
        initial={[
          { label: 'Pedidos', value: '961 111 111' },
          { label: 'Oficina', value: '961 222 222' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Quitar teléfono 1' }));
    const numbers = screen.getAllByLabelText('Número') as HTMLInputElement[];
    expect(numbers.map((input) => input.value)).toEqual(['961 222 222']);
  });

  it('con 5 filas deshabilita «Añadir teléfono»', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ label: '', value: `96100000${i}` }));
    render(<Harness initial={rows} />);
    expect((addButton() as HTMLButtonElement).disabled).toBe(true);
    expect(within(group()).getByText('5 de 5')).toBeTruthy();
  });

  it('muestra el error de cada fila junto a su número', () => {
    render(
      <Harness
        initial={[
          { label: '', value: '961 111 111' },
          { label: '', value: '123' },
        ]}
        errors={{ 1: 'Escribe un teléfono de 6 a 20 cifras.' }}
      />,
    );
    const [first, second] = screen.getAllByLabelText('Número');
    expect(first.getAttribute('aria-invalid')).not.toBe('true');
    expect(second.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Escribe un teléfono de 6 a 20 cifras.')).toBeTruthy();
  });
});

describe('SupplierContactsField · correos', () => {
  it('usa los textos de correo', async () => {
    render(<SupplierContactsField kind="email" rows={[]} onChange={() => {}} />);
    const emails = screen.getByRole('group', { name: 'Correos' });
    expect(within(emails).getByRole('button', { name: 'Añadir correo' })).toBeTruthy();
  });

  it('el campo del valor es de tipo correo y se llama «Correo»', () => {
    render(
      <SupplierContactsField kind="email" rows={[{ label: '', value: '' }]} onChange={() => {}} />,
    );
    expect(screen.getByLabelText('Correo').getAttribute('type')).toBe('email');
    expect(screen.getByRole('button', { name: 'Quitar correo 1' })).toBeTruthy();
  });
});
