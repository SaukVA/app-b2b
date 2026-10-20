import { useEffect, useState, type FocusEvent } from 'react';
import type { MoneyFormat } from '@app/shared';
import { formatMoney, parseMoney } from '../utils/money';
import { TextField, type TextFieldProps } from './TextField';

export interface MoneyFieldProps
  extends Omit<TextFieldProps, 'value' | 'onChange' | 'error' | 'inputMode'> {
  format: MoneyFormat;
  value: number | null;
  /** Al salir del campo: el importe leído, o `null` si está vacío o no encaja en el formato. */
  onValueChange: (value: number | null) => void;
}

const toText = (value: number | null, format: MoneyFormat) =>
  value === null ? '' : formatMoney(value, format);

/**
 * Campo de importe sobre TextField. Valida al salir con parseMoney y muestra el formato esperado si no
 * encaja (FR-012). Genérico: recibe el formato por prop; las pantallas usan UserMoneyField.
 */
export function MoneyField({
  format,
  value,
  onValueChange,
  onBlur,
  ...fieldProps
}: MoneyFieldProps) {
  const [text, setText] = useState(() => toText(value, format));
  const [error, setError] = useState<string>();
  useEffect(() => {
    setText(toText(value, format));
    setError(undefined);
  }, [value, format]);
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);
    const parsed = text.trim() ? parseMoney(text, format) : null;
    setError(parsed && !parsed.ok ? parsed.error : undefined);
    onValueChange(parsed?.ok ? parsed.value : null);
  };
  return (
    <TextField
      {...fieldProps}
      inputMode="decimal"
      value={text}
      error={error}
      onChange={(event) => setText(event.target.value)}
      onBlur={handleBlur}
    />
  );
}
