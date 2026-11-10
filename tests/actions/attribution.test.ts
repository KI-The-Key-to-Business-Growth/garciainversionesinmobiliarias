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

const { sendEmail, sendLeadMessage, dbInsertNewsletter, dbLogIntegration, recordLeadAttribution } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (..._a: unknown[]) => ({ ok: true }) as { ok: boolean }),
  sendLeadMessage: vi.fn(async (..._a: unknown[]) => ({ status: 'success' })),
  dbInsertNewsletter: vi.fn(async (..._a: unknown[]) => ({ isNew: true })),
  dbLogIntegration: vi.fn(async (..._a: unknown[]) => undefined),
  recordLeadAttribution: vi.fn(async (..._a: unknown[]) => undefined),
}));
vi.mock('@/lib/resend', () => ({ sendEmail }));
vi.mock('@/lib/db/newsletter', () => ({ dbInsertNewsletter }));
vi.mock('@/lib/db/logs', () => ({ dbLogIntegration }));
vi.mock('@/lib/db/attribution', () => ({ recordLeadAttribution }));
vi.mock('@/lib/2clics/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/2clics/client')>()),
  twoclicsClient: { sendLeadMessage },
}));

import { submitContact } from '@/actions/contact';
import { submitNewsletter } from '@/actions/newsletter';
import { submitPropertyInquiry } from '@/actions/property-inquiry';
import { _resetRateLimit } from '@/lib/security/ratelimit';
import { buildAttributionNote, buildLeadAttributionRow, resolveAttributionAsset } from '@/lib/attribution-server';
import { parseSubmitAttribution } from '@/lib/attribution';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

type Touch = Record<string, string | number>;
function attr(last: Touch, opts: { analytics?: boolean; marketing?: boolean; first?: Touch } = {}): string {
  return JSON.stringify({
    v: 1,
    consent: { analytics: opts.analytics ?? true, marketing: opts.marketing ?? true },
    session_id: 's_abc123_def456',
    first: { landing_page: '/', ts: 1, ...(opts.first ?? {}) },
    last: { landing_page: '/', ts: 2, ...last },
    fbp: 'fb.1.100.200',
  });
}

const CONTACT = {
  nombre: 'Ana',
  apellido: 'García',
  email: 'ana.secreta@example.com',
  telefono: '+54 9 11 6724-0353',
  motivo: 'Inversión inmobiliaria',
  mensaje: 'Quiero invertir',
  page_location: 'https://www.garciainversionesinmobiliarias.com.ar/contacto',
  event_id: 'form_submit_test_1',
};
const DOMUS = {
  property_app_id: '236682',
  property_title: 'Domus Brickell Center',
  property_region: 'US',
  name: 'Ana García',
  email: 'ana.secreta@example.com',
  phone: '+54 9 11 6724-0353',
  message: 'Quiero visitar',
  page_url: 'https://www.garciainversionesinmobiliarias.com.ar/desarrollos/domus-brickell-center',
};
const BENAVIDEZ = {
  ...DOMUS,
  property_app_id: '240588',
  property_title: 'Benavídez Village · UF 23',
  property_region: 'AR',
  page_url: 'https://www.garciainversionesinmobiliarias.com.ar/propiedades/240588',
};
const META_LAST = {
  utm_source: 'meta',
  utm_medium: 'paid_social',
  utm_campaign: 'Campaña Verano',
  campaign_id: '120001',
  adset_id: '120002',
  ad_id: '120003',
  fbclid: 'IwAR123',
  landing_page: '/desarrollos/domus-brickell-center',
};

function lastRow(): ReturnType<typeof buildLeadAttributionRow> {
  const calls = recordLeadAttribution.mock.calls;
  return calls[calls.length - 1][0] as ReturnType<typeof buildLeadAttributionRow>;
}
function leadMessage(): string {
  const calls = sendLeadMessage.mock.calls as unknown as Array<[unknown, { message: string }]>;
  return calls[calls.length - 1][1].message;
}

beforeEach(() => {
  _resetRateLimit();
  for (const m of [sendEmail, sendLeadMessage, dbInsertNewsletter, dbLogIntegration, recordLeadAttribution]) m.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('Contacto general — atribución', () => {
  it('con consentimiento: el mensaje a 2Clics lleva una línea de campaña con IDs reales y el desarrollo de la landing', async () => {
    const r = await submitContact(fd({ ...CONTACT, attribution: attr(META_LAST, { first: { utm_source: 'google' } }) }));
    expect(r.ok).toBe(true);
    const msg = leadMessage();
    expect(msg).toContain('Atribución web: meta / paid_social');
    expect(msg).toContain('campaña: Campaña Verano (id 120001)');
    expect(msg).toContain('conjunto id 120002');
    expect(msg).toContain('anuncio id 120003');
    expect(msg).toContain('desarrollo: domus-brickell-center');
    expect(msg).toContain(`Ref: ${r.event_id}`);
    // sin click ids ni cookies de Meta en el CRM
    expect(msg).not.toContain('IwAR123');
    expect(msg).not.toContain('fb.1.100.200');
  });

  it('registra la fila de atribución (sin datos personales) con el mismo event_id que el CRM', async () => {
    const r = await submitContact(fd({ ...CONTACT, attribution: attr(META_LAST) }));
    const row = lastRow();
    expect(row).toMatchObject({
      event_id: r.event_id,
      lead_type: 'consulta_general',
      crm_status: 'sent',
      development_slug: 'domus-brickell-center',
      property_app_id: null,
      campaign_id: '120001',
      adset_id: '120002',
      ad_id: '120003',
      utm_campaign: 'Campaña Verano',
      fbclid: 'IwAR123',
      fbp: 'fb.1.100.200',
      consent_analytics: true,
      consent_marketing: true,
      session_id: 's_abc123_def456',
    });
    const json = JSON.stringify(row);
    for (const pii of ['ana.secreta', 'García', '6724', 'Quiero invertir']) expect(json).not.toContain(pii);
  });

  it('sin atribución (sin consentimiento): el mensaje no cambia y la fila no guarda nada de campaña', async () => {
    const r = await submitContact(fd(CONTACT));
    expect(r.ok).toBe(true);
    expect(leadMessage()).not.toContain('Atribución web');
    expect(lastRow()).toMatchObject({
      consent_analytics: false,
      consent_marketing: false,
      session_id: null,
      utm_source: null,
      campaign_id: null,
      fbclid: null,
      first_touch: null,
      last_touch: null,
    });
  });

  it('payload manipulado (sin consentimiento declarado o roto) se ignora', async () => {
    for (const bad of ['{', JSON.stringify({ v: 1, consent: { analytics: false, marketing: false }, first: { landing_page: '/' }, last: { landing_page: '/', utm_source: 'meta' } })]) {
      recordLeadAttribution.mockClear();
      await submitContact(fd({ ...CONTACT, attribution: bad }));
      expect(leadMessage()).not.toContain('Atribución web');
      expect(lastRow().utm_source).toBeNull();
    }
  });

  it('sin consentimiento de marketing el servidor descarta click ids y cookies de Meta aunque el cliente los envíe', async () => {
    await submitContact(fd({ ...CONTACT, attribution: attr(META_LAST, { marketing: false }) }));
    const row = lastRow();
    expect(row.fbclid).toBeNull();
    expect(row.fbp).toBeNull();
    expect(row.campaign_id).toBe('120001'); // IDs de campaña sí (analytics)
  });

  it('el estado del CRM queda reflejado: fallo de 2Clics con respaldo por email también registra atribución', async () => {
    sendLeadMessage.mockRejectedValueOnce(new Error('boom'));
    await submitContact(fd({ ...CONTACT, attribution: attr(META_LAST) }));
    expect(lastRow().crm_status).toBe('failed');
  });
});

describe('Ficha — el activo se identifica por property_app_id real, no por el nombre de la campaña', () => {
  it('Domus Brickell Center (236682) → domus-brickell-center, aunque la campaña se llame distinto', async () => {
    const r = await submitPropertyInquiry(
      fd({ ...DOMUS, attribution: attr({ ...META_LAST, utm_campaign: 'Benavidez Village Lanzamiento' }) }),
    );
    expect(r.ok).toBe(true);
    expect(r).toMatchObject({ property_id: 236682, development_slug: 'domus-brickell-center' });
    expect(lastRow()).toMatchObject({ property_app_id: 236682, development_slug: 'domus-brickell-center', lead_type: 'consulta_propiedad' });
    expect(leadMessage()).toContain('desarrollo: domus-brickell-center');
  });

  it('Benavídez Village (unidad 240588) → benavidez-village', async () => {
    const r = await submitPropertyInquiry(fd({ ...BENAVIDEZ, attribution: attr({ ...META_LAST, landing_page: '/desarrollos/benavidez-village' }) }));
    expect(r).toMatchObject({ property_id: 240588, development_slug: 'benavidez-village' });
    expect(lastRow()).toMatchObject({ property_app_id: 240588, development_slug: 'benavidez-village' });
  });

  it('una propiedad que no pertenece a un desarrollo curado no inventa desarrollo', async () => {
    const r = await submitPropertyInquiry(fd({ ...BENAVIDEZ, property_app_id: '999999', attribution: attr(META_LAST) }));
    expect(r.ok).toBe(true);
    expect(lastRow()).toMatchObject({ property_app_id: 999999, development_slug: null });
  });

  it('sin atribución sigue enviando exactamente igual que antes (message + Ref)', async () => {
    const r = await submitPropertyInquiry(fd(BENAVIDEZ));
    expect(r.ok).toBe(true);
    expect(leadMessage()).not.toContain('Atribución web');
    expect(leadMessage()).toMatch(/\n\nRef: lead_/);
    expect(lastRow()).toMatchObject({ development_slug: 'benavidez-village', consent_analytics: false });
  });
});

describe('Newsletter — circuito separado', () => {
  it('toma los UTM del último toque y registra la atribución sin pasar por 2Clics', async () => {
    const r = await submitNewsletter(fd({ email: 'nuevo@example.com', page_location: 'https://www.garciainversionesinmobiliarias.com.ar/', attribution: attr(META_LAST) }));
    expect(r.ok).toBe(true);
    expect(dbInsertNewsletter).toHaveBeenCalledWith(
      expect.objectContaining({ utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'Campaña Verano' }),
    );
    expect(lastRow()).toMatchObject({ lead_type: 'newsletter', crm_status: 'not_applicable' });
    expect(sendLeadMessage).not.toHaveBeenCalled();
  });
});

describe('lib/attribution-server', () => {
  it('resolveAttributionAsset: prioridad propiedad explícita > página > landing; slug ficticio u oculto no resuelve', () => {
    expect(resolveAttributionAsset({ propertyAppId: 237474 })).toEqual({ property_id: 237474, development_slug: 'benavidez-village' });
    expect(resolveAttributionAsset({ pageLocation: 'https://x.test/desarrollos/benavidez-village' })).toEqual({ development_slug: 'benavidez-village' });
    expect(resolveAttributionAsset({ pageLocation: 'https://x.test/propiedades/236682' })).toEqual({ property_id: 236682, development_slug: 'domus-brickell-center' });
    expect(resolveAttributionAsset({ pageLocation: 'https://x.test/desarrollos/inventado' })).toEqual({});
    expect(resolveAttributionAsset({ pageLocation: 'https://x.test/desarrollos/remeros-beach' })).toEqual({}); // oculto
    expect(resolveAttributionAsset({ pageLocation: 'https://x.test/contacto' })).toEqual({});
    const a = parseSubmitAttribution(attr({ landing_page: '/desarrollos/domus-brickell-center' }));
    expect(resolveAttributionAsset({ pageLocation: 'https://x.test/contacto', attribution: a })).toEqual({ development_slug: 'domus-brickell-center' });
  });

  it('buildAttributionNote: vacío sin señal de campaña; usa el primer toque si el último no trae campaña', () => {
    expect(buildAttributionNote(null)).toBe('');
    expect(buildAttributionNote(parseSubmitAttribution(attr({ landing_page: '/comprar' })))).toBe('');
    const a = parseSubmitAttribution(attr({ landing_page: '/comprar' }, { first: { utm_source: 'meta', utm_medium: 'paid_social', ad_id: '55' } }));
    expect(buildAttributionNote(a)).toContain('anuncio id 55');
    expect(buildAttributionNote(a).length).toBeLessThanOrEqual(400);
  });
});
