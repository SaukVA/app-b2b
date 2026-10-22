import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

function renderBar(value: number, tone: 'ok' | 'warning' | 'danger' = 'ok') {
  render(<ProgressBar value={value} tone={tone} label="Riesgo usado" />);
  return screen.getByRole('meter', { name: 'Riesgo usado' });
}

describe('ProgressBar', () => {
  it('es un meter de 0 a 100 con su valor', () => {
    const meter = renderBar(45);
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-valuenow')).toBe('45');
  });

  it('limita el relleno a 100 pero anuncia el valor real', () => {
    const meter = renderBar(112);
    expect(meter.getAttribute('aria-valuenow')).toBe('100');
    expect(meter.getAttribute('aria-valuetext')).toBe('112 %');
  });

  it('limita un valor negativo a 0', () => {
    expect(renderBar(-5).getAttribute('aria-valuenow')).toBe('0');
  });

  it.each(['ok', 'warning', 'danger'] as const)('refleja el tono %s', (tone) => {
    expect(renderBar(50, tone).getAttribute('data-tone')).toBe(tone);
  });
});
