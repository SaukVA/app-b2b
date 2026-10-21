import type { ReactNode } from 'react';
import { can, isModuleImplemented, type AppModule, type PermissionSet } from '@app/shared';
import type { NavBarItem } from '../../components/NavBar';
import {
  AjustesIcon,
  ClientesIcon,
  CobrosIcon,
  ProductosIcon,
  ProveedoresIcon,
  VentasIcon,
} from './NavIcons';

interface NavModule {
  module: AppModule;
  label: string;
  icon: ReactNode;
}

/** Orden del menú (FR-002); Ajustes va aparte, al final. */
export const NAV_MODULES: readonly NavModule[] = [
  { module: 'ventas', label: 'Ventas', icon: <VentasIcon /> },
  { module: 'clientes', label: 'Clientes', icon: <ClientesIcon /> },
  { module: 'productos', label: 'Productos', icon: <ProductosIcon /> },
  { module: 'proveedores', label: 'Proveedores', icon: <ProveedoresIcon /> },
  { module: 'cobros', label: 'Cobros', icon: <CobrosIcon /> },
];

const SETTINGS: NavModule = { module: 'ajustes', label: 'Ajustes', icon: <AjustesIcon /> };

function toItem({ module, label, icon }: NavModule): NavBarItem {
  return { to: `/${module}`, label, icon, pending: !isModuleImplemented(module) };
}

/**
 * Elementos del menú del rol (data-model.md, «Elemento de menú»): los módulos que puede ver, estén
 * implementados o no, y Ajustes siempre, en el pie (FR-003, FR-004).
 */
export function buildNavItems(permissions: PermissionSet): NavBarItem[] {
  const visible = NAV_MODULES.filter(({ module }) => can(permissions, module, 'view'));
  return [...visible.map(toItem), { ...toItem(SETTINGS), section: 'footer' }];
}
