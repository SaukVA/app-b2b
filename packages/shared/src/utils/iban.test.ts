import { formatIban, isValidIban, normalizeIban } from './iban';

// ES91 2100 0418 4502 0005 1332 es el IBAN de ejemplo publicado por el Banco de España (módulo 97 = 1).
const VALID_ES = 'ES91 2100 0418 4502 0005 1332';

describe('normalizeIban', () => {
  it('pasa a mayúsculas y quita los espacios', () => {
    expect(normalizeIban(' es91 2100 0418 4502 0005 1332 ')).toBe('ES9121000418450200051332');
  });
});

describe('isValidIban', () => {
  it('acepta un IBAN español válido, con o sin espacios', () => {
    expect(isValidIban(VALID_ES)).toBe(true);
    expect(isValidIban('es9121000418450200051332')).toBe(true);
  });

  it('rechaza el mismo IBAN con un dígito cambiado', () => {
    expect(isValidIban('ES91 2100 0418 4502 0005 1333')).toBe(false);
  });

  it('rechaza un IBAN español con una longitud distinta de 24', () => {
    expect(isValidIban('ES91 2100 0418 4502 0005 133')).toBe(false);
  });

  it('acepta un IBAN de otro país conocido (Alemania, 22 caracteres)', () => {
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
  });

  it('acepta un país no listado con 15–34 caracteres y módulo 97 correcto', () => {
    expect(isValidIban('ZZ59 1234 5678 9012 3456')).toBe(true);
  });

  it('rechaza un país no listado con módulo 97 incorrecto', () => {
    expect(isValidIban('ZZ58 1234 5678 9012 3456')).toBe(false);
  });

  it.each(['', 'ES', '1234', 'ES91-2100-0418-4502-0005-1332'])('rechaza «%s»', (value) => {
    expect(isValidIban(value)).toBe(false);
  });
});

describe('formatIban', () => {
  it('agrupa de 4 en 4', () => {
    expect(formatIban('ES9121000418450200051332')).toBe(VALID_ES);
  });

  it('normaliza antes de agrupar', () => {
    expect(formatIban('es91 21000418 450200051332')).toBe(VALID_ES);
  });
});
