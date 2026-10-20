import type { MoneyFormat } from '@app/shared';

// Formato de importes del usuario (004, research R8). Se parte de en-US porque es-ES no agrupa los miles
// en números de 4 cifras ("1248,50") y el diseño exige "1.248,50 €".

/** Ejemplo de cada formato: opciones del selector y mensaje de error de parseMoney. */
export const MONEY_FORMAT_EXAMPLES: Record<MoneyFormat, string> = {
  es: '1.248,50 €',
  en: '€ 1,248.50',
};

interface FormatSpec {
  group: string;
  decimal: string;
  /** Importe ya formateado con el signo → texto con el símbolo €. */
  withSymbol: (amount: string) => string;
  /** Quita el símbolo € opcional, en su posición. */
  symbol: RegExp;
  /** Signo, parte entera (miles opcionales pero bien agrupados) y como mucho 2 decimales. */
  pattern: RegExp;
}

const SPECS: Record<MoneyFormat, FormatSpec> = {
  es: {
    group: '.',
    decimal: ',',
    withSymbol: (amount) => `${amount} €`,
    symbol: /\s*€$/,
    pattern: /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/,
  },
  en: {
    group: ',',
    decimal: '.',
    withSymbol: (amount) => `€ ${amount}`,
    symbol: /^€\s*/,
    pattern: /^(-?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/,
  },
};

const BASE_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "1.248,50 €" / "€ 1,248.50"; siempre 2 decimales y signo menos en los negativos (FR-011). */
export function formatMoney(value: number, format: MoneyFormat): string {
  const spec = SPECS[format];
  const amount = BASE_FORMAT.formatToParts(value)
    .map((part) => {
      if (part.type === 'group') return spec.group;
      if (part.type === 'decimal') return spec.decimal;
      return part.type === 'minusSign' ? '-' : part.value;
    })
    .join('');
  return spec.withSymbol(amount);
}

export type ParseMoneyResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * Lee un importe escrito con el formato del usuario. Nunca reinterpreta el otro separador ni redondea: si
 * no encaja, devuelve el formato esperado (FR-012). Se calcula en céntimos enteros para que el mismo
 * importe dé el mismo número con los dos formatos.
 */
export function parseMoney(text: string, format: MoneyFormat): ParseMoneyResult {
  const spec = SPECS[format];
  const match = spec.pattern.exec(text.trim().replace(spec.symbol, ''));
  if (!match) {
    return {
      ok: false,
      error: `Formato esperado: ${MONEY_FORMAT_EXAMPLES[format].replace(spec.symbol, '')}`,
    };
  }
  const [, sign, integer, decimals = ''] = match;
  const cents = Number(integer.split(spec.group).join('')) * 100 + Number(decimals.padEnd(2, '0'));
  return { ok: true, value: (sign ? -cents : cents) / 100 };
}
