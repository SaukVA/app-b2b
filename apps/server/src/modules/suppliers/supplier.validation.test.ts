import { SUPPLIER_LIMITS, SUPPLIER_MESSAGES } from '@app/shared';
import { supplierInputSchema } from './supplier.validation';

/** Alta mínima válida: solo los obligatorios (FR-004). */
const MINIMAL = {
  name: 'Aceites del Sur',
  cif: 'B12345674',
  address: 'Calle Mayor, 1',
  postalCode: '46001',
  city: 'Valencia',
};

const parse = (overrides: Record<string, unknown> = {}) =>
  supplierInputSchema.safeParse({ ...MINIMAL, ...overrides });

/** Mensajes de error por ruta («phones.1.value»), como los envía el middleware validate. */
function errorsOf(overrides: Record<string, unknown>): Record<string, string> {
  const result = parse(overrides);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
}

describe('supplierInputSchema · obligatorios y valores por defecto (FR-004)', () => {
  it('acepta solo los obligatorios y completa el resto con sus valores por defecto', () => {
    const result = parse();
    expect(result.success && result.data).toEqual({
      ...MINIMAL,
      foreign: false,
      contactPerson: null,
      phones: [],
      emails: [],
      paymentMethod: 'TRANSFER_30',
      iban: null,
      web: null,
      leadTimeDays: null,
      minOrder: null,
      notes: null,
    });
  });

  it.each([
    ['name', SUPPLIER_MESSAGES.nameRequired],
    ['cif', SUPPLIER_MESSAGES.cifRequired],
    ['address', SUPPLIER_MESSAGES.addressRequired],
    ['postalCode', SUPPLIER_MESSAGES.postalCodeRequired],
    ['city', SUPPLIER_MESSAGES.cityRequired],
  ])('%s vacío (o solo espacios) se rechaza', (field, message) => {
    expect(errorsOf({ [field]: '   ' })[field]).toBe(message);
  });
});

describe('supplierInputSchema · textos y forma de pago (FR-004)', () => {
  it('recorta los textos y convierte los opcionales vacíos en null', () => {
    const result = parse({ name: '  Aceites  ', contactPerson: '  ', notes: '', web: ' ' });
    expect(result.success && result.data).toMatchObject({
      name: 'Aceites',
      contactPerson: null,
      notes: null,
      web: null,
    });
  });

  it.each([
    ['name', SUPPLIER_LIMITS.name],
    ['address', SUPPLIER_LIMITS.address],
    ['city', SUPPLIER_LIMITS.city],
    ['contactPerson', SUPPLIER_LIMITS.contactPerson],
    ['notes', SUPPLIER_LIMITS.notes],
  ])('%s admite %i caracteres y no uno más', (field, max) => {
    expect(parse({ [field]: 'a'.repeat(max) }).success).toBe(true);
    expect(parse({ [field]: 'a'.repeat(max + 1) }).success).toBe(false);
  });

  it('conserva los saltos de línea de las observaciones', () => {
    const result = parse({ notes: 'Línea 1\nLínea 2' });
    expect(result.success && result.data.notes).toBe('Línea 1\nLínea 2');
  });

  it('rechaza una forma de pago desconocida', () => {
    expect(parse({ paymentMethod: 'BITCOIN' }).success).toBe(false);
    expect(parse({ paymentMethod: 'CASH' }).success).toBe(true);
  });
});

describe('supplierInputSchema · CIF y código postal (FR-004, FR-005)', () => {
  it('normaliza el CIF', () => {
    const result = parse({ cif: 'b-12.345.674' });
    expect(result.success && result.data.cif).toBe('B12345674');
  });

  it('rechaza un NIF o CIF español no válido', () => {
    expect(errorsOf({ cif: 'B12345678' }).cif).toBe(SUPPLIER_MESSAGES.cifInvalid);
  });

  it('con «Proveedor extranjero» acepta un identificador de 3 a 20 letras y números', () => {
    expect(parse({ foreign: true, cif: 'IT01234567890' }).success).toBe(true);
    expect(parse({ foreign: true, cif: 'AB' }).success).toBe(false);
    expect(parse({ foreign: true, cif: 'A'.repeat(21) }).success).toBe(false);
  });

  it('el código postal español tiene 5 cifras', () => {
    expect(errorsOf({ postalCode: '4600' }).postalCode).toBe(SUPPLIER_MESSAGES.postalCodeSpanish);
    expect(errorsOf({ postalCode: '4600A' }).postalCode).toBe(SUPPLIER_MESSAGES.postalCodeSpanish);
  });

  it('el extranjero admite de 3 a 10 letras, números, espacios o guiones', () => {
    const foreign = { foreign: true, cif: 'IT01234567890' };
    expect(parse({ ...foreign, postalCode: 'SW1A 1AA' }).success).toBe(true);
    expect(parse({ ...foreign, postalCode: '00-950' }).success).toBe(true);
    expect(parse({ ...foreign, postalCode: 'AB' }).success).toBe(false);
    expect(parse({ ...foreign, postalCode: 'A'.repeat(11) }).success).toBe(false);
  });
});

describe('supplierInputSchema · pago y pedidos (FR-004)', () => {
  it('normaliza un IBAN válido y rechaza uno no válido', () => {
    const result = parse({ iban: 'es91 2100 0418 4502 0005 1332' });
    expect(result.success && result.data.iban).toBe('ES9121000418450200051332');
    expect(errorsOf({ iban: 'ES91 2100 0418 4502 0005 1333' }).iban).toBe(
      SUPPLIER_MESSAGES.ibanInvalid,
    );
  });

  it('añade https:// a una web sin protocolo y rechaza una que no es una dirección', () => {
    const result = parse({ web: 'www.aceites.es' });
    expect(result.success && result.data.web).toBe('https://www.aceites.es');
    const http = parse({ web: 'http://aceites.es/pedidos' });
    expect(http.success && http.data.web).toBe('http://aceites.es/pedidos');
    expect(errorsOf({ web: 'aceites' }).web).toBe(SUPPLIER_MESSAGES.webInvalid);
  });

  it('el plazo de entrega es un entero de 0 a 365', () => {
    expect(parse({ leadTimeDays: 0 }).success).toBe(true);
    expect(parse({ leadTimeDays: 365 }).success).toBe(true);
    expect(errorsOf({ leadTimeDays: 366 }).leadTimeDays).toBe(SUPPLIER_MESSAGES.leadTimeInvalid);
    expect(errorsOf({ leadTimeDays: 2.5 }).leadTimeDays).toBe(SUPPLIER_MESSAGES.leadTimeInvalid);
    expect(errorsOf({ leadTimeDays: -1 }).leadTimeDays).toBe(SUPPLIER_MESSAGES.leadTimeInvalid);
  });

  it('el pedido mínimo es mayor que 0, con 2 decimales como mucho, o null', () => {
    expect(parse({ minOrder: 150.25 }).success).toBe(true);
    expect(parse({ minOrder: null }).success).toBe(true);
    expect(errorsOf({ minOrder: 0 }).minOrder).toBe(SUPPLIER_MESSAGES.minOrderInvalid);
    expect(errorsOf({ minOrder: 10.255 }).minOrder).toBe(SUPPLIER_MESSAGES.minOrderInvalid);
  });
});

describe('supplierInputSchema · teléfonos y correos (FR-004)', () => {
  const phone = (value: string, label: string | null = null) => ({ label, value });

  it('descarta las filas sin valor antes de contar el máximo de 5', () => {
    const phones = [...Array.from({ length: 5 }, (_, i) => phone(`96123456${i}`)), phone('  ')];
    const result = parse({ phones });
    expect(result.success && result.data.phones).toHaveLength(5);
  });

  it('rechaza más de 5 teléfonos con valor', () => {
    const phones = Array.from({ length: 6 }, (_, i) => phone(`96123456${i}`));
    expect(parse({ phones }).success).toBe(false);
  });

  it('el teléfono tiene de 6 a 20 dígitos, espacios, +, - o paréntesis', () => {
    expect(parse({ phones: [phone('+34 (961) 23-45-67')] }).success).toBe(true);
    expect(errorsOf({ phones: [phone('96123')] })['phones.0.value']).toBe(
      SUPPLIER_MESSAGES.phoneInvalid,
    );
    expect(errorsOf({ phones: [phone('961-ABC-456')] })['phones.0.value']).toBe(
      SUPPLIER_MESSAGES.phoneInvalid,
    );
  });

  it('el correo tiene que ser válido', () => {
    expect(parse({ emails: [phone('pedidos@aceites.es', 'Pedidos')] }).success).toBe(true);
    expect(errorsOf({ emails: [phone('pedidos.aceites.es')] })['emails.0.value']).toBe(
      SUPPLIER_MESSAGES.emailInvalid,
    );
  });

  it('la etiqueta se recorta, vacía es null y admite hasta 40 caracteres', () => {
    const result = parse({ phones: [phone('961234567', '  ')] });
    expect(result.success && result.data.phones[0].label).toBeNull();
    const max = SUPPLIER_LIMITS.contactLabel;
    expect(parse({ phones: [phone('961234567', 'a'.repeat(max))] }).success).toBe(true);
    expect(parse({ phones: [phone('961234567', 'a'.repeat(max + 1))] }).success).toBe(false);
  });
});
