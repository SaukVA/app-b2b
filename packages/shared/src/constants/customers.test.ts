import {
  CUSTOMER_RISK_THRESHOLDS,
  CUSTOMER_SEARCH_MAX_LENGTH,
  CUSTOMERS_PAGE_SIZE,
  customerRiskLevel,
  customerRiskUsed,
} from './customers';

describe('customerRiskUsed (FR-016)', () => {
  it.each([
    [1000, null],
    [1000, 0],
  ] as const)('saldo %d con riesgo máximo %p → null (sin límite)', (balance, maxRisk) => {
    expect(customerRiskUsed(balance, maxRisk)).toBeNull();
  });

  it.each([
    [0, 5000, 0],
    [-200, 5000, 0],
    [2500, 5000, 50],
    [1234.56, 5000, 25],
    [5600, 5000, 112],
  ] as const)('saldo %d con riesgo máximo %d → %i %', (balance, maxRisk, expected) => {
    expect(customerRiskUsed(balance, maxRisk)).toBe(expected);
  });
});

describe('customerRiskLevel', () => {
  it.each([
    [0, 'low'],
    [49, 'low'],
    [50, 'medium'],
    [79, 'medium'],
    [80, 'high'],
    [112, 'high'],
  ] as const)('%i % → %s', (riskUsed, expected) => {
    expect(customerRiskLevel(riskUsed)).toBe(expected);
  });
});

describe('constantes de clientes', () => {
  it('fijan el máximo de la búsqueda, el tamaño de página y los umbrales del semáforo', () => {
    expect(CUSTOMER_SEARCH_MAX_LENGTH).toBe(100);
    expect(CUSTOMERS_PAGE_SIZE).toBe(10);
    expect(CUSTOMER_RISK_THRESHOLDS).toEqual({ medium: 50, high: 80 });
  });
});
