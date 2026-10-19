import type { AppModule, PermissionLevel } from '../constants/roles';

/** Rol de la colección `roles` tal como lo devuelve la API (GET /roles). */
export interface RoleSummary {
  key: string;
  name: string;
  isAdmin: boolean;
  order: number;
  /** Completo: los módulos sin valor guardado ya vienen como `none`. */
  permissions: Record<AppModule, PermissionLevel>;
}
