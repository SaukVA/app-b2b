import type { DesktopBridge } from '@app/shared';

declare global {
  interface Window {
    /** Solo existe en la app de escritorio (preload de Electron); en web es undefined. */
    desktop?: DesktopBridge;
  }
}

export function getDesktopBridge(): DesktopBridge | null {
  return window.desktop ?? null;
}

export function isDesktop(): boolean {
  return getDesktopBridge() !== null;
}
