import { useAppDispatch, useAppSelector } from '../../store/store';
import { NAV_COLLAPSED_KEY, collapsedToggled, selectNavCollapsed } from './navigationSlice';

function writeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Sin almacenamiento (navegación privada, bloqueo): se pliega igual, pero no se recordará.
  }
}

/** Estado plegado del menú; solo se guarda en este equipo, nunca en el servidor (FR-014). */
export function useNavCollapsed() {
  const collapsed = useAppSelector(selectNavCollapsed);
  const dispatch = useAppDispatch();

  function toggle() {
    dispatch(collapsedToggled());
    writeCollapsed(!collapsed);
  }

  return { collapsed, toggle };
}
