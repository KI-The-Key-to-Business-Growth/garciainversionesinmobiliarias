import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetFiredEvents, stripPii, trackEvent, trackEventOnce } from '@/lib/analytics';
import { CONSENT_ALL, CONSENT_DENIED, buildConsentCookie, serializeConsent } from '@/lib/consent';
import { applyConsent, getStoredConsent, type ConsentWindow } from '@/lib/consent-client';
import { captureAttribution, extractTouch, readAttributionStore } from '@/lib/attribution';

function storage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

// Navegador simulado con un "cookie jar" real: respeta Max-Age=0 / Expires pasado y Domain.
function makeWin(opts: { cookie?: string; dataLayer?: boolean; gtmLoaded?: boolean } = {}) {
  const jar = new Map<string, string>();
  for (const part of (opts.cookie ?? '').split(';')) {
    const [k, ...v] = part.split('=');
    if (k.trim()) jar.set(k.trim(), v.join('='));
  }
  const reload = vi.fn();
  const loadGtm = vi.fn();
  const doc = {
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(line: string) {
      const [pair, ...attrs] = line.split(';').map((s) => s.trim());
      const [name, ...v] = pair.split('=');
      const expired = attrs.some((a) => /^Max-Age=0$/i.test(a));
      if (expired) jar.delete(name);
      else jar.set(name, v.join('='));
    },
  };
  const win: ConsentWindow = {
    document: doc,
    location: { hostname: 'www.garciainversionesinmobiliarias.com.ar', protocol: 'https:', reload },
    localStorage: storage(),
    sessionStorage: storage(),
    dataLayer: opts.dataLayer === false ? undefined : [],
    __giLoadGtm: loadGtm,
    __giGtmLoaded: opts.gtmLoaded,
  };
  return { win, reload, loadGtm, jar };
}

beforeEach(() => _resetFiredEvents());

describe('trackEvent — nada sale sin consentimiento', () => {
  it('sin elección o con rechazo: no empuja ningún evento (no se acumulan para después)', () => {
    for (const cookie of ['', `gi_consent=${serializeConsent(CONSENT_DENIED)}`]) {
      const { win } = makeWin({ cookie });
      expect(trackEvent('click_whatsapp', { button_location: 'hero' }, win)).toBe(false);
      expect(trackEventOnce('generate_lead', 'e1', {}, win)).toBe(false);
      expect(win.dataLayer).toEqual([]);
    }
  });

  it('con consentimiento empuja el evento; sin dataLayer (localhost/preview) no hace nada', () => {
    const on = makeWin({ cookie: `gi_consent=${serializeConsent(CONSENT_ALL)}` });
    expect(trackEvent('click_whatsapp', { button_location: 'hero' }, on.win)).toBe(true);
    expect(on.win.dataLayer).toEqual([{ event: 'click_whatsapp', button_location: 'hero' }]);
    const off = makeWin({ cookie: `gi_consent=${serializeConsent(CONSENT_ALL)}`, dataLayer: false });
    expect(trackEvent('click_whatsapp', {}, off.win)).toBe(false);
  });

  it('trackEventOnce evita duplicados del mismo event_id y no marca como emitido un evento bloqueado', () => {
    const { win } = makeWin();
    expect(trackEventOnce('generate_lead', 'lead_1', {}, win)).toBe(false); // sin consentimiento
    win.document.cookie = buildConsentCookie(CONSENT_ALL);
    expect(trackEventOnce('generate_lead', 'lead_1', { lead_type: 'consulta_general' }, win)).toBe(true);
    expect(trackEventOnce('generate_lead', 'lead_1', {}, win)).toBe(false);
    expect(trackEventOnce('generate_lead', 'lead_2', {}, win)).toBe(true);
    expect((win.dataLayer as Array<{ event: string }>).filter((e) => e.event === 'generate_lead')).toHaveLength(2);
  });

  it('stripPii descarta claves y valores personales pero conserva form_name y demás', () => {
    expect(
      stripPii({
        email: 'a@b.com',
        phone: '+54 9 11 5555 0000',
        nombre: 'Ana',
        whatsapp_number: '5491167240353',
        message: 'hola',
        note: 'escribime a ana@ejemplo.com',
        contacto: '+54 9 11 6724-0353',
        form_name: 'Formulario principal',
        property_id: '240588',
        event_id: 'lead_1',
        vacio: '',
      }),
    ).toEqual({ form_name: 'Formulario principal', property_id: '240588', event_id: 'lead_1' });
  });
});

describe('applyConsent — aceptar, rechazar y modificar', () => {
  it('aceptar todo: guarda cookie, actualiza Consent Mode a granted y carga GTM', () => {
    const { win, loadGtm, reload } = makeWin();
    const r = applyConsent(CONSENT_ALL, win);
    expect(getStoredConsent(win)).toMatchObject(CONSENT_ALL);
    const dl = win.dataLayer as unknown[];
    expect(Array.from(dl[0] as ArrayLike<unknown>)).toEqual([
      'consent',
      'update',
      { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' },
    ]);
    expect(dl[1]).toMatchObject({ event: 'consent_update', consent_analytics: 'granted', consent_marketing: 'granted' });
    expect(loadGtm).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    expect(r.reloaded).toBe(false);
  });

  it('rechazar: guarda el rechazo, todo denied, NO carga GTM y no persiste atribución', () => {
    const { win, loadGtm } = makeWin();
    applyConsent(CONSENT_DENIED, win);
    expect(getStoredConsent(win)).toMatchObject(CONSENT_DENIED);
    expect(Array.from((win.dataLayer as unknown[])[0] as ArrayLike<unknown>)[2]).toMatchObject({
      ad_storage: 'denied',
      analytics_storage: 'denied',
    });
    expect(loadGtm).not.toHaveBeenCalled();
    expect(readAttributionStore(win)).toBeNull();
  });

  it('retirar el consentimiento: borra cookies de medición y atribución, y recarga si GTM ya cargó', () => {
    const { win, reload, jar } = makeWin({
      cookie: `gi_consent=${serializeConsent(CONSENT_ALL)}; _ga=1; _ga_YD6FJKCK3M=2; _fbp=3; _gcl_au=4; sesion=keep`,
      gtmLoaded: true,
    });
    captureAttribution(win, CONSENT_ALL, extractTouch('https://www.garciainversionesinmobiliarias.com.ar/?utm_source=meta', ''));
    expect(readAttributionStore(win)).not.toBeNull();

    const r = applyConsent(CONSENT_DENIED, win);
    expect(r.reloaded).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect([...jar.keys()].sort()).toEqual(['gi_consent', 'sesion']);
    expect(readAttributionStore(win)).toBeNull();
    expect(getStoredConsent(win)).toMatchObject(CONSENT_DENIED);
  });

  it('retirar solo publicidad conserva analítica, borra click ids y recarga', () => {
    const { win, reload } = makeWin({ cookie: `gi_consent=${serializeConsent(CONSENT_ALL)}; _fbp=3`, gtmLoaded: true });
    captureAttribution(win, CONSENT_ALL, extractTouch('https://www.garciainversionesinmobiliarias.com.ar/?utm_source=meta&fbclid=zzz', ''));
    applyConsent({ analytics: true, marketing: false }, win);
    expect(reload).toHaveBeenCalledTimes(1);
    const s = readAttributionStore(win)!;
    expect(s.last.fbclid).toBeUndefined();
    expect(s.last.utm_source).toBe('meta');
  });

  it('cambiar de rechazo a aceptar carga GTM sin recargar', () => {
    const { win, loadGtm, reload } = makeWin({ cookie: `gi_consent=${serializeConsent(CONSENT_DENIED)}` });
    applyConsent({ analytics: true, marketing: false }, win);
    expect(loadGtm).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('si el Pixel quedó bloqueado en esta carga y ahora se acepta publicidad, recarga para activarlo', () => {
    const { win, reload } = makeWin({ cookie: `gi_consent=${serializeConsent({ analytics: true, marketing: false })}`, gtmLoaded: true });
    win.__giFbqBlocked = true;
    expect(applyConsent(CONSENT_ALL, win).reloaded).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('retirar sin que GTM haya cargado no recarga', () => {
    const { win, reload } = makeWin({ cookie: `gi_consent=${serializeConsent(CONSENT_ALL)}`, gtmLoaded: false });
    expect(applyConsent(CONSENT_DENIED, win).reloaded).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
