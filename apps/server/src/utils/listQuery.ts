// Ayudas comunes a los listados paginados (Productos, Clientes, Proveedores).

/** Búsqueda literal que no distingue mayúsculas; sin texto, `undefined` (no filtra). */
export function searchPattern(q: string | undefined): RegExp | undefined {
  if (!q) return undefined;
  return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Documentos que se saltan para llegar a la página pedida (la primera es la 1). */
export function pageSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/** Orden alfabético en español para nombres (acentos y mayúsculas no alteran el orden). */
export const SPANISH_COLLATION = { locale: 'es', strength: 1 } as const;
