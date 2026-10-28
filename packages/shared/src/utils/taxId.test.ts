import { isValidSpanishTaxId, normalizeTaxId } from './taxId';

// Valores calculados a mano con el algoritmo oficial (research R3):
// - NIF 12345678 → 12345678 % 23 = 14 → «Z».
// - NIE X1234567 → 01234567 % 23 = 19 → «L».
// - CIF 1234567 → impares dobladas 2+6+(1+0)+(1+4) = 14, pares 2+4+6 = 12, total 26 → control 4 → «4» o «D».

describe('normalizeTaxId', () => {
  it('pasa a mayúsculas y quita espacios, puntos y guiones', () => {
    expect(normalizeTaxId('b-12.345.678')).toBe('B12345678');
    expect(normalizeTaxId(' x 1234567-l ')).toBe('X1234567L');
  });

  it('devuelve vacío si solo hay separadores', () => {
    expect(normalizeTaxId(' .- ')).toBe('');
  });
});

describe('isValidSpanishTaxId · NIF y NIE', () => {
  it('acepta un NIF con su letra de control', () => {
    expect(isValidSpanishTaxId('12345678Z')).toBe(true);
  });

  it('rechaza un NIF con la letra cambiada', () => {
    expect(isValidSpanishTaxId('12345678A')).toBe(false);
  });

  it('acepta un NIE con su letra de control', () => {
    expect(isValidSpanishTaxId('X1234567L')).toBe(true);
  });

  it('rechaza un NIE con la letra cambiada', () => {
    expect(isValidSpanishTaxId('X1234567A')).toBe(false);
  });
});

describe('isValidSpanishTaxId · CIF', () => {
  it('acepta un CIF de control numérico (sociedad limitada)', () => {
    expect(isValidSpanishTaxId('B12345674')).toBe(true);
  });

  it('rechaza un CIF de control numérico con el dígito cambiado', () => {
    expect(isValidSpanishTaxId('B12345675')).toBe(false);
  });

  it('rechaza una letra de control donde solo cabe un dígito', () => {
    expect(isValidSpanishTaxId('B1234567D')).toBe(false);
  });

  it('acepta un CIF de control letra (organismo público, P o Q)', () => {
    expect(isValidSpanishTaxId('P1234567D')).toBe(true);
    expect(isValidSpanishTaxId('Q1234567D')).toBe(true);
  });

  it('rechaza un CIF de control letra con la letra cambiada', () => {
    expect(isValidSpanishTaxId('P1234567E')).toBe(false);
  });

  it('normaliza antes de comprobar', () => {
    expect(isValidSpanishTaxId('b-12.345.674')).toBe(true);
  });
});

describe('isValidSpanishTaxId · entradas no válidas', () => {
  it.each(['', '   ', '1234567Z', '123456789Z', 'B123456', 'I12345674', 'ABCDEFGHI'])(
    'rechaza «%s»',
    (value) => {
      expect(isValidSpanishTaxId(value)).toBe(false);
    },
  );
});
