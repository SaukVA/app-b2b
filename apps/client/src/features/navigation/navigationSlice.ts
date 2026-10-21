import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../../store/store';

/** Menú plegado en este equipo: `'1'` plegado, `'0'` desplegado; sin valor, desplegado (FR-014). */
export const NAV_COLLAPSED_KEY = 'navigation.collapsed';

export interface NavigationState {
  collapsed: boolean;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

// Estado inicial perezoso: se lee el equipo al crear cada store, no al importar el módulo.
const navigationSlice = createSlice({
  name: 'navigation',
  initialState: (): NavigationState => ({ collapsed: readCollapsed() }),
  reducers: {
    collapsedToggled(state) {
      state.collapsed = !state.collapsed;
    },
  },
});

export const { collapsedToggled } = navigationSlice.actions;
export const navigationReducer = navigationSlice.reducer;

export const selectNavCollapsed = (state: RootState) => state.navigation.collapsed;
