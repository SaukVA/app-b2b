import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDebouncedValue', () => {
  it('devuelve el valor inicial al momento', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('tras cambios seguidos solo devuelve el último cuando pasan 300 ms sin cambios', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'ac' });
    act(() => jest.advanceTimersByTime(200));
    rerender({ value: 'ace' });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('a');
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('ace');
  });

  it('limpia el temporizador al desmontar', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
