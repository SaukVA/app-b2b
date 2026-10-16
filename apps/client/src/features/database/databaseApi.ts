import type {
  DatabaseSaveResult,
  DatabaseSummary,
  DatabaseTestResult,
  DesktopBridge,
} from '@app/shared';
import { getDesktopBridge } from '../../utils/desktop';

// La base de datos del escritorio se gestiona en el proceso principal: estas funciones llaman al puente
// window.desktop (contracts/desktop-bridge.md). Solo existen en escritorio.

function requireBridge(): DesktopBridge {
  const bridge = getDesktopBridge();
  if (!bridge) throw new Error('La configuración de base de datos solo existe en escritorio');
  return bridge;
}

export function getDatabaseSummary(): Promise<DatabaseSummary> {
  return requireBridge().getDatabase();
}

export function testDatabase(uri: string): Promise<DatabaseTestResult> {
  return requireBridge().testDatabase(uri);
}

export function saveDatabase(uri: string): Promise<DatabaseSaveResult> {
  return requireBridge().saveDatabase(uri);
}
