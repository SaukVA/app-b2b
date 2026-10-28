// Validación de identificadores fiscales españoles (NIF, NIE y CIF), research R3.

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';
/** Entidades cuyo carácter de control es siempre un dígito. */
const CIF_NUMERIC_CONTROL = 'ABCDEFGHJUV';
/** Entidades cuyo carácter de control es siempre una letra. */
const CIF_LETTER_CONTROL = 'KLMNPQRSW';
const NIE_PREFIX: Record<string, string> = { X: '0', Y: '1', Z: '2' };

/** Mayúsculas y sin espacios, puntos ni guiones: «b-12.345.678» → «B12345678». */
export function normalizeTaxId(value: string): string {
  return value.toUpperCase().replace(/[\s.-]/g, '');
}

function isValidNif(value: string): boolean {
  const match = /^(\d{8})([A-Z])$/.exec(value);
  return match !== null && NIF_LETTERS[Number(match[1]) % 23] === match[2];
}

function isValidNie(value: string): boolean {
  const match = /^([XYZ])(\d{7})([A-Z])$/.exec(value);
  return match !== null && isValidNif(NIE_PREFIX[match[1]] + match[2] + match[3]);
}

/** Dígito de control del CIF: suma de las posiciones pares más las impares dobladas (con sus cifras sumadas). */
function cifControlDigit(digits: string): number {
  const total = digits.split('').reduce((sum, char, index) => {
    const digit = Number(char);
    if (index % 2 === 1) return sum + digit;
    const doubled = digit * 2;
    return sum + Math.floor(doubled / 10) + (doubled % 10);
  }, 0);
  return (10 - (total % 10)) % 10;
}

function isValidCif(value: string): boolean {
  const match = /^([A-HJ-NP-SUVW])(\d{7})([0-9A-J])$/.exec(value);
  if (!match) return false;
  const [, entity, digits, control] = match;
  const digit = cifControlDigit(digits);
  const asDigit = control === String(digit);
  const asLetter = control === CIF_CONTROL_LETTERS[digit];
  if (CIF_NUMERIC_CONTROL.includes(entity)) return asDigit;
  if (CIF_LETTER_CONTROL.includes(entity)) return asLetter;
  return asDigit || asLetter;
}

/** `true` si es un NIF, NIE o CIF español con su carácter de control correcto. Normaliza antes. */
export function isValidSpanishTaxId(value: string): boolean {
  const id = normalizeTaxId(value);
  return isValidNif(id) || isValidNie(id) || isValidCif(id);
}
