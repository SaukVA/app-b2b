/** Compras sin IVA de un proveedor en el año en curso y en cada trimestre (1T a 4T). */
export interface PurchaseTotals {
  year: number;
  quarters: [number, number, number, number];
}

/**
 * Costura del módulo de compras (research R7): mientras no existan compras, todo vale 0 (FR-021, FR-021a).
 * Cuando llegue el módulo, solo cambia esta función; el listado y la ficha no se tocan.
 */
export async function getPurchaseTotals(
  supplierIds: readonly string[],
): Promise<Map<string, PurchaseTotals>> {
  return new Map(supplierIds.map((id) => [id, { year: 0, quarters: [0, 0, 0, 0] }]));
}
