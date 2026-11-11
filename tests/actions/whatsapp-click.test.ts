import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '88.77.66.55']]),
}));

const { recordLeadAttribution, isProductionRuntime } = vi.hoisted(() => ({
  recordLeadAttribution: vi.fn(async (..._a: unknown[]) => undefined),
  isProductionRuntime: vi.fn(() => true),
}));
vi.mock('@/lib/db/attribution', () => ({ recordLeadAttribution }));
vi.mock('@/lib/runtime-env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/runtime-env')>()),
  isProductionRuntime,
}));

import { recordWhatsAppClick } from '@/actions/whatsapp-click';
import { _resetRateLimit } from '@/lib/security/ratelimit';
import { resolveAssetKey } from '@/lib/attribution-server';

const REF = 'GI-7K3F2Q';
const DOMUS_URL = 'https://www.garciainversionesinmobiliarias.com.ar/desarrollos/domus-brickell-center';

function attr(consent: { analytics: boolean; marketing: boolean }, last: Record<string, string | number> = {}): string {
  return JSON.stringify({
    v: 1,
    consent,
    session_id: 's_abc123_def456',
    first: { landing_page: '/desarrollos/domus-brickell-center', ts: 1 },
    last: { landing_page: '/desarrollos/domus-brickell-center', ts: 2, ...last },
    fbp: 'fb.1.100.200',
  });
}

beforeEach(() => {
  recordLeadAttribution.mockClear();
  isProductionRuntime.mockReturnValue(true);
  _resetRateLimit();
});

describe('recordWhatsAppClick', () => {
  it('rechaza referencias con formato inválido sin tocar Supabase', async () => {
    for (const ref of ['', 'GI-123', 'hola', 'GI-7K3F2I', '<script>']) {
      expect(await recordWhatsAppClick({ ref, page_location: DOMUS_URL })).toEqual({ ok: false });
    }
    expect(recordLeadAttribution).not.toHaveBeenCalled();
  });

  it('en Preview/Development no escribe (comparten Supabase con producción)', async () => {
    isProductionRuntime.mockReturnValue(false);
    expect(await recordWhatsAppClick({ ref: REF, page_location: DOMUS_URL })).toEqual({ ok: true, simulated: true });
    expect(recordLeadAttribution).not.toHaveBeenCalled();
  });

  it('registra el clic como whatsapp_click con la referencia como event_id y el activo por IDs reales', async () => {
    const result = await recordWhatsAppClick({ ref: REF.toLowerCase(), page_location: DOMUS_URL, property_id: 236682 });
    expect(result).toEqual({ ok: true });
    expect(recordLeadAttribution).toHaveBeenCalledTimes(1);
    const row = recordLeadAttribution.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({
      event_id: REF,
      lead_type: 'whatsapp_click',
      form_name: 'WhatsApp',
      crm_status: 'not_applicable',
      property_app_id: 236682,
      development_slug: 'domus-brickell-center',
      asset_key: 'dev:domus-brickell-center',
      page_path: '/desarrollos/domus-brickell-center',
    });
    // Un clic no es un mensaje recibido: las columnas de recepción no se escriben (quedan NULL)
    expect(row).not.toHaveProperty('wa_message_received_at');
    expect(row).not.toHaveProperty('wa_match_method');
  });

  it('con consentimiento de marketing vincula la atribución de campaña a la referencia', async () => {
    await recordWhatsAppClick({
      ref: REF,
      page_location: DOMUS_URL,
      attribution: attr({ analytics: true, marketing: true }, { utm_source: 'meta', utm_medium: 'paid_social', campaign_id: '111', adset_id: '222', ad_id: '333', fbclid: 'abc' }),
    });
    const row = recordLeadAttribution.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({ utm_source: 'meta', campaign_id: '111', adset_id: '222', ad_id: '333', fbclid: 'abc', consent_marketing: true });
  });

  it('sin consentimiento no atribuye campañas: solo el registro operativo', async () => {
    await recordWhatsAppClick({ ref: REF, page_location: DOMUS_URL, attribution: '' });
    const row = recordLeadAttribution.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({
      event_id: REF,
      lead_type: 'whatsapp_click',
      consent_analytics: false,
      consent_marketing: false,
      utm_source: null,
      campaign_id: null,
      adset_id: null,
      ad_id: null,
      fbclid: null,
      fbp: null,
      session_id: null,
      first_touch: null,
      last_touch: null,
    });
  });

  it('si el payload declara rechazo de marketing descarta los identificadores de clic', async () => {
    await recordWhatsAppClick({
      ref: REF,
      page_location: DOMUS_URL,
      attribution: attr({ analytics: true, marketing: false }, { utm_source: 'meta', fbclid: 'abc', gclid: 'xyz' }),
    });
    const row = recordLeadAttribution.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({ consent_marketing: false, fbclid: null, gclid: null, fbp: null });
  });

  it('página general sin activo: asset_key ausente (consulta general/institucional)', async () => {
    await recordWhatsAppClick({ ref: REF, page_location: 'https://www.garciainversionesinmobiliarias.com.ar/' });
    const row = recordLeadAttribution.mock.calls[0][0] as Record<string, unknown>;
    expect(row).not.toHaveProperty('asset_key');
    expect(row).toMatchObject({ development_slug: null, property_app_id: null });
  });

  it('limita la cantidad de registros por IP', async () => {
    let rejected = 0;
    for (let i = 0; i < 45; i++) {
      const r = await recordWhatsAppClick({ ref: `GI-${'ABCDEFGH'.slice(0, 5)}${'23456789'[i % 8]}`, page_location: DOMUS_URL });
      if (!r.ok) rejected++;
    }
    expect(rejected).toBe(5);
  });
});

describe('resolveAssetKey (convención única para todo García)', () => {
  const base = 'https://www.garciainversionesinmobiliarias.com.ar';
  it('desarrollo, propiedad e inversión', () => {
    expect(resolveAssetKey({ asset: { development_slug: 'benavidez-village' }, pageLocation: `${base}/desarrollos/benavidez-village` })).toBe('dev:benavidez-village');
    expect(resolveAssetKey({ asset: { property_id: 237569 }, pageLocation: `${base}/propiedades/237569` })).toBe('prop:237569');
    // propiedad dentro de un desarrollo: la clave es la propiedad; el desarrollo queda en development_slug
    expect(resolveAssetKey({ asset: { property_id: 237474, development_slug: 'benavidez-village' }, pageLocation: `${base}/propiedades/237474` })).toBe('prop:237474');
  });

  it('desde una página general hereda el activo de la campaña; sin activo devuelve null', () => {
    expect(resolveAssetKey({ asset: { development_slug: 'domus-brickell-center' }, pageLocation: `${base}/` })).toBe('dev:domus-brickell-center');
    expect(resolveAssetKey({ asset: {}, pageLocation: `${base}/contacto` })).toBeNull();
    expect(resolveAssetKey({ asset: {} })).toBeNull();
  });

  it('una inversión inexistente no genera clave inventada', () => {
    expect(resolveAssetKey({ asset: {}, pageLocation: `${base}/invertir/no-existe-xyz` })).toBeNull();
  });
});
