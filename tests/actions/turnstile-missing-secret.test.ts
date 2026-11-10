import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '88.77.66.55'],
      ['user-agent', HUMAN_UA],
    ]),
}));

const { sendEmail, sendLeadMessage, dbInsertNewsletter, dbLogIntegration } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._a: unknown[]) => ({ ok: true }) as { ok: boolean }),
  sendLeadMessage: vi.fn(async (..._a: unknown[]) => ({ status: 'success' })),
  dbInsertNewsletter: vi.fn(async (..._a: unknown[]) => ({ isNew: true })),
  dbLogIntegration: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/resend', () => ({ sendEmail }));
vi.mock('@/lib/db/newsletter', () => ({ dbInsertNewsletter }));
vi.mock('@/lib/db/logs', () => ({ dbLogIntegration }));
vi.mock('@/lib/2clics/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/2clics/client')>()),
  twoclicsClient: { sendLeadMessage },
}));

import { submitContact } from '@/actions/contact';
import { submitNewsletter } from '@/actions/newsletter';
import { submitPropertyInquiry } from '@/actions/property-inquiry';
import { TURNSTILE_UNAVAILABLE_MESSAGE, verifyTurnstileResult } from '@/lib/security/turnstile';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

const CONTACT = {
  nombre: 'Ana',
  apellido: 'García',
  email: 'ana@example.com',
  telefono: '+54 9 11 6724-0353',
  motivo: 'Inversión inmobiliaria',
  mensaje: 'Quiero invertir',
};
const PROPERTY = {
  property_app_id: '240588',
  property_title: 'Benavídez Village · UF 23',
  property_region: 'AR',
  name: 'Ana García',
  email: 'ana@example.com',
  phone: '+54 9 11 6724-0353',
  message: 'Quiero visitar',
  page_url: 'https://www.garciainversionesinmobiliarias.com.ar/propiedades/240588',
};

beforeEach(() => {
  _resetRateLimit();
  for (const m of [sendEmail, sendLeadMessage, dbInsertNewsletter, dbLogIntegration]) m.mockClear();
  delete process.env.TURNSTILE_SECRET_KEY;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('producción de Vercel SIN TURNSTILE_SECRET_KEY → nunca se omite la validación', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
  });

  it('verifyTurnstileResult rechaza aunque llegue un token', async () => {
    expect(await verifyTurnstileResult('token', '1.1.1.1')).toBe('unavailable');
    expect(await verifyTurnstileResult('', '1.1.1.1')).toBe('unavailable');
  });

  it('contacto: no envía nada', async () => {
    const r = await submitContact(fd({ ...CONTACT, 'cf-turnstile-response': 'token' }));
    expect(r).toEqual({ ok: false, message: TURNSTILE_UNAVAILABLE_MESSAGE });
    expect(sendLeadMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('newsletter: no guarda ni avisa', async () => {
    const r = await submitNewsletter(fd({ email: 'nueva@example.com', 'cf-turnstile-response': 'token' }));
    expect(r).toEqual({ ok: false, message: TURNSTILE_UNAVAILABLE_MESSAGE });
    expect(dbInsertNewsletter).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('ficha: no crea negocio', async () => {
    const r = await submitPropertyInquiry(fd({ ...PROPERTY, 'cf-turnstile-response': 'token' }));
    expect(r).toEqual({ ok: false, message: TURNSTILE_UNAVAILABLE_MESSAGE });
    expect(sendLeadMessage).not.toHaveBeenCalled();
  });
});

describe('Preview y local: comportamiento sin cambios', () => {
  it('Preview de Vercel sin clave: se saltea la validación (los envíos están simulados)', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await verifyTurnstileResult('', '1.1.1.1')).toBe('ok');
    const r = await submitContact(fd(CONTACT));
    expect(r.ok).toBe(true);
    expect(sendLeadMessage).not.toHaveBeenCalled(); // simulado: no se creó negocio
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('local (sin VERCEL) sin clave: se saltea, aunque VERCEL_ENV=production', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(await verifyTurnstileResult('', '1.1.1.1')).toBe('ok');
  });
});

describe('con clave configurada el comportamiento es el mismo en cualquier entorno', () => {
  it('producción de Vercel con clave y sin token → invalid', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstileResult('', '1.1.1.1')).toBe('invalid');
    delete process.env.TURNSTILE_SECRET_KEY;
  });
});
