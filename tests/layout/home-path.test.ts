import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isHomePathname } from '@/lib/home-path';

describe('isHomePathname', () => {
  it('reconoce la home real: «/» y la ruta canónica «/index» que entrega Vercel', () => {
    expect(isHomePathname('/')).toBe(true);
    expect(isHomePathname('/index')).toBe(true);
  });

  it('no altera ninguna otra ruta', () => {
    for (const path of [
      '/comprar',
      '/alquilar',
      '/desarrollos',
      '/desarrollos/domus-brickell-center',
      '/propiedades/237569',
      '/invertir',
      '/vender',
      '/nosotros',
      '/contacto',
      '/index.html',
      '/indexador',
      '/index/',
      '/comprar/index',
      '/desarrollos/index',
      '',
      '//',
    ]) {
      expect(isHomePathname(path), path).toBe(false);
    }
    expect(isHomePathname(null)).toBe(false);
    expect(isHomePathname(undefined)).toBe(false);
  });
});

describe('Header', () => {
  it('decide el modo flotante con isHomePathname (no con una comparación literal que pierda /index)', () => {
    const src = readFileSync('components/layout/Header.tsx', 'utf8');
    expect(src).toMatch(/isHomePathname\(pathname\)/);
    expect(src).not.toMatch(/pathname === '\/'/);
  });
});
