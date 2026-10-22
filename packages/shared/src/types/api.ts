// Envelope común de todas las respuestas de la API (CLAUDE.md › Convenciones).

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Página de cualquier listado: elementos de la página, total que cumple los criterios y paginación. */
export interface ListPage<T> {
  items: T[];
  total: number;
  /** Página devuelta (la pedida), empezando en 1. */
  page: number;
  pageSize: number;
}
