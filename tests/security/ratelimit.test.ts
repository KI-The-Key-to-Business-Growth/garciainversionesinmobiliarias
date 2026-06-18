import { describe, it, expect, beforeEach } from 'vitest';
import { checkRate, _resetRateLimit } from '@/lib/security/ratelimit';

describe('checkRate', () => {
  beforeEach(() => _resetRateLimit());

  it('permite hasta max y bloquea el siguiente', () => {
    const ip = '1.2.3.4';
    for (let i = 0; i < 5; i++) expect(checkRate(ip, 'contact', 5, 60_000)).toBe(true);
    expect(checkRate(ip, 'contact', 5, 60_000)).toBe(false); // 6º bloqueado
  });

  it('aísla por IP', () => {
    expect(checkRate('a', 'contact', 1, 60_000)).toBe(true);
    expect(checkRate('a', 'contact', 1, 60_000)).toBe(false);
    expect(checkRate('b', 'contact', 1, 60_000)).toBe(true); // otra IP, contador propio
  });

  it('aísla por key', () => {
    expect(checkRate('a', 'contact', 1, 60_000)).toBe(true);
    expect(checkRate('a', 'newsletter', 1, 60_000)).toBe(true); // distinta key
  });
});
