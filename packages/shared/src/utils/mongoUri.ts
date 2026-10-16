import { DATABASE_ERROR_CODES, DATABASE_MESSAGES } from '../constants/database';

// Analizador mínimo de cadenas de conexión de MongoDB (research R8): valida el formato, distingue local de
// remota, exige TLS en remoto y prepara lo que se puede mostrar sin credenciales.

export interface ParsedMongoUri {
  scheme: 'mongodb' | 'mongodb+srv';
  hosts: string[];
  database: string | null;
  username: string | null;
  /** La contraseña nunca forma parte del resultado. */
  hasPassword: boolean;
  isLocal: boolean;
  usesTls: boolean;
  /** Hosts unidos por coma: lo que muestra el indicador del login. */
  display: string;
  /** Cadena con la contraseña sustituida por ••••••••. */
  masked: string;
}

export type ParseMongoUriResult =
  | { ok: true; value: ParsedMongoUri }
  | {
      ok: false;
      code: typeof DATABASE_ERROR_CODES.uriInvalid | typeof DATABASE_ERROR_CODES.tlsRequired;
      message: string;
    };

const URI_PATTERN = /^(mongodb(?:\+srv)?):\/\/(?:([^@/?]*)@)?([^/?]*)(?:\/([^?]*))?(?:\?(.*))?$/;
const HOST_PATTERN = /^(\[[0-9a-fA-F:.]+\]|[A-Za-z0-9._-]+)(?::(\d{1,5}))?$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const PASSWORD_MASK = '••••••••';

function invalid(reason: string): ParseMongoUriResult {
  return {
    ok: false,
    code: DATABASE_ERROR_CODES.uriInvalid,
    message: `${DATABASE_MESSAGES.uriInvalidPrefix}${reason}.`,
  };
}

function splitHost(host: string): { hostname: string; port: number | null } | null {
  const match = HOST_PATTERN.exec(host);
  if (!match) return null;
  const port = match[2] ? Number(match[2]) : null;
  if (port !== null && (port < 1 || port > 65535)) return null;
  return { hostname: match[1].replace(/^\[|\]$/g, ''), port };
}

/** Motivo por el que la lista de hosts no es válida, o null si lo es. */
function hostsProblem(scheme: string, hosts: string[]): string | null {
  if (hosts.length === 1 && hosts[0] === '') return 'falta el servidor';
  const bad = hosts.find((host) => splitHost(host) === null);
  if (bad === '') return 'hay un servidor vacío en la lista';
  if (bad !== undefined) return `el servidor «${bad}» no es válido`;
  const srvProblem = hosts.length !== 1 || splitHost(hosts[0])?.port !== null;
  if (scheme === 'mongodb+srv' && srvProblem) {
    return 'mongodb+srv admite un único servidor y sin puerto';
  }
  return null;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** mongodb+srv lleva TLS salvo que se desactive; mongodb:// solo si se activa. */
function detectTls(scheme: string, query: string | undefined): boolean {
  const params = new URLSearchParams(query ?? '');
  const tls = (params.get('tls') ?? params.get('ssl'))?.toLowerCase();
  return scheme === 'mongodb+srv' ? tls !== 'false' : tls === 'true';
}

function maskPassword(uri: string, scheme: string, credentials: string | undefined): string {
  const separator = credentials?.indexOf(':') ?? -1;
  if (credentials === undefined || separator < 0) return uri;
  const user = credentials.slice(0, separator);
  return uri.replace(`${scheme}://${credentials}@`, `${scheme}://${user}:${PASSWORD_MASK}@`);
}

function buildParsed(uri: string, match: RegExpExecArray): ParsedMongoUri | null {
  const [, scheme, credentials, hostList, path, query] = match;
  const hosts = hostList.split(',');
  const rawUser = credentials?.split(':')[0];
  const username = rawUser ? safeDecode(rawUser) : null;
  const database = path ? safeDecode(path) : null;
  if ((rawUser && username === null) || (path && database === null)) return null;
  return {
    scheme: scheme as ParsedMongoUri['scheme'],
    hosts,
    database: database || null,
    username,
    hasPassword: credentials?.includes(':') ?? false,
    isLocal: hosts.every((host) => LOCAL_HOSTS.has(splitHost(host)!.hostname)),
    usesTls: detectTls(scheme, query),
    display: hosts.join(','),
    masked: maskPassword(uri, scheme, credentials),
  };
}

export function parseMongoUri(input: string): ParseMongoUriResult {
  const uri = input.trim();
  if (uri === '') return invalid('está vacía');
  const match = URI_PATTERN.exec(uri);
  if (!match) return invalid('debe empezar por mongodb:// o mongodb+srv://');
  const problem = hostsProblem(match[1], match[3].split(','));
  if (problem) return invalid(problem);
  const value = buildParsed(uri, match);
  if (!value) return invalid('el usuario o la base de datos no están bien codificados');
  if (!value.isLocal && !value.usesTls) {
    return {
      ok: false,
      code: DATABASE_ERROR_CODES.tlsRequired,
      message: DATABASE_MESSAGES.tlsRequired,
    };
  }
  return { ok: true, value };
}
