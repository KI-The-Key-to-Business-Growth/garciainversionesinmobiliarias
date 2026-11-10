import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '66.55.44.33'],
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
import {
  TURNSTILE_INVALID_MESSAGE,
  TURNSTILE_UNAVAILABLE_MESSAGE,
  verifyTurnstileResult,
} from '@/lib/security/turnstile';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

const TOKEN = { 'cf-turnstile-response': 'token-real' };
const CONTACT = {
  nombre: 'Ana',
  apellido: 'García',
  email: 'ana@example.com',
  telefono: '+54 9 11 6724-0353',
  motivo: 'Inversión inmobiliaria',
  mensaje: 'Quiero invertir',
  ...TOKEN,
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
  ...TOKEN,
};
const NEWSLETTER = { email: 'nueva@example.com', ...TOKEN };

const originalFetch = global.fetch;

beforeEach(() => {
  _resetRateLimit();
  for (const m of [sendEmail, sendLeadMessage, dbInsertNewsletter, dbLogIntegration]) m.mockClear();
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  global.fetch = originalFetch;
  delete process.env.TURNSTILE_SECRET_KEY;
  vi.restoreAllMocks();
});

const failures: Array<[string, () => void]> = [
  ['error de red', () => (global.fetch = vi.fn(async () => { throw new TypeError('fetch failed'); }) as never)],
  ['timeout / abortado', () => (global.fetch = vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); }) as never)],
  ['Cloudflare responde 503', () => (global.fetch = vi.fn(async () => ({ status: 503, json: async () => ({}) })) as never)],
  ['respuesta ilegible (no JSON)', () => (global.fetch = vi.fn(async () => ({ status: 200, json: async () => { throw new SyntaxError('bad json'); } })) as never)],
  ['internal-error de Cloudflare', () => (global.fetch = vi.fn(async () => ({ status: 200, json: async () => ({ success: false, 'error-codes': ['internal-error'] }) })) as never)],
];

describe.each(failures)('Cloudflare no disponible (%s) → fail-closed', (_name, setup) => {
  beforeEach(() => {
    setup();
  });

  it('verifyTurnstileResult devuelve unavailable', async () => {
    expect(await verifyTurnstileResult('token-real', '1.1.1.1')).toBe('unavailable');
  });

  it('contacto: rechaza con mensaje claro y no envía nada', async () => {
    const r = await submitContact(fd(CONTACT));
    expect(r).toEqual({ ok: false, message: TURNSTILE_UNAVAILABLE_MESSAGE });
    expect(sendLeadMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(dbLogIntegration).not.toHaveBeenCalled();
  });

  it('newsletter: rechaza y no guarda ni avisa', async () => {
    const r = await submitNewsletter(fd(NEWSLETTER));
    expect(r).toEqual({ ok: false, message: TURNSTILE_UNAVAILABLE_MESSAGE });
    expect(dbInsertNewsletter).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('ficha: rechaza y no crea negocio', async () => {
    const r = await submitPropertyInquiry(fd(PROPERTY));
    expect(r).toEqual({ ok: false, message: TURNSTILE_UNAVAILABLE_MESSAGE });
    expect(sendLeadMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('veredictos de Cloudflare', () => {
  it('token inválido → invalid (mensaje distinto al de "no disponible")', async () => {
    global.fetch = vi.fn(async () => ({
      status: 200,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    })) as never;
    expect(await verifyTurnstileResult('x', '')).toBe('invalid');
    const r = await submitContact(fd(CONTACT));
    expect(r).toEqual({ ok: false, message: TURNSTILE_INVALID_MESSAGE });
    expect(TURNSTILE_INVALID_MESSAGE).not.toBe(TURNSTILE_UNAVAILABLE_MESSAGE);
  });

  it('token vacío → invalid sin consultar a Cloudflare', async () => {
    const f = vi.fn();
    global.fetch = f as never;
    expect(await verifyTurnstileResult('', '')).toBe('invalid');
    expect(f).not.toHaveBeenCalled();
  });

  it('token válido → ok y el flujo continúa', async () => {
    global.fetch = vi.fn(async () => ({ status: 200, json: async () => ({ success: true }) })) as never;
    expect(await verifyTurnstileResult('x', '')).toBe('ok');
    const r = await submitContact(fd(CONTACT));
    expect(r.ok).toBe(true);
    expect(sendLeadMessage).toHaveBeenCalledOnce();
  });
});
