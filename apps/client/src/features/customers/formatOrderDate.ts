/**
 * «07/10/2026» para la fecha `2026-10-07` del último pedido, o «—» si no hay pedidos. Es una fecha de
 * calendario: se reordena el texto sin pasar por `Date`, que la desplazaría según la zona horaria (R12).
 */
export function formatOrderDate(date: string | null): string {
  if (!date) return '—';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
