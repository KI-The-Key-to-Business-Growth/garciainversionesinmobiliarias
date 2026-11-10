import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '77.66.55.44'],
      ['user-agent', HUMAN_UA],
    ]),
}));

const { sendEmail, sendLeadMessage, dbInsertNewsletter, dbLogIntegration } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._a: unknown[]) => ({ ok: true }) as { ok: boolean; error?: string }),
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
import { isProductionRuntime, NON_PRODUCTION_SUBMISSION_MESSAGE } from '@/lib/runtime-env';
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
});
afterEach(() => vi.unstubAllEnvs());

describe('isProductionRuntime — usa el entorno real de ejecución (VERCEL_ENV)', () => {
  it('solo es true con VERCEL_ENV=production', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(isProductionRuntime()).toBe(true);
    for (const v of ['preview', 'development', '']) {
      vi.stubEnv('VERCEL_ENV', v);
      expect(isProductionRuntime()).toBe(false);
    }
  });

  it('NODE_ENV=production por sí solo (como en un preview) NO habilita envíos', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(isProductionRuntime()).toBe(false);
  });
});

describe.each(['preview', 'development', ''])('entorno no productivo (VERCEL_ENV="%s")', (envName) => {
  beforeEach(() => vi.stubEnv('VERCEL_ENV', envName));

  it('contacto general: simula OK, sin 2Clics, sin Resend, sin escribir en Supabase', async () => {
    const r = await submitContact(fd(CONTACT));
    expect(r.ok).toBe(true);
    expect(r.event_id).toBeTruthy();
    expect(r.message).toBe(NON_PRODUCTION_SUBMISSION_MESSAGE);
    expect(sendLeadMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(dbLogIntegration).not.toHaveBeenCalled();
  });

  it('newsletter: simula OK, sin Supabase ni Resend', async () => {
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r.ok).toBe(true);
    expect(r.message).toBe(NON_PRODUCTION_SUBMISSION_MESSAGE);
    expect(dbInsertNewsletter).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('consulta de propiedad: simula OK y no crea negocio en 2Clics', async () => {
    const r = await submitPropertyInquiry(fd(PROPERTY));
    expect(r.ok).toBe(true);
    expect(r.message).toBe(NON_PRODUCTION_SUBMISSION_MESSAGE);
    expect(sendLeadMessage).not.toHaveBeenCalled();
  });

  it('las validaciones siguen activas (un dato inválido se rechaza igual)', async () => {
    const r = await submitContact(fd({ ...CONTACT, email: 'no-es-email' }));
    expect(r).toEqual({ ok: false, message: 'Ingresá un email válido.' });
    const p = await submitPropertyInquiry(fd({ ...PROPERTY, property_app_id: '' }));
    expect(p.ok).toBe(false);
  });
});

describe('producción (VERCEL_ENV=production): comportamiento real intacto', () => {
  beforeEach(() => vi.stubEnv('VERCEL_ENV', 'production'));

  it('consulta de propiedad: envía a 2Clics con el mismo payload (ahora sin reintentos)', async () => {
    const r = await submitPropertyInquiry(fd(PROPERTY));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Consulta recibida correctamente.');
    expect(sendLeadMessage).toHaveBeenCalledOnce();
    const [region, input, options] = sendLeadMessage.mock.calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(region).toBe('AR');
    expect(options).toEqual({ retries: 0 }); // fichas: una escritura no se reintenta
    expect(input).toMatchObject({
      property_app_id: 240588,
      name: 'Ana García',
      email: 'ana@example.com',
    });
    expect(String(input.message)).toContain('Propiedad: Benavídez Village · UF 23');
  });

  it('contacto general: envía a 2Clics', async () => {
    const r = await submitContact(fd(CONTACT));
    expect(r.ok).toBe(true);
    expect(sendLeadMessage).toHaveBeenCalledOnce();
  });

  it('newsletter: guarda y avisa', async () => {
    const r = await submitNewsletter(fd({ email: 'nueva@example.com' }));
    expect(r.ok).toBe(true);
    expect(dbInsertNewsletter).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});
