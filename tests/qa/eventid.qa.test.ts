import { describe, expect, it } from 'vitest';
import { safeEventId } from '@/lib/tracking';
import { gen, SEEDS } from './_gen';

describe('safeEventId', () => {
  it('conserva un event_id con el formato propio', () => {
    expect(safeEventId('lead_1763000000000_ab12cd34', 'lead')).toBe('lead_1763000000000_ab12cd34');
  });
  it('propiedad: siempre devuelve un valor acotado y con caracteres seguros', () => {
    for (const seed of SEEDS(200)) {
      const g = gen(seed);
      const out = safeEventId(g.bool() ? g.str(300) : g.evil(), 'lead');
      expect(out).toMatch(/^[A-Za-z0-9_.:-]{1,100}$/);
    }
  });
  it('rechaza no-strings, vacíos y largos', () => {
    for (const v of [undefined, null, 5, {}, [], '', 'x'.repeat(101), 'a b', 'a\r\nb']) {
      expect(safeEventId(v, 'lead')).toMatch(/^lead_\d+_[a-z0-9]+$/);
    }
  });
});
