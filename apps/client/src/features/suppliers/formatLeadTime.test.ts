import { formatLeadTime } from './formatLeadTime';

describe('formatLeadTime', () => {
  it.each([
    [null, '—'],
    [1, '1 día'],
    [0, '0 días'],
    [3, '3 días'],
  ])('%p → %s', (days, text) => {
    expect(formatLeadTime(days)).toBe(text);
  });
});
