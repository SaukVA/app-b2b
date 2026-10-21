import { useEffect, useState } from 'react';

/** Devuelve `value` cuando lleva `delay` ms sin cambiar (p. ej. esperar a que se deje de teclear). */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
