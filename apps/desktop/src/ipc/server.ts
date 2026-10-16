import type { IpcMain } from 'electron';
import { readConfig } from './config';

// Servidor configurado en escritorio (FR-018, contracts/desktop-bridge.md).

export const SERVER_CHANNELS = {
  getUrl: 'server:get-url',
  check: 'server:check',
} as const;

export const CHECK_TIMEOUT_MS = 5000;

interface CheckOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** reachable solo si {serverUrl}/health responde `success: true` antes del tiempo máximo. */
export async function checkServer(
  serverUrl: string,
  options: CheckOptions = {},
): Promise<{ reachable: boolean }> {
  const { fetchImpl = fetch, timeoutMs = CHECK_TIMEOUT_MS } = options;
  try {
    const response = await fetchImpl(`${serverUrl.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { reachable: false };
    const body = (await response.json()) as { success?: unknown };
    return { reachable: body.success === true };
  } catch {
    return { reachable: false };
  }
}

export function registerServerIpc(
  ipcMain: IpcMain,
  options: { userDataDir: string; fetchImpl?: typeof fetch },
): void {
  const serverUrl = () => readConfig(options.userDataDir).serverUrl;
  ipcMain.handle(SERVER_CHANNELS.getUrl, () => serverUrl());
  ipcMain.handle(SERVER_CHANNELS.check, () =>
    checkServer(serverUrl(), { fetchImpl: options.fetchImpl }),
  );
}
