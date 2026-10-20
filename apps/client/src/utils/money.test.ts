import { formatMoney, parseMoney } from './money';

describe('formatMoney', () => {
  it.each([
    [1248.5, '1.248,50 €', '€ 1,248.50'],
    [-35, '-35,00 €', '€ -35.00'],
    [1234567.899, '1.234.567,90 €', '€ 1,234,567.90'],
    [0, '0,00 €', '€ 0.00'],
  ])('%p → "%s" (es) y "%s" (en)', (value, es, en) => {
    expect(formatMoney(value, 'es')).toBe(es);
    expect(formatMoney(value, 'en')).toBe(en);
  });
});

describe('parseMoney', () => {
  it.each([
    ['1.248,50', 1248.5],
    ['1248,5', 1248.5],
    ['1248', 1248],
    ['-35,00', -35],
    ['1.248,50 €', 1248.5],
  ])('con es acepta "%s"', (text, value) => {
    expect(parseMoney(text, 'es')).toEqual({ ok: true, value });
  });

  it.each(['1,248.50', '12.48', '1.24,50', '1,234'])('con es rechaza "%s"', (text) => {
    expect(parseMoney(text, 'es')).toEqual({ ok: false, error: 'Formato esperado: 1.248,50' });
  });

  it.each([
    ['1,248.50', 1248.5],
    ['1248.5', 1248.5],
    ['1248', 1248],
    ['-35.00', -35],
    ['€ 1,248.50', 1248.5],
  ])('con en acepta "%s"', (text, value) => {
    expect(parseMoney(text, 'en')).toEqual({ ok: true, value });
  });

  it.each(['1.248,50', '12,48', '1,24.50', '1.234'])('con en rechaza "%s"', (text) => {
    expect(parseMoney(text, 'en')).toEqual({ ok: false, error: 'Formato esperado: 1,248.50' });
  });

  it('el mismo importe en los dos formatos da exactamente el mismo número', () => {
    const es = parseMoney('1.234.567,89', 'es');
    const en = parseMoney('1,234,567.89', 'en');
    expect(es.ok && en.ok).toBe(true);
    if (es.ok && en.ok) expect(es.value).toBe(en.value);
  });
});
