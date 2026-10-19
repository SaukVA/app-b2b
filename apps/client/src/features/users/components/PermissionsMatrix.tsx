import { APP_MODULES, type AppModule, type PermissionLevel, type RoleSummary } from '@app/shared';
import styles from './PermissionsMatrix.module.css';

export interface PermissionsMatrixProps {
  /** Roles tal como están guardados en la base de datos (FR-020); se ordenan por `order`. */
  roles: readonly RoleSummary[];
}

const MODULE_LABELS: Record<AppModule, string> = {
  ventas: 'Ventas',
  clientes: 'Clientes',
  productos: 'Productos',
  proveedores: 'Proveedores',
  cobros: 'Cobros',
  ajustes: 'Ajustes',
};

const LEVEL_MARKS: Record<PermissionLevel, string> = { edit: 'E', view: 'V', none: '—' };

/** Abreviaturas del tablero «Ajustes» para los roles iniciales; los demás, tres letras y punto. */
const ROLE_SHORT_NAMES: Record<string, string> = {
  Administrador: 'Adm.',
  Comercial: 'Com.',
  Almacén: 'Alm.',
  Administración: 'Admón.',
};

function shortName(role: RoleSummary): string {
  return ROLE_SHORT_NAMES[role.name] ?? `${role.name.slice(0, 3)}.`;
}

/** Un módulo sin valor guardado se trata como «sin acceso» (FR-026). */
function mark(role: RoleSummary, module: AppModule): string {
  return LEVEL_MARKS[role.permissions[module] ?? 'none'];
}

function MatrixRow({ module, roles }: { module: AppModule; roles: readonly RoleSummary[] }) {
  return (
    <tr>
      <th scope="row" className={styles.module}>
        {MODULE_LABELS[module]}
      </th>
      {roles.map((role) => (
        <td key={role.key} className={styles.cell}>
          {mark(role, module)}
        </td>
      ))}
    </tr>
  );
}

/** «Permisos por rol»: matriz de solo lectura, una fila por módulo y una columna por rol (US6). */
export function PermissionsMatrix({ roles }: PermissionsMatrixProps) {
  const columns = [...roles].sort((a, b) => a.order - b.order);
  return (
    <div className={styles.matrix}>
      <p className={styles.subtitle}>Guardados en la base de datos. Solo lectura.</p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.module}>
                Módulo
              </th>
              {columns.map((role) => (
                <th key={role.key} scope="col" className={styles.role}>
                  <abbr title={role.name}>{shortName(role)}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APP_MODULES.map((module) => (
              <MatrixRow key={module} module={module} roles={columns} />
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.legend}>E = editar · V = solo ver · — = sin acceso</p>
    </div>
  );
}
