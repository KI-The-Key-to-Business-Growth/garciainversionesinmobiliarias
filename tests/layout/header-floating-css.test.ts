import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');

describe('header flotante de la home (contraste AA)', () => {
  it('tiene un velo con la marca (#071628) que se desvanece al desplazarse', () => {
    const veil = css.match(/\.site-header--floating::before\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(veil).toMatch(/linear-gradient/);
    expect(veil).toMatch(/rgba\(7,\s*22,\s*40,\s*0\.8\)/); // más fuerte arriba, donde está el menú
    expect(veil).toMatch(/pointer-events:\s*none/);
    expect(veil).toMatch(/z-index:\s*-1/);
    expect(veil).toMatch(/transition:\s*opacity/);
    expect(css).toMatch(/\.site-header--floating\.is-scrolled::before\s*\{\s*opacity:\s*0;\s*\}/);
  });

  it('solo aplica al header flotante: ningún otro estado del header usa pseudo-elementos ::before', () => {
    const selectors = [...css.matchAll(/(\.site-header[\w.-]*)::before/g)].map((m) => m[1]);
    expect([...new Set(selectors)].sort()).toEqual(['.site-header--floating', '.site-header--floating.is-scrolled']);
  });
});
