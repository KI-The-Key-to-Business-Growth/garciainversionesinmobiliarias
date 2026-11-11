import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shouldAutoLoadEmbed } from '@/lib/embed-consent';

describe('contenidos incrustados — solo con acción o consentimiento de publicidad', () => {
  it('carga sola únicamente con consentimiento de publicidad', () => {
    expect(shouldAutoLoadEmbed(null)).toBe(false);
    expect(shouldAutoLoadEmbed({ marketing: false })).toBe(false);
    expect(shouldAutoLoadEmbed({ marketing: true })).toBe(true);
  });

  it('ninguna página renderiza un iframe de terceros directamente', () => {
    for (const f of ['components/properties/PropertyMap.tsx', 'components/properties/CuratedDevelopmentDetailView.tsx']) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toContain('<iframe');
      expect(src).toContain('ConsentGatedEmbed');
    }
  });

  it('el enlace «Abrir en Google Maps» sigue disponible', () => {
    expect(readFileSync('components/properties/PropertyMap.tsx', 'utf8')).toContain('Abrir en Google Maps');
  });
});
