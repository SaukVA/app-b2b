import { SUPPLIER_MESSAGES, type SupplierDetail } from '@app/shared';
import {
  EMPTY_SUPPLIER_FORM,
  fromSupplierDetail,
  parseValidationMessage,
  toSupplierInput,
  validateSupplierForm,
  type SupplierFormValues,
} from './supplierForm';

const VALID: SupplierFormValues = {
  ...EMPTY_SUPPLIER_FORM,
  name: 'Aceites del Sur',
  cif: 'B12345674',
  address: 'Calle Mayor, 1',
  postalCode: '46001',
  city: 'Valencia',
};

const values = (overrides: Partial<SupplierFormValues>) => ({ ...VALID, ...overrides });
const row = (value: string, label = '') => ({ label, value });

describe('EMPTY_SUPPLIER_FORM', () => {
  it('empieza vacío, español, sin contactos y con la forma de pago por defecto', () => {
    expect(EMPTY_SUPPLIER_FORM).toMatchObject({
      name: '',
      foreign: false,
      phones: [],
      emails: [],
      paymentMethod: 'TRANSFER_30',
      minOrder: null,
    });
  });
});

describe('toSupplierInput (data-model.md)', () => {
  it('recorta, normaliza CIF e IBAN, convierte números y vacíos en null', () => {
    const input = toSupplierInput(
      values({
        name: '  Aceites del Sur ',
        cif: ' b-12.345.674 ',
        iban: 'es91 2100 0418 4502 0005 1332',
        leadTimeDays: ' 3 ',
        minOrder: 150.5,
        contactPerson: '  ',
        web: ' www.aceites.es ',
        notes: 'Solo mañanas\n',
      }),
    );
    expect(input).toEqual({
      name: 'Aceites del Sur',
      cif: 'B12345674',
      foreign: false,
      address: 'Calle Mayor, 1',
      postalCode: '46001',
      city: 'Valencia',
      contactPerson: null,
      phones: [],
      emails: [],
      paymentMethod: 'TRANSFER_30',
      iban: 'ES9121000418450200051332',
      web: 'www.aceites.es',
      leadTimeDays: 3,
      minOrder: 150.5,
      notes: 'Solo mañanas',
    });
  });
});

describe('toSupplierInput · contactos', () => {
  it('descarta las filas de contacto sin valor y deja la etiqueta vacía en null', () => {
    const input = toSupplierInput(
      values({
        phones: [row(' ', 'Fax'), row('961 234 567', ' Pedidos ')],
        emails: [row('pedidos@aceites.es')],
      }),
    );
    expect(input.phones).toEqual([{ label: 'Pedidos', value: '961 234 567' }]);
    expect(input.emails).toEqual([{ label: null, value: 'pedidos@aceites.es' }]);
  });
});

describe('fromSupplierDetail', () => {
  it('pasa la ficha a los valores del formulario', () => {
    const detail = {
      ...toSupplierInput(VALID),
      contactPerson: null,
      phones: [{ label: null, value: '961 234 567' }],
      iban: 'ES9121000418450200051332',
      leadTimeDays: 0,
      minOrder: 80,
      notes: null,
    } as unknown as SupplierDetail;
    expect(fromSupplierDetail(detail)).toEqual({
      ...VALID,
      phones: [row('961 234 567')],
      iban: 'ES91 2100 0418 4502 0005 1332',
      leadTimeDays: '0',
      minOrder: 80,
    });
  });
});

describe('validateSupplierForm · obligatorios, CIF y código postal (contracts/suppliers-ui.md)', () => {
  it('sin errores con los obligatorios', () => {
    expect(validateSupplierForm(VALID)).toEqual({});
  });

  it('pide cada obligatorio con su texto', () => {
    expect(validateSupplierForm(EMPTY_SUPPLIER_FORM)).toEqual({
      name: 'Escribe el nombre del proveedor.',
      cif: 'Escribe el CIF.',
      address: 'Escribe la dirección.',
      postalCode: 'Escribe el código postal.',
      city: 'Escribe la población.',
    });
  });

  it('rechaza un CIF español no válido salvo si es extranjero', () => {
    expect(validateSupplierForm(values({ cif: 'B12345678' })).cif).toBe(
      'No es un NIF o CIF español válido. Si el proveedor es extranjero, marca «Proveedor extranjero».',
    );
    expect(validateSupplierForm(values({ cif: 'IT0123456', foreign: true })).cif).toBeUndefined();
  });

  it('el código postal español tiene 5 cifras; el extranjero, no', () => {
    expect(validateSupplierForm(values({ postalCode: '4600' })).postalCode).toBe(
      'El código postal español tiene 5 cifras.',
    );
    expect(
      validateSupplierForm(values({ foreign: true, cif: 'IT0123', postalCode: 'SW1A 1AA' })),
    ).toEqual({});
  });
});

describe('validateSupplierForm · pago, pedidos y contactos', () => {
  it.each<[string, Partial<SupplierFormValues>, string]>([
    ['iban', { iban: 'ES00 1234 5678' }, SUPPLIER_MESSAGES.ibanInvalid],
    ['web', { web: 'proveedor' }, 'Escribe una dirección web, por ejemplo www.proveedor.es.'],
    ['leadTimeDays', { leadTimeDays: '366' }, 'Escribe un número de días entre 0 y 365.'],
    ['leadTimeDays', { leadTimeDays: '2,5' }, 'Escribe un número de días entre 0 y 365.'],
    ['minOrder', { minOrder: 0 }, 'Escribe un importe mayor que 0, con 2 decimales como mucho.'],
    ['minOrder', { minOrder: 1.005 }, SUPPLIER_MESSAGES.minOrderInvalid],
    [
      'phones.1.value',
      { phones: [row('961234567'), row('123')] },
      'Escribe un teléfono de 6 a 20 cifras.',
    ],
    [
      'emails.0.value',
      { emails: [row('pedidos.aceites.es')] },
      'Escribe un correo válido, por ejemplo nombre@proveedor.es.',
    ],
  ])('%s no válido muestra su texto', (field, overrides, message) => {
    expect(validateSupplierForm(values(overrides))[field]).toBe(message);
  });

  it('acepta los opcionales vacíos y las filas de contacto sin valor', () => {
    expect(validateSupplierForm(values({ phones: [row('', 'Fax')], leadTimeDays: '' }))).toEqual(
      {},
    );
  });
});

describe('parseValidationMessage (FR-006, research R4)', () => {
  it('reparte los errores del servidor entre los campos del formulario', () => {
    const result = parseValidationMessage(
      'postalCode: El código postal español tiene 5 cifras.; phones.1.value: Escribe un teléfono de 6 a 20 cifras.',
      values({ phones: [row('961234567'), row('123')] }),
    );
    expect(result).toEqual({
      fields: {
        postalCode: 'El código postal español tiene 5 cifras.',
        'phones.1.value': 'Escribe un teléfono de 6 a 20 cifras.',
      },
      other: [],
    });
  });

  it('lleva el índice del servidor a la fila del formulario, contando las vacías', () => {
    const result = parseValidationMessage(
      'phones.0.value: Escribe un teléfono de 6 a 20 cifras.',
      values({ phones: [row(''), row('123')] }),
    );
    expect(result.fields).toEqual({ 'phones.1.value': 'Escribe un teléfono de 6 a 20 cifras.' });
  });

  it('lo que no es un campo del formulario va al resumen', () => {
    expect(parseValidationMessage('payload: Expected object, received string', VALID)).toEqual({
      fields: {},
      other: ['Expected object, received string'],
    });
  });
});
