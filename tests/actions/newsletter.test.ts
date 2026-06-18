import { describe, it, expect, beforeEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '50.60.70.80'],
      ['user-agent', HUMAN_UA],
    ]),
}));

// Resend mockeado a ok — el path de éxito envía email de aviso al equipo.
vi.mock('@/lib/resend', () => ({ sendEmail: async () => ({ ok: true, result: {} }) }));

import { submitNewsletter } from '@/actions/newsletter';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

beforeEach(() => _resetRateLimit());

describe('submitNewsletter — paridad con server.js', () => {
  it('email inválido', async () => {
    const r = await submitNewsletter(fd({ email: 'no-email' }));
    expect(r).toEqual({ ok: false, message: 'Ingresá un email válido.' });
  });

  it('honeypot → silencioso', async () => {
    const r = await submitNewsletter(fd({ email: 'a@b.com', website: 'http://x' }));
    expect(r).toEqual({ ok: true });
  });

  it('timing demasiado rápido → silencioso', async () => {
    const r = await submitNewsletter(fd({ email: 'a@b.com', _form_loaded_at: String(Date.now() - 500) }));
    expect(r).toEqual({ ok: true });
  });

  it('email con contenido spam → silencioso', async () => {
    const r = await submitNewsletter(fd({ email: 'casino@spam.com' }));
    expect(r).toEqual({ ok: true });
  });

  it('suscripción válida → ok', async () => {
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Suscripción recibida correctamente.');
    expect(r.event_id).toBeTruthy();
  });

  it('4º envío en la ventana → rate limited', async () => {
    for (let i = 0; i < 3; i++) await submitNewsletter(fd({ email: `u${i}@example.com` }));
    const r = await submitNewsletter(fd({ email: 'u4@example.com' }));
    expect(r).toEqual({
      ok: false,
      message: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.',
    });
  });
});
