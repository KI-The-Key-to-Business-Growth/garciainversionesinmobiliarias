import { describe, it, expect } from 'vitest';
import { isBotRequest, isSpamContent, isTooFast } from '@/lib/security/antibot';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

describe('isBotRequest (honeypot)', () => {
  it('detecta el campo website lleno', () => {
    expect(isBotRequest({ website: 'http://spam' })).toBe(true);
  });
  it('pasa si website está vacío', () => {
    expect(isBotRequest({ website: '' })).toBe(false);
    expect(isBotRequest({})).toBe(false);
  });
});

describe('isSpamContent', () => {
  it('detecta frases de spam', () => {
    expect(isSpamContent({ message: 'cheap viagra here' }, HUMAN_UA)).toBe(true);
  });
  it('detecta demasiados links', () => {
    expect(
      isSpamContent({ mensaje: 'http://a.com http://b.com http://c.com' }, HUMAN_UA),
    ).toBe(true);
  });
  it('detecta nombre === apellido', () => {
    expect(isSpamContent({ nombre: 'Test', apellido: 'Test' }, HUMAN_UA)).toBe(true);
  });
  it('detecta user-agent automatizado', () => {
    expect(isSpamContent({ nombre: 'Ana' }, 'curl/8.0')).toBe(true);
    expect(isSpamContent({ nombre: 'Ana' }, '')).toBe(true);
  });
  it('pasa contenido legítimo', () => {
    expect(
      isSpamContent({ nombre: 'Ana', apellido: 'García', mensaje: 'Quiero invertir' }, HUMAN_UA),
    ).toBe(false);
  });
});

describe('isTooFast (timing)', () => {
  it('bloquea envíos en menos de 3 segundos', () => {
    expect(isTooFast({ _form_loaded_at: String(Date.now() - 1000) })).toBe(true);
  });
  it('permite envíos normales (> 3s)', () => {
    expect(isTooFast({ _form_loaded_at: String(Date.now() - 5000) })).toBe(false);
  });
  it('sin timestamp no bloquea', () => {
    expect(isTooFast({})).toBe(false);
    expect(isTooFast({ _form_loaded_at: '' })).toBe(false);
  });
  it('clock skew (futuro) no bloquea', () => {
    expect(isTooFast({ _form_loaded_at: String(Date.now() + 10000) })).toBe(false);
  });
  it('sesión abandonada (> 2h) no bloquea', () => {
    expect(isTooFast({ _form_loaded_at: String(Date.now() - 8_000_000) })).toBe(false);
  });
});
