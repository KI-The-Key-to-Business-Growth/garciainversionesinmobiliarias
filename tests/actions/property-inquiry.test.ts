import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '55.44.33.22'],
      ['user-agent', HUMAN_UA],
    ]),
}));

const { sendEmail, sendLeadMessage, dbLogIntegration } = vi.hoisted(() => ({
  sendEmail: vi.fn(
    async (_a: { to: string; subject: string; html: string }) =>
      ({ ok: true }) as { ok: boolean; error?: string },
  ),
  sendLeadMessage: vi.fn(async (..._a: unknown[]) => ({ status: 'success' }) as { status?: string }),
  dbLogIntegration: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/resend', () => ({ sendEmail }));
vi.mock('@/lib/db/logs', () => ({ dbLogIntegration }));
vi.mock('@/lib/2clics/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/2clics/client')>()),
  twoclicsClient: { sendLeadMessage },
}));

import { submitPropertyInquiry } from '@/actions/property-inquiry';
import { submitContact } from '@/actions/contact';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

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
const CONTACT = {
  nombre: 'Ana',
  apellido: 'García',
  email: 'ana@example.com',
  telefono: '+54 9 11 6724-0353',
  motivo: 'Inversión inmobiliaria',
  mensaje: 'Quiero invertir',
};
const SECURITY_MSG = 'Verificación de seguridad fallida. Recargá la página e intentá nuevamente.';
const REVIEW_MESSAGE = 'Recibimos tu consulta y la vamos a revisar. Te contactaremos a la brevedad.';

const originalFetch = global.fetch;

beforeEach(() => {
  _resetRateLimit();
  for (const m of [sendEmail, sendLeadMessage, dbLogIntegration]) m.mockClear();
  sendEmail.mockResolvedValue({ ok: true });
  sendLeadMessage.mockResolvedValue({ status: 'success' });
  delete process.env.TURNSTILE_SECRET_KEY;
});
afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.TURNSTILE_SECRET_KEY;
});

function mockSiteverify(success: boolean) {
  const fn = vi.fn(async () => ({ json: async () => ({ success }) }));
  global.fetch = fn as never;
  return fn;
}

describe('consulta de ficha — Turnstile verificado en el servidor', () => {
  it('sin token con secret configurada → rechaza y NO llama a 2Clics', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const r = await submitPropertyInquiry(fd(PROPERTY));
    expect(r).toEqual({ ok: false, message: SECURITY_MSG });
    expect(sendLeadMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('token rechazado por Siteverify → no crea negocio', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    mockSiteverify(false);
    const r = await submitPropertyInquiry(fd({ ...PROPERTY, 'cf-turnstile-response': 'malo' }));
    expect(r).toEqual({ ok: false, message: SECURITY_MSG });
    expect(sendLeadMessage).not.toHaveBeenCalled();
  });

  it('token válido → envía a 2Clics', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const siteverify = mockSiteverify(true);
    const r = await submitPropertyInquiry(fd({ ...PROPERTY, 'cf-turnstile-response': 'ok' }));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Consulta recibida correctamente.');
    expect(siteverify).toHaveBeenCalledOnce();
    expect(sendLeadMessage).toHaveBeenCalledOnce();
  });
});

describe('contacto general — Turnstile verificado en el servidor', () => {
  it('sin token con secret → rechaza, sin 2Clics ni email', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const r = await submitContact(fd(CONTACT));
    expect(r).toEqual({ ok: false, message: SECURITY_MSG });
    expect(sendLeadMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('token rechazado → no crea negocio', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    mockSiteverify(false);
    const r = await submitContact(fd({ ...CONTACT, 'cf-turnstile-response': 'malo' }));
    expect(r).toEqual({ ok: false, message: SECURITY_MSG });
    expect(sendLeadMessage).not.toHaveBeenCalled();
  });

  it('token válido → envía a 2Clics', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    mockSiteverify(true);
    const r = await submitContact(fd({ ...CONTACT, 'cf-turnstile-response': 'ok' }));
    expect(r.ok).toBe(true);
    expect(sendLeadMessage).toHaveBeenCalledOnce();
  });
});
