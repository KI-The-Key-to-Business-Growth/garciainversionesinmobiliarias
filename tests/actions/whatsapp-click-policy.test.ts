import { beforeEach, describe, expect, it, vi } from 'vitest';

// Alternativa documentada (requiere aprobación jurídica): registro operativo mínimo también sin
// consentimiento, siempre sin atribución de campaña.
vi.mock('@/lib/whatsapp-policy', () => ({
  WHATSAPP_CLICK_REQUIRES_CONSENT: false,
  WHATSAPP_ATTRIBUTION_REQUIRES_MARKETING_CONSENT: true,
}));
vi.mock('next/headers', () => ({ headers: async () => new Map([['x-forwarded-for', '88.77.66.56']]) }));
const { recordLeadAttribution } = vi.hoisted(() => ({ recordLeadAttribution: vi.fn(async (..._a: unknown[]) => undefined) }));
vi.mock('@/lib/db/attribution', () => ({ recordLeadAttribution }));
vi.mock('@/lib/runtime-env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/runtime-env')>()),
  isProductionRuntime: () => true,
}));

import { recordWhatsAppClick } from '@/actions/whatsapp-click';
import { _resetRateLimit } from '@/lib/security/ratelimit';

beforeEach(() => {
  recordLeadAttribution.mockClear();
  _resetRateLimit();
});

describe('registro de clics con la política alternativa (sin exigir consentimiento)', () => {
  it('guarda solo lo operativo y jamás atribución de campaña', async () => {
    const r = await recordWhatsAppClick({
      ref: 'GI-7K3F2QPXM4HVD',
      page_location: 'https://www.garciainversionesinmobiliarias.com.ar/desarrollos/benavidez-village',
    });
    expect(r).toEqual({ ok: true });
    const row = recordLeadAttribution.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({
      event_id: 'GI-7K3F2QPXM4HVD',
      lead_type: 'whatsapp_click',
      asset_key: 'dev:benavidez-village',
      consent_analytics: false,
      consent_marketing: false,
      utm_source: null,
      campaign_id: null,
      fbclid: null,
      fbp: null,
      first_touch: null,
    });
  });
});
