import { parseMongoUri, type ParsedMongoUri } from './mongoUri';

function parsed(uri: string): ParsedMongoUri {
  const result = parseMongoUri(uri);
  if (!result.ok) throw new Error(`Se esperaba una cadena válida: ${result.message}`);
  return result.value;
}

function errorCode(uri: string): string | null {
  const result = parseMongoUri(uri);
  return result.ok ? null : result.code;
}

describe('parseMongoUri · formato', () => {
  it('acepta mongodb:// con usuario, contraseña, varios hosts, base de datos y opciones', () => {
    const value = parsed(
      'mongodb://ana:secreta@db1:27017,db2:27018/ventas?tls=true&replicaSet=rs0',
    );
    expect(value).toMatchObject({
      scheme: 'mongodb',
      hosts: ['db1:27017', 'db2:27018'],
      database: 'ventas',
      username: 'ana',
      hasPassword: true,
    });
  });

  it('acepta mongodb+srv:// con un único host sin puerto', () => {
    const value = parsed('mongodb+srv://ana:secreta@cluster0.ejemplo.net/ventas');
    expect(value).toMatchObject({ scheme: 'mongodb+srv', hosts: ['cluster0.ejemplo.net'] });
  });

  it('sin ruta ni credenciales: database y username son null', () => {
    const value = parsed('mongodb://localhost:27017');
    expect(value).toMatchObject({ database: null, username: null, hasPassword: false });
  });

  it.each([
    ['vacía', ''],
    ['esquema distinto', 'postgres://localhost/db'],
    ['sin hosts', 'mongodb:///db'],
    ['host vacío en la lista', 'mongodb://db1,,db2/db'],
    ['puerto no numérico', 'mongodb://db1:abc/db'],
    ['+srv con varios hosts', 'mongodb+srv://a.ejemplo.net,b.ejemplo.net/db'],
    ['+srv con puerto', 'mongodb+srv://cluster0.ejemplo.net:27017/db'],
  ])('rechaza una cadena %s con DATABASE_URI_INVALID y el motivo', (_case, uri) => {
    const result = parseMongoUri(uri);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('DATABASE_URI_INVALID');
    expect(result.message).toMatch(/^La cadena de conexión no es válida: .+/);
  });
});

describe('parseMongoUri · local o remota', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('%s es local', (host) => {
    expect(parsed(`mongodb://${host}:27017/db`).isLocal).toBe(true);
  });

  it('un host remoto no es local', () => {
    expect(parsed('mongodb://db.ejemplo.net/db?tls=true').isLocal).toBe(false);
  });

  it('si mezcla hosts locales y remotos no es local', () => {
    expect(parsed('mongodb://localhost,db.ejemplo.net/db?tls=true').isLocal).toBe(false);
  });
});

describe('parseMongoUri · cifrado', () => {
  it('mongodb+srv usa TLS por defecto', () => {
    expect(parsed('mongodb+srv://cluster0.ejemplo.net/db').usesTls).toBe(true);
  });

  it('mongodb+srv con tls=false o ssl=false no usa TLS', () => {
    expect(errorCode('mongodb+srv://cluster0.ejemplo.net/db?tls=false')).toBe(
      'DATABASE_TLS_REQUIRED',
    );
    expect(errorCode('mongodb+srv://cluster0.ejemplo.net/db?ssl=false')).toBe(
      'DATABASE_TLS_REQUIRED',
    );
  });

  it('mongodb:// solo usa TLS con tls=true o ssl=true', () => {
    expect(parsed('mongodb://db.ejemplo.net/db?tls=true').usesTls).toBe(true);
    expect(parsed('mongodb://db.ejemplo.net/db?ssl=true').usesTls).toBe(true);
    expect(parsed('mongodb://localhost/db').usesTls).toBe(false);
  });

  it('rechaza una cadena remota sin TLS con DATABASE_TLS_REQUIRED (FR-016)', () => {
    const result = parseMongoUri('mongodb://ana:secreta@db.ejemplo.net:27017/db');
    expect(result).toEqual({
      ok: false,
      code: 'DATABASE_TLS_REQUIRED',
      message: 'Las bases de datos remotas exigen conexión cifrada (tls=true o mongodb+srv).',
    });
  });

  it('una cadena local sin TLS es válida', () => {
    expect(parseMongoUri('mongodb://localhost:27017/db').ok).toBe(true);
  });
});

describe('parseMongoUri · lo que se muestra (FR-006, FR-013)', () => {
  const uri = 'mongodb://ana:s3cr3t%40@db1.ejemplo.net:27017,db2.ejemplo.net/ventas?tls=true';

  it('display son los hosts unidos por coma, sin usuario ni contraseña', () => {
    expect(parsed(uri).display).toBe('db1.ejemplo.net:27017,db2.ejemplo.net');
  });

  it('masked sustituye la contraseña por ••••••••', () => {
    expect(parsed(uri).masked).toBe(
      'mongodb://ana:••••••••@db1.ejemplo.net:27017,db2.ejemplo.net/ventas?tls=true',
    );
  });

  it('sin contraseña, masked es la cadena original', () => {
    expect(parsed('mongodb://localhost:27017/db').masked).toBe('mongodb://localhost:27017/db');
  });

  it('la contraseña no aparece en ningún campo del resultado', () => {
    const serialized = JSON.stringify(parsed(uri));
    expect(serialized).not.toContain('s3cr3t');
  });
});
