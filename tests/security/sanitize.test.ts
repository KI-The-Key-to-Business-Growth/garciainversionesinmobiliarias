import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  isValidEmail,
  isValidPhone,
  MAX_LENGTHS,
  MOTIVOS_PERMITIDOS,
} from '@/lib/security/sanitize';

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos (XSS)', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml("O'Brien & co")).toBe('O&#039;Brien &amp; co');
  });
  it('maneja null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('acepta emails válidos', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail(' fabiana@garcia.com.ar ')).toBe(true);
  });
  it('rechaza inválidos', () => {
    expect(isValidEmail('no-arroba')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('acepta formatos comunes', () => {
    expect(isValidPhone('+54 9 11 6724-0353')).toBe(true);
    expect(isValidPhone('(011) 4567-8900')).toBe(true);
  });
  it('rechaza letras o muy cortos', () => {
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
  });
});

describe('constantes de validación', () => {
  it('MAX_LENGTHS coincide con la auditoría', () => {
    expect(MAX_LENGTHS).toMatchObject({
      name: 120,
      phone: 30,
      email: 254,
      message: 2000,
      motivo: 100,
    });
  });
  it('MOTIVOS_PERMITIDOS contiene la lista blanca exacta', () => {
    expect(MOTIVOS_PERMITIDOS.has('Inversión inmobiliaria')).toBe(true);
    expect(MOTIVOS_PERMITIDOS.has('')).toBe(true);
    expect(MOTIVOS_PERMITIDOS.has('Hackeo')).toBe(false);
  });
});
