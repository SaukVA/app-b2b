import type { ApiSuccess, RoleSummary } from '@app/shared';
import { httpClient } from '../../utils/httpClient';

/** Roles guardados con su fila de la matriz, ordenados por `order` (GET /roles, ADR 0003). */
export async function fetchRoles(): Promise<RoleSummary[]> {
  const { data } = await httpClient.get<ApiSuccess<RoleSummary[]>>('/roles');
  return data.data;
}
