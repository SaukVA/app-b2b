import fs from 'node:fs';
import path from 'node:path';

export interface DesktopConfig {
  serverUrl: string;
}

/** URL por defecto fijada en la build (variable DEFAULT_SERVER_URL) o el servidor local de desarrollo. */
export const DEFAULT_SERVER_URL = process.env.DEFAULT_SERVER_URL ?? 'http://localhost:4000/api';

const CONFIG_FILE = 'config.json';

function configPath(userDataDir: string): string {
  return path.join(userDataDir, CONFIG_FILE);
}

/** Lee userData/config.json; si no existe o está corrupto, usa los valores por defecto. */
export function readConfig(userDataDir: string): DesktopConfig {
  try {
    const raw = JSON.parse(
      fs.readFileSync(configPath(userDataDir), 'utf8'),
    ) as Partial<DesktopConfig>;
    return { serverUrl: raw.serverUrl || DEFAULT_SERVER_URL };
  } catch {
    return { serverUrl: DEFAULT_SERVER_URL };
  }
}

export function writeConfig(userDataDir: string, config: DesktopConfig): void {
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(configPath(userDataDir), JSON.stringify(config, null, 2), 'utf8');
}
