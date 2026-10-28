// Validación de IBAN: formato, longitud por país y módulo 97 (ISO 13616), research R3.

/** Longitud del IBAN de los países con los que es más probable trabajar; el resto acepta 15–34. */
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24,
  AT: 20,
  BE: 16,
  CH: 21,
  DE: 22,
  DK: 18,
  ES: 24,
  FI: 18,
  FR: 27,
  GB: 22,
  GR: 27,
  IE: 22,
  IT: 27,
  LU: 20,
  NL: 18,
  NO: 15,
  PL: 28,
  PT: 25,
  SE: 24,
};

/** Mayúsculas y sin espacios. */
export function normalizeIban(value: string): string {
  return value.toUpperCase().replace(/\s/g, '');
}

function hasValidLength(iban: string): boolean {
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  return expected ? iban.length === expected : iban.length >= 15 && iban.length <= 34;
}

/** Resto de dividir entre 97 el número que resulta de mover el país al final y pasar letras a números. */
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  return rearranged
    .split('')
    .map((char) => (/[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char))
    .join('')
    .split('')
    .reduce((rest, digit) => (rest * 10 + Number(digit)) % 97, 0);
}

/** `true` si tiene formato de IBAN, la longitud de su país y el módulo 97 igual a 1. Normaliza antes. */
export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  return hasValidLength(iban) && mod97(iban) === 1;
}

/** En grupos de 4 caracteres: «ES91 2100 0418 4502 0005 1332». */
export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ');
}
