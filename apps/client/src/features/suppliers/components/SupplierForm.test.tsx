import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { setupStore } from '../../../store/store';
import { EMPTY_SUPPLIER_FORM, type SupplierFormValues } from '../supplierForm';
import { SupplierForm, type SupplierFormProps } from './SupplierForm';

const onSubmit = jest.fn();
const onCancel = jest.fn();

beforeEach(() => {
  onSubmit.mockReset();
  onCancel.mockReset();
});

function Harness(props: Partial<SupplierFormProps> & { initial?: SupplierFormValues }) {
  const [values, setValues] = useState(props.initial ?? EMPTY_SUPPLIER_FORM);
  return (
    <SupplierForm
      values={values}
      onChange={setValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Crear proveedor"
      serverErrors={props.serverErrors}
      otherErrors={props.otherErrors}
      saving={props.saving}
    />
  );
}

function renderForm(props: Partial<SupplierFormProps> & { initial?: SupplierFormValues } = {}) {
  render(
    <Provider store={setupStore()}>
      <Harness {...props} />
    </Provider>,
  );
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

async function fillRequired() {
  await userEvent.type(field('Nombre *'), 'Aceites del Sur');
  await userEvent.type(field('CIF *'), 'B12345674');
  await userEvent.type(field('Dirección *'), 'Calle Mayor, 1');
  await userEvent.type(field('Código postal *'), '46001');
  await userEvent.type(field('Población *'), 'Valencia');
}

describe('SupplierForm · estructura (contracts/suppliers-ui.md)', () => {
  beforeEach(() => renderForm());

  it('agrupa los campos en sus secciones', () => {
    for (const name of ['Identificación', 'Dirección fiscal', 'Pago', 'Pedidos', 'Contacto']) {
      expect(screen.getByRole('group', { name })).toBeTruthy();
    }
    expect(screen.getByText('Hace falta para las facturas.')).toBeTruthy();
  });

  it('tiene la casilla «Proveedor extranjero» con su ayuda', () => {
    expect(screen.getByRole('checkbox', { name: 'Proveedor extranjero' })).toBeTruthy();
    expect(
      screen.getByText('Acepta un identificador fiscal y un código postal de otro país.'),
    ).toBeTruthy();
  });

  it('ofrece las formas de pago y la de por defecto es «Transferencia 30 días»', () => {
    const select = screen.getByRole('combobox', { name: 'Forma de pago' }) as HTMLSelectElement;
    expect(select.selectedOptions[0].textContent).toBe('Transferencia 30 días');
    expect(within(select).getAllByRole('option')).toHaveLength(5);
  });

  it('pide el plazo en días y el pedido mínimo como importe, con su ayuda', () => {
    expect(field('Plazo de entrega (días)')).toBeTruthy();
    expect(screen.getByText('Déjalo vacío si varía de un pedido a otro.')).toBeTruthy();
    expect(field('Pedido mínimo (€)').getAttribute('inputmode')).toBe('decimal');
    expect(screen.getByText('Déjalo vacío si no tiene.')).toBeTruthy();
  });

  it('tiene teléfonos, correos, persona de contacto y observaciones en un área de texto', () => {
    expect(screen.getByRole('group', { name: 'Teléfonos' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Correos' })).toBeTruthy();
    expect(field('Persona de contacto')).toBeTruthy();
    expect(field('Observaciones').tagName).toBe('TEXTAREA');
  });

  it('«Cancelar» avisa a la página', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('SupplierForm · validación (FR-006)', () => {
  it('con los obligatorios rellenos envía los valores', async () => {
    renderForm();
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Aceites del Sur', postalCode: '46001' }),
    );
  });

  it('sin los obligatorios no envía, marca los campos, resume y enfoca el primero', async () => {
    renderForm();
    await userEvent.type(field('CIF *'), 'B12345674');
    await userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field('Nombre *').getAttribute('aria-invalid')).toBe('true');
    expect(field('CIF *').getAttribute('aria-invalid')).not.toBe('true');
    expect(screen.getByText('Escribe el nombre del proveedor.')).toBeTruthy();
    expect(
      screen.getByText('Revisa estos campos: Nombre, Dirección, Código postal, Población.'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(field('Nombre *'));
  });

  it('muestra junto al CIF el error que devuelve el servidor', () => {
    renderForm({ serverErrors: { cif: 'Ya existe un proveedor con este CIF: Levante.' } });
    expect(field('CIF *').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Ya existe un proveedor con este CIF: Levante.')).toBeTruthy();
    expect(screen.getByText('Revisa estos campos: CIF.')).toBeTruthy();
  });

  it('lleva al resumen los errores del servidor que no son de un campo', () => {
    renderForm({ otherErrors: ['Expected object, received string'] });
    expect(screen.getByText(/Expected object, received string/)).toBeTruthy();
  });

  it('mientras guarda deshabilita el botón de enviar', () => {
    renderForm({ saving: true });
    expect(
      (screen.getByRole('button', { name: 'Crear proveedor' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
