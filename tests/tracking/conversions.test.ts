import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { _resetFiredEvents, trackEvent, trackEventOnce } from '@/lib/analytics';
import { CONSENT_ALL, serializeConsent } from '@/lib/consent';

// Eventos que el contenedor GTM-MBNKBBSW (versión publicada 7) ya escucha: generate_lead → GA4 +
// Meta Lead; click_whatsapp → GA4 + Contact; newsletter_signup → GA4 + Subscribe; property_view →
// GA4 + ViewContent; select_property → GA4 + SelectProperty.
const GTM_EVENTS = ['generate_lead', 'click_whatsapp', 'newsletter_signup', 'property_view', 'select_property'];
// Eventos propios SIN etiqueta de conversión en GTM (informativos).
const INFORMATIONAL_EVENTS = ['thank_you_page_view'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'legacy') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const SOURCES = ['app', 'components', 'lib'].flatMap((d) => walk(d)).map((f) => ({ f: f.replace(/\\/g, '/'), src: readFileSync(f, 'utf8') }));

describe('el sitio solo emite eventos conocidos y siempre vía lib/analytics', () => {
  it('ningún componente ni página empuja directo al dataLayer (todo pasa por el filtro de consentimiento)', () => {
    const offenders = SOURCES.filter(
      ({ f, src }) =>
        !['lib/analytics.ts', 'lib/consent-client.ts', 'lib/gtm.ts', 'lib/consent.ts'].includes(f) &&
        /dataLayer\s*(\?\.|\.)\s*push|window\.dataLayer\s*=/.test(src),
    ).map((s) => s.f);
    expect(offenders).toEqual([]);
  });

  it('cada nombre de evento usado existe en el contenedor GTM o está marcado como informativo (sin typos)', () => {
    const used = new Set<string>();
    for (const { src } of SOURCES) {
      for (const m of src.matchAll(/track(?:Event|EventOnce)\(\s*'([a-z_]+)'/g)) used.add(m[1]);
    }
    expect([...used].sort()).toEqual(
      expect.arrayContaining(['generate_lead', 'newsletter_signup', 'property_view', 'thank_you_page_view']),
    );
    for (const name of used) expect([...GTM_EVENTS, ...INFORMATIONAL_EVENTS], name).toContain(name);
  });

  it('generate_lead solo se emite desde los formularios comerciales, con event_id y trackEventOnce', () => {
    const emitters = SOURCES.filter(({ src }) => src.includes("'generate_lead'")).map((s) => s.f).sort();
    expect(emitters).toEqual(['components/forms/ContactForm.tsx', 'components/properties/PropertyInquiryPanel.tsx']);
    for (const f of emitters) {
      const src = SOURCES.find((s) => s.f === f)!.src;
      expect(src).toMatch(/trackEventOnce\(\s*'generate_lead'/);
    }
  });

  it('la página de gracias NO cuenta como lead: no emite generate_lead ni newsletter_signup', () => {
    for (const f of ['app/gracias-consulta/page.tsx', 'components/tracking/ThankYouTracking.tsx']) {
      const src = SOURCES.find((s) => s.f === f)!.src;
      expect(src).not.toContain('generate_lead');
      expect(src).not.toContain('newsletter_signup');
      expect(src).not.toMatch(/fbq|gtag\(/);
    }
  });

  it('el clic en WhatsApp es click_whatsapp (contacto), nunca generate_lead', () => {
    const src = SOURCES.find((s) => s.f === 'components/tracking/WhatsAppTracking.tsx')!.src;
    expect(src).toContain("event: 'click_whatsapp'");
    expect(src).not.toContain('generate_lead');
  });

  it('newsletter_signup es un evento aparte y no dispara generate_lead', () => {
    const src = SOURCES.find((s) => s.f === 'components/forms/NewsletterForm.tsx')!.src;
    expect(src).toContain("'newsletter_signup'");
    expect(src).not.toContain('generate_lead');
  });

  it('property_view está montado en ficha, desarrollo y oportunidad de inversión', () => {
    for (const f of ['app/propiedades/[id]/page.tsx', 'app/desarrollos/[id]/page.tsx', 'app/invertir/[slug]/page.tsx']) {
      expect(SOURCES.find((s) => s.f === f)!.src, f).toContain('<PropertyViewTracker');
    }
  });

  it('el evento form_submit de intento (sin etiqueta en GTM) ya no se emite: evita contar envíos fallidos', () => {
    expect(SOURCES.some(({ src }) => src.includes("'form_submit'"))).toBe(false);
  });
});

describe('sin duplicados', () => {
  beforeEach(() => _resetFiredEvents());
  const cookie = `gi_consent=${serializeConsent(CONSENT_ALL)}`;
  const win = () => ({ document: { cookie }, dataLayer: [] as unknown[] });

  it('un doble envío / re-render con el mismo event_id emite UN solo generate_lead', () => {
    const w = win();
    const params = { lead_type: 'consulta_propiedad', property_id: 236682, development_slug: 'domus-brickell-center' };
    expect(trackEventOnce('generate_lead', 'lead_abc', params, w)).toBe(true);
    expect(trackEventOnce('generate_lead', 'lead_abc', params, w)).toBe(false);
    expect(w.dataLayer).toEqual([{ event: 'generate_lead', event_id: 'lead_abc', ...params }]);
  });

  it('dos leads distintos (event_id distintos) sí cuentan por separado', () => {
    const w = win();
    trackEventOnce('generate_lead', 'lead_1', {}, w);
    trackEventOnce('generate_lead', 'lead_2', {}, w);
    expect(w.dataLayer).toHaveLength(2);
  });

  it('los eventos llevan IDs reales de activo y ningún dato personal', () => {
    const w = win();
    trackEvent('property_view', { content_type: 'development', property_id: 240588, development_slug: 'benavidez-village', market: 'AR', email: 'x@y.com', phone: '+54 9 11 5555 0000' }, w);
    expect(w.dataLayer[0]).toEqual({ event: 'property_view', content_type: 'development', property_id: 240588, development_slug: 'benavidez-village', market: 'AR' });
  });
});
