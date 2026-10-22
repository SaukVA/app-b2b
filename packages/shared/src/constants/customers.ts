import type { CustomerRiskLevel } from '../types/customer';

/** Longitud máxima de la búsqueda, sin contar los espacios del principio y del final (FR-008). */
export const CUSTOMER_SEARCH_MAX_LENGTH = 100;

/** Fichas por página del listado: 10, como Productos (clarificación del 2026-10-22; el lienzo muestra 8). */
export const CUSTOMERS_PAGE_SIZE = 10;

/** Semáforo del riesgo usado (README de diseño): verde < 50 % ≤ ámbar < 80 % ≤ rojo. */
export const CUSTOMER_RISK_THRESHOLDS = { medium: 50, high: 80 } as const;

/**
 * Porcentaje del riesgo máximo que usa el saldo pendiente, redondeado. `null` si el cliente no tiene límite
 * (riesgo máximo ausente o 0); un saldo a favor cuenta como 0. Puede pasar de 100.
 */
export function customerRiskUsed(balance: number, maxRisk: number | null): number | null {
  if (maxRisk === null || maxRisk <= 0) return null;
  if (balance <= 0) return 0;
  return Math.round((balance / maxRisk) * 100);
}

export function customerRiskLevel(riskUsed: number): CustomerRiskLevel {
  if (riskUsed >= CUSTOMER_RISK_THRESHOLDS.high) return 'high';
  if (riskUsed >= CUSTOMER_RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}
