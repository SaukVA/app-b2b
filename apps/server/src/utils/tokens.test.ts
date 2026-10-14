import { ACCESS_TOKEN_TTL_SEC } from '@app/shared';
import { setTestEnv } from './testDb';
import { createRefreshToken, hashToken, signAccessToken, verifyAccessToken } from './tokens';

setTestEnv();

const payload = { sub: '64b000000000000000000001', sid: '64b000000000000000000002', role: 'Comercial' as const };

describe('signAccessToken / verifyAccessToken', () => {
  afterEach(() => jest.useRealTimers());

  it('firma y verifica sub, sid y role', () => {
    expect(verifyAccessToken(signAccessToken(payload))).toEqual(payload);
  });

  it('rechaza un token manipulado', () => {
    const token = signAccessToken(payload);
    expect(verifyAccessToken(`${token}x`)).toBeNull();
  });

  it('rechaza un token caducado (15 min)', () => {
    jest.useFakeTimers({ now: new Date('2026-10-14T10:00:00Z') });
    const token = signAccessToken(payload);
    jest.setSystemTime(Date.now() + (ACCESS_TOKEN_TTL_SEC + 1) * 1000);
    expect(verifyAccessToken(token)).toBeNull();
  });
});

describe('createRefreshToken / hashToken', () => {
  it('genera tokens aleatorios distintos', () => {
    expect(createRefreshToken()).not.toBe(createRefreshToken());
    expect(createRefreshToken().length).toBeGreaterThanOrEqual(43);
  });

  it('hashToken es SHA-256 determinista en hexadecimal', () => {
    const hash = hashToken('abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abc')).toBe(hash);
  });
});
