// Puente expuesto por apps/desktop/src/preload.ts como window.desktop (contracts/desktop-bridge.md).

export interface DesktopBridge {
  readonly isDesktop: true;
  getServerUrl(): Promise<string>;
  checkServer(): Promise<{ reachable: boolean }>;
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string, persistent: boolean): Promise<void>;
  clearRefreshToken(): Promise<void>;
}
