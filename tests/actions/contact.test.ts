import { describe, it, expect, beforeEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '10.20.30.40'],
      ['user-agent', HUMAN_UA],
    ]),
}));

// Resend mockeado a ok (sólo se usa en el path de fallo de CRM).
vi.mock('@/lib/resend', () => ({ sendEmail: async () => ({ ok: true, result: {} }) }));

import { submitContact } from '@/actions/contact';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

const VALID = {
  nombre: 'Ana',
  apellido: 'García',
  email: 'ana@example.com',
  telefono: '+54 9 11 6724-0353',
  motivo: 'Inversión inmobiliaria',
  mensaje: 'Quiero invertir en Nordelta',
};

beforeEach(() => {
  _resetRateLimit();
  global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as never;
});

describe('submitContact — paridad de validaciones con server.js', () => {
  it('nombre requerido', async () => {
    const r = await submitContact(fd({ ...VALID, nombre: '', apellido: '' }));
    expect(r).toEqual({ ok: false, message: 'El nombre es requerido.' });
  });

  it('teléfono requerido', async () => {
    const r = await submitContact(fd({ ...VALID, telefono: '' }));
    expect(r).toEqual({ ok: false, message: 'El teléfono es requerido.' });
  });

  it('email inválido', async () => {
    const r = await submitContact(fd({ ...VALID, email: 'no-es-email' }));
    expect(r).toEqual({ ok: false, message: 'Ingresá un email válido.' });
  });

  it('nombre demasiado largo', async () => {
    const r = await submitContact(fd({ ...VALID, nombre: 'x'.repeat(130), apellido: '' }));
    expect(r).toEqual({ ok: false, message: 'El nombre es demasiado largo.' });
  });

  it('mensaje demasiado largo', async () => {
    const r = await submitContact(fd({ ...VALID, mensaje: 'x'.repeat(2001) }));
    expect(r).toEqual({ ok: false, message: 'El mensaje no puede superar los 2000 caracteres.' });
  });

  it('teléfono con formato inválido', async () => {
    const r = await submitContact(fd({ ...VALID, telefono: 'abcdef' }));
    expect(r).toEqual({
      ok: false,
      message: 'Ingresá un teléfono válido (solo números, espacios, +, -, ()).',
    });
  });

  it('motivo fuera de la lista blanca', async () => {
    const r = await submitContact(fd({ ...VALID, motivo: 'Hackeo' }));
    expect(r).toEqual({ ok: false, message: 'Motivo de consulta no válido.' });
  });
});

describe('submitContact — anti-bot silencioso (devuelve {ok:true})', () => {
  it('honeypot website lleno', async () => {
    const r = await submitContact(fd({ ...VALID, website: 'http://spam' }));
    expect(r).toEqual({ ok: true });
  });

  it('timing demasiado rápido (< 3s)', async () => {
    const r = await submitContact(fd({ ...VALID, _form_loaded_at: String(Date.now() - 500) }));
    expect(r).toEqual({ ok: true });
  });

  it('contenido spam', async () => {
    const r = await submitContact(fd({ ...VALID, mensaje: 'cheap viagra free traffic' }));
    expect(r).toEqual({ ok: true });
  });
});

describe('submitContact — éxito y rate limit', () => {
  it('lead válido → enviado a 2Clics', async () => {
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Consulta recibida correctamente.');
    expect(r.event_id).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledOnce(); // envío al CRM
  });

  it('6º envío en la ventana → rate limited', async () => {
    for (let i = 0; i < 5; i++) await submitContact(fd(VALID));
    const r = await submitContact(fd(VALID));
    expect(r).toEqual({
      ok: false,
      message: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.',
    });
  });
});
