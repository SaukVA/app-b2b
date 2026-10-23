/** Plazo de entrega en días naturales (FR-016): «—» si no se conoce, «1 día» o «N días». */
export function formatLeadTime(days: number | null): string {
  if (days === null) return '—';
  return days === 1 ? '1 día' : `${days} días`;
}
