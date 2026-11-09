import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '50.60.70.80'],
      ['user-agent', HUMAN_UA],
    ]),
}));

const { sendEmail, dbInsertNewsletter } = vi.hoisted(() => ({
  sendEmail: vi.fn(
    async (..._a: unknown[]) => ({ ok: true, result: {} }) as { ok: boolean; error?: string },
  ),
  dbInsertNewsletter: vi.fn(async (..._a: unknown[]) => ({ isNew: true })),
}));
vi.mock('@/lib/resend', () => ({ sendEmail }));
vi.mock('@/lib/db/newsletter', () => ({ dbInsertNewsletter }));

import { submitNewsletter } from '@/actions/newsletter';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

const originalFetch = global.fetch;

beforeEach(() => {
  _resetRateLimit();
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ ok: true });
  dbInsertNewsletter.mockReset();
  dbInsertNewsletter.mockResolvedValue({ isNew: true });
  delete process.env.TURNSTILE_SECRET_KEY;
});
afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe('submitNewsletter — validaciones y anti-bot', () => {
  it('email inválido', async () => {
    const r = await submitNewsletter(fd({ email: 'no-email' }));
    expect(r).toEqual({ ok: false, message: 'Ingresá un email válido.' });
  });

  it('honeypot → silencioso, sin guardar', async () => {
    const r = await submitNewsletter(fd({ email: 'a@b.com', website: 'http://x' }));
    expect(r).toEqual({ ok: true });
    expect(dbInsertNewsletter).not.toHaveBeenCalled();
  });

  it('timing demasiado rápido → silencioso', async () => {
    const r = await submitNewsletter(
      fd({ email: 'a@b.com', _form_loaded_at: String(Date.now() - 500) }),
    );
    expect(r).toEqual({ ok: true });
  });

  it('email con contenido spam → silencioso', async () => {
    const r = await submitNewsletter(fd({ email: 'casino@spam.com' }));
    expect(r).toEqual({ ok: true });
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

describe('submitNewsletter — Turnstile', () => {
  const SECURITY_MSG =
    'Verificación de seguridad fallida. Recargá la página e intentá nuevamente.';

  it('sin token con secret configurada → rechaza ANTES de tocar Supabase', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r).toEqual({ ok: false, message: SECURITY_MSG });
    expect(dbInsertNewsletter).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('token válido (Siteverify success) → guarda y notifica', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    global.fetch = vi.fn(async () => ({ json: async () => ({ success: true }) })) as never;
    const r = await submitNewsletter(
      fd({ email: 'nueva@example.com', 'cf-turnstile-response': 'tok' }),
    );
    expect(r.ok).toBe(true);
    expect(dbInsertNewsletter).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('token rechazado por Siteverify → no guarda', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    global.fetch = vi.fn(async () => ({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    })) as never;
    const r = await submitNewsletter(
      fd({ email: 'nueva@example.com', 'cf-turnstile-response': 'vencido' }),
    );
    expect(r).toEqual({ ok: false, message: SECURITY_MSG });
    expect(dbInsertNewsletter).not.toHaveBeenCalled();
  });
});

describe('submitNewsletter — persistencia y notificación', () => {
  it('suscripción nueva → ok y aviso interno', async () => {
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Suscripción recibida correctamente.');
    expect(r.event_id).toBeTruthy();
    expect(dbInsertNewsletter).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it('suscriptor duplicado → ok, sin segundo aviso', async () => {
    dbInsertNewsletter.mockResolvedValueOnce({ isNew: false });
    const r = await submitNewsletter(fd({ email: 'ya@example.com' }));
    expect(r.ok).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('error de Supabase → error al usuario, nunca éxito, sin aviso', async () => {
    dbInsertNewsletter.mockRejectedValueOnce(new Error('connection timeout'));
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r.ok).toBe(false);
    expect(r.message).toContain('No pudimos procesar la suscripción');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('falla solo el aviso interno: la suscripción ya está registrada → ok', async () => {
    sendEmail.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r.ok).toBe(true);
    expect(dbInsertNewsletter).toHaveBeenCalledOnce();
  });
});
