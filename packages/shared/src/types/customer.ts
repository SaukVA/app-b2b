/** Tramo del semáforo del riesgo usado (regla en `customerRiskLevel`). */
export type CustomerRiskLevel = 'low' | 'medium' | 'high';

/** Fila del listado de clientes (columnas de FR-004). */
export interface CustomerListItem {
  id: string;
  name: string;
  /** Población, que se muestra bajo el nombre; sin ella, solo el nombre. */
  city: string | null;
  /** Euros con 2 decimales; `null` o 0 = cliente sin límite. */
  maxRisk: number | null;
  /** Saldo pendiente en euros con 2 decimales; se muestra con `UserMoney`. */
  balance: number;
  /** Porcentaje entero ≥ 0 de `customerRiskUsed` (puede pasar de 100); `null` sin límite. */
  riskUsed: number | null;
  /** Fecha `YYYY-MM-DD` del último pedido; `null` si no hay pedidos. */
  lastOrderDate: string | null;
}

/** Criterios del listado (GET /customers). Sin `q` equivale a sin búsqueda. */
export interface CustomerListQuery {
  q?: string;
  page: number;
}
