import { APP_TIME_ZONE, type UserSummary } from '@app/shared';
import { Menu, type MenuItem } from '../../../components/Menu';
import { StatusStamp } from '../../../components/StatusStamp';
import { Table, type TableColumn } from '../../../components/Table';
import styles from './UsersTable.module.css';

type UserAction = (user: UserSummary) => void;

export interface UsersTableProps {
  users: readonly UserSummary[];
  /** Su fila lleva «(tú)» y no ofrece «Bloquear» (FR-015). */
  currentUserId: string | null;
  /** Solo se muestran las acciones que llegan (US4 y US5 añaden las suyas). */
  onEdit?: UserAction;
  onResetPassword?: UserAction;
  onBlock?: UserAction;
  onUnblock?: UserAction;
  /** Referencia para «Hoy» y «Ayer»; los tests la fijan. */
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE });
const time = new Intl.DateTimeFormat('es-ES', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const date = new Intl.DateTimeFormat('es-ES', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** «Nunca», «Hoy 08:47», «Ayer 18:03» o «02/10/2026 00:30», en hora de Madrid (tablero «Ajustes»). */
export function formatLastAccess(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'Nunca';
  const at = new Date(iso);
  const day = dayKey.format(at);
  if (day === dayKey.format(now)) return `Hoy ${time.format(at)}`;
  if (day === dayKey.format(new Date(now.getTime() - DAY_MS))) return `Ayer ${time.format(at)}`;
  return `${date.format(at)} ${time.format(at)}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function menuItems(user: UserSummary, props: UsersTableProps): MenuItem[] {
  const isSelf = user.id === props.currentUserId;
  const candidates: Array<[UserAction | undefined, string, MenuItem['tone'], boolean]> = [
    [props.onEdit, 'Editar nombre, email o rol', 'default', true],
    [props.onResetPassword, 'Restablecer contraseña', 'default', true],
    [props.onBlock, 'Bloquear', 'danger', user.status === 'Activo' && !isSelf],
    [props.onUnblock, 'Desbloquear', 'default', user.status === 'Bloqueado'],
  ];
  return candidates
    .filter(([action, , , visible]) => action && visible)
    .map(([action, label, tone]) => ({ label, tone, onSelect: () => action?.(user) }));
}

function UserActions({ user, props }: { user: UserSummary; props: UsersTableProps }) {
  const items = menuItems(user, props);
  if (items.length === 0) return null;
  return <Menu label={`Opciones de ${user.name}`} items={items} />;
}

function Status({ user }: { user: UserSummary }) {
  return <StatusStamp tone={user.status === 'Activo' ? 'ok' : 'danger'}>{user.status}</StatusStamp>;
}

function UserIdentity({ user, isSelf }: { user: UserSummary; isSelf: boolean }) {
  return (
    <div className={styles.identity}>
      <span className={styles.avatar} aria-hidden="true">
        {initials(user.name)}
      </span>
      <span className={styles.names}>
        <span className={styles.name}>
          {user.name}
          {isSelf && <span className={styles.self}> (tú)</span>}
        </span>
        <span className={styles.email}>{user.email}</span>
      </span>
    </div>
  );
}

function columns(props: UsersTableProps, now: Date): TableColumn<UserSummary>[] {
  return [
    {
      key: 'user',
      header: 'Usuario',
      render: (user) => <UserIdentity user={user} isSelf={user.id === props.currentUserId} />,
    },
    { key: 'role', header: 'Rol', render: (user) => user.roleName },
    {
      key: 'last',
      header: 'Último acceso',
      render: (user) => (
        <span className={styles.mono}>{formatLastAccess(user.lastLoginAt, now)}</span>
      ),
    },
    { key: 'status', header: 'Estado', render: (user) => <Status user={user} /> },
    {
      key: 'actions',
      header: <span className={styles.srOnly}>Acciones</span>,
      align: 'end',
      render: (user) => <UserActions user={user} props={props} />,
    },
  ];
}

function UserCard({ user, props, now }: { user: UserSummary; props: UsersTableProps; now: Date }) {
  return (
    <div className={styles.card}>
      <UserIdentity user={user} isSelf={user.id === props.currentUserId} />
      <span className={styles.meta}>
        {user.roleName} · {formatLastAccess(user.lastLoginAt, now)}
      </span>
      <div className={styles.cardStatus}>
        <Status user={user} />
      </div>
      <div className={styles.cardActions}>
        <UserActions user={user} props={props} />
      </div>
    </div>
  );
}

/** Listado de Ajustes › Usuarios: tabla en escritorio y tarjetas en móvil (FR-011, FR-012). */
export function UsersTable(props: UsersTableProps) {
  const now = props.now ?? new Date();
  return (
    <Table
      caption="Usuarios"
      columns={columns(props, now)}
      rows={props.users}
      getRowKey={(user) => user.id}
      renderCard={(user) => <UserCard user={user} props={props} now={now} />}
    />
  );
}
