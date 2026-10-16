import type { BackendToMainMessage } from '@app/shared';
import { CONNECT_RETRY_MS, startEmbedded, type EmbeddedDeps } from './embeddedRuntime';

const URI = 'mongodb://localhost:27017/escritorio';

function setup(overrides: Partial<EmbeddedDeps> = {}) {
  const calls: string[] = [];
  const sent: BackendToMainMessage[] = [];
  const deps: EmbeddedDeps = {
    env: { PORT: 0, HOST: '127.0.0.1', MONGODB_URI: URI },
    listen: jest.fn(async () => {
      calls.push('listen');
      return 51234;
    }),
    connect: jest.fn(async () => {
      calls.push('connect');
    }),
    ensureBootstrap: jest.fn(async () => {
      calls.push('bootstrap');
    }),
    parentPort: {
      postMessage: (message: BackendToMainMessage) => {
        calls.push(`send:${message.type}`);
        sent.push(message);
      },
      on: jest.fn(),
    },
    log: jest.fn(),
    ...overrides,
  };
  return { deps, calls, sent };
}

/** Deja correr las promesas pendientes (con temporizadores falsos no hay esperas reales). */
const flush = () =>
  new Promise<void>((resolve) => jest.requireActual('timers').setImmediate(resolve));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('startEmbedded · arranque', () => {
  it('escucha en HOST y PORT y envía ready con el puerto real antes de conectar', async () => {
    const { deps, calls, sent } = setup();
    await startEmbedded(deps);
    await flush();
    expect(deps.listen).toHaveBeenCalledWith('127.0.0.1', 0);
    expect(sent[0]).toEqual({ type: 'ready', port: 51234 });
    expect(calls.indexOf('send:ready')).toBeLessThan(calls.indexOf('connect'));
  });

  it('sin MONGODB_URI no intenta conectar (estado «Sin configurar»)', async () => {
    const { deps } = setup({ env: { PORT: 0, HOST: '127.0.0.1', MONGODB_URI: undefined } });
    await startEmbedded(deps);
    await flush();
    expect(deps.connect).not.toHaveBeenCalled();
  });
});

describe('startEmbedded · conexión con la base de datos', () => {
  it(`si no conecta, reintenta cada ${CONNECT_RETRY_MS / 1000} s`, async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(new Error('sin respuesta'))
      .mockRejectedValueOnce(new Error('sin respuesta'))
      .mockResolvedValue(undefined);
    const { deps } = setup({ connect });
    await startEmbedded(deps);
    await flush();
    expect(connect).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(CONNECT_RETRY_MS);
    expect(connect).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(CONNECT_RETRY_MS);
    expect(connect).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenCalledWith(URI);
  });

  it('tras la primera conexión crea la cuenta inicial una sola vez (001 US7)', async () => {
    const connect = jest
      .fn()
      .mockRejectedValueOnce(new Error('sin respuesta'))
      .mockResolvedValue(undefined);
    const { deps } = setup({ connect });
    await startEmbedded(deps);
    await flush();
    expect(deps.ensureBootstrap).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(CONNECT_RETRY_MS);
    expect(deps.ensureBootstrap).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(CONNECT_RETRY_MS * 3);
    expect(deps.ensureBootstrap).toHaveBeenCalledTimes(1);
  });

  it('los registros de error nunca incluyen la cadena de conexión', async () => {
    const connect = jest.fn().mockRejectedValue(new Error(`no se pudo conectar a ${URI}`));
    const { deps } = setup({ connect });
    await startEmbedded(deps);
    await flush();
    const logged = (deps.log as jest.Mock).mock.calls.flat().join(' ');
    expect(logged).not.toContain(URI);
  });
});
