import { formatOrderDate } from './formatOrderDate';

describe('formatOrderDate', () => {
  it('pasa una fecha YYYY-MM-DD a DD/MM/AAAA', () => {
    expect(formatOrderDate('2026-10-07')).toBe('07/10/2026');
  });

  it('sin pedidos muestra «—»', () => {
    expect(formatOrderDate(null)).toBe('—');
  });
});
