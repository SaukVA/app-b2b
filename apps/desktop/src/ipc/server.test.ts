import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IpcMain } from 'electron';
import { writeConfig } from './config';
import { CHECK_TIMEOUT_MS, checkServer, registerServerIpc, SERVER_CHANNELS } from './server';

type FetchFn = typeof fetch;

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

/** fetch que no responde nunca, salvo que se aborte con la señal de timeout. */
const hangingFetch: FetchFn = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('checkServer', () => {
  it('reachable: true si /health responde success: true', async () => {
    const fetchImpl = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>(async () =>
      jsonResponse(200, { success: true, data: { status: 'ok' } }),
    );
    await expect(checkServer('http://srv/api/', { fetchImpl })).resolves.toEqual({
      reachable: true,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe('http://srv/api/health');
  });

  it('reachable: false si /health no responde a tiempo', async () => {
    await expect(
      checkServer('http://srv/api', { fetchImpl: hangingFetch, timeoutMs: 20 }),
    ).resolves.toEqual({
      reachable: false,
    });
  });

  it('reachable: false ante un error HTTP, un cuerpo inesperado o un fallo de red', async () => {
    const cases: FetchFn[] = [
      async () => jsonResponse(500, { success: false }),
      async () => jsonResponse(200, { status: 'ok' }),
      async () => {
        throw new TypeError('fetch failed');
      },
    ];
    for (const fetchImpl of cases) {
      await expect(checkServer('http://srv/api', { fetchImpl })).resolves.toEqual({
        reachable: false,
      });
    }
  });

  it('el tiempo máximo por defecto es de 5 s', () => {
    expect(CHECK_TIMEOUT_MS).toBe(5000);
  });
});

describe('registerServerIpc', () => {
  type Handler = (event: unknown, ...args: unknown[]) => unknown;
  let userDataDir: string;

  beforeEach(() => {
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-b2b-server-'));
  });
  afterEach(() => fs.rmSync(userDataDir, { recursive: true, force: true }));

  function register(fetchImpl: FetchFn) {
    const handlers = new Map<string, Handler>();
    const ipcMain = {
      handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
    };
    registerServerIpc(ipcMain as unknown as IpcMain, { userDataDir, fetchImpl });
    return (channel: string) => handlers.get(channel)!({});
  }

  it('server:get-url lee la configuración y server:check comprueba esa URL', async () => {
    writeConfig(userDataDir, { serverUrl: 'http://erp.empresa.local/api' });
    const fetchImpl = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>(async () =>
      jsonResponse(200, { success: true }),
    );
    const call = register(fetchImpl);
    expect(call(SERVER_CHANNELS.getUrl)).toBe('http://erp.empresa.local/api');
    await expect(call(SERVER_CHANNELS.check)).resolves.toEqual({ reachable: true });
    expect(fetchImpl.mock.calls[0][0]).toBe('http://erp.empresa.local/api/health');
    expect(SERVER_CHANNELS).toEqual({ getUrl: 'server:get-url', check: 'server:check' });
  });
});
