import { configureStore } from '@reduxjs/toolkit';

// Cada dominio registra aquí su slice (features/<dominio>/<dominio>Slice.ts).
export const store = configureStore({
  reducer: {},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
