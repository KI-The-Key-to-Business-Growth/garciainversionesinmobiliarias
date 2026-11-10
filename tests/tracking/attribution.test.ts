import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  captureAttribution,
  clearAttribution,
  collectAttributionForSubmit,
  extractTouch,
  getSessionId,
  parseSubmitAttribution,
  pruneAttribution,
  readAttributionStore,
  sanitizeTouch,
} from '@/lib/attribution';
import { CONSENT_ALL, CONSENT_DENIED } from '@/lib/consent';

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}
function fakeWin() {
  return { localStorage: fakeStorage(), sessionStorage: fakeStorage() };
}
const BASE = 'https://www.garciainversionesinmobiliarias.com.ar';
const META_URL =
  `${BASE}/desarrollos/domus-brickell-center?utm_source=meta&utm_medium=paid_social&utm_campaign=Domus%20Brickell&utm_content=Video%2001&utm_term=Inversores&campaign_id=120001&adset_id=120002&ad_id=120003&placement=Instagram_Reels&fbclid=IwAR123`;

describe('extractTouch', () => {
  it('lee UTMs, IDs reales de Meta y click ids; el landing es solo el path', () => {
    const t = extractTouch(META_URL, 'https://l.instagram.com/?u=x', 1000);
    expect(t).toMatchObject({
      utm_source: 'meta',
      utm_medium: 'paid_social',
      utm_campaign: 'Domus Brickell',
      campaign_id: '120001',
      adset_id: '120002',
      ad_id: '120003',
      placement: 'Instagram_Reels',
      fbclid: 'IwAR123',
      landing_page: '/desarrollos/domus-brickell-center',
      referrer: 'https://l.instagram.com/',
      ts: 1000,
    });
    expect(t.landing_page).not.toContain('?');
  });

  it('referrer interno no cuenta como referrer; una URL inválida no rompe', () => {
    expect(extractTouch(`${BASE}/comprar`, `${BASE}/`).referrer).toBeUndefined();
    expect(extractTouch('no-es-url', '').landing_page).toBe('/');
  });

  it('limpia marcado y caracteres de control, y limita el largo', () => {
    const t = extractTouch(
      `${BASE}/?utm_source=${encodeURIComponent('<b>x</b>\n')}&utm_campaign=${'a'.repeat(500)}`,
      '',
    );
    expect(t.utm_source).not.toMatch(/[<>\n]/);
    expect(t.utm_campaign).toHaveLength(200);
  });
});

describe('captureAttribution — respeta el consentimiento', () => {
  it('sin consentimiento NO persiste nada (ni sesión)', () => {
    const win = fakeWin();
    expect(captureAttribution(win, CONSENT_DENIED, extractTouch(META_URL, ''))).toBeNull();
    expect(win.localStorage.raw.size).toBe(0);
    expect(win.sessionStorage.raw.size).toBe(0);
    expect(getSessionId(win, CONSENT_DENIED)).toBe('');
  });

  it('con analytics persiste UTMs e IDs pero NO click ids', () => {
    const win = fakeWin();
    const store = captureAttribution(win, { analytics: true, marketing: false }, extractTouch(META_URL, ''))!;
    expect(store.first.campaign_id).toBe('120001');
    expect(store.first.fbclid).toBeUndefined();
    expect(win.localStorage.raw.get(ATTRIBUTION_STORAGE_KEY)).not.toContain('IwAR123');
  });

  it('con marketing conserva los click ids', () => {
    const win = fakeWin();
    const store = captureAttribution(win, CONSENT_ALL, extractTouch(META_URL, ''))!;
    expect(store.last.fbclid).toBe('IwAR123');
  });

  it('first-touch se escribe una vez; una navegación interna no pisa el last-touch', () => {
    const win = fakeWin();
    captureAttribution(win, CONSENT_ALL, extractTouch(META_URL, ''), 1000);
    captureAttribution(win, CONSENT_ALL, extractTouch(`${BASE}/comprar`, `${BASE}/`), 2000);
    const s = readAttributionStore(win, 3000)!;
    expect(s.first.campaign_id).toBe('120001');
    expect(s.last.campaign_id).toBe('120001');
    // una campaña nueva SÍ reemplaza el last-touch pero conserva el first
    captureAttribution(
      win,
      CONSENT_ALL,
      extractTouch(`${BASE}/desarrollos/benavidez-village?utm_source=meta&campaign_id=999`, ''),
      4000,
    );
    const s2 = readAttributionStore(win, 5000)!;
    expect(s2.first.campaign_id).toBe('120001');
    expect(s2.last.campaign_id).toBe('999');
    expect(s2.last.landing_page).toBe('/desarrollos/benavidez-village');
  });

  it('expira a los 90 días', () => {
    const win = fakeWin();
    captureAttribution(win, CONSENT_ALL, extractTouch(META_URL, ''), 1);
    expect(readAttributionStore(win, 89 * 86_400_000)).not.toBeNull();
    expect(readAttributionStore(win, 91 * 86_400_000)).toBeNull();
    expect(win.localStorage.raw.has(ATTRIBUTION_STORAGE_KEY)).toBe(false);
  });

  it('storage bloqueado no lanza', () => {
    const boom = {
      getItem: () => {
        throw new Error('x');
      },
      setItem: () => {
        throw new Error('x');
      },
      removeItem: () => {
        throw new Error('x');
      },
    };
    expect(() =>
      captureAttribution({ localStorage: boom, sessionStorage: boom }, CONSENT_ALL, extractTouch(META_URL, '')),
    ).not.toThrow();
  });
});

describe('retiro de consentimiento', () => {
  it('retirar marketing borra click ids y conserva el resto; retirar todo borra todo', () => {
    const win = fakeWin();
    captureAttribution(win, CONSENT_ALL, extractTouch(META_URL, ''));
    pruneAttribution({ analytics: true, marketing: false }, win);
    const s = readAttributionStore(win)!;
    expect(s.first.fbclid).toBeUndefined();
    expect(s.first.utm_campaign).toBe('Domus Brickell');
    pruneAttribution(CONSENT_DENIED, win);
    expect(win.localStorage.raw.size).toBe(0);
    expect(win.sessionStorage.raw.size).toBe(0);
  });

  it('clearAttribution borra storage y sesión', () => {
    const win = fakeWin();
    captureAttribution(win, CONSENT_ALL, extractTouch(META_URL, ''));
    expect(win.sessionStorage.raw.has(SESSION_STORAGE_KEY)).toBe(true);
    clearAttribution(win);
    expect(win.localStorage.raw.size + win.sessionStorage.raw.size).toBe(0);
  });
});

describe('payload del formulario', () => {
  it('sin consentimiento o sin datos: vacío', () => {
    const win = fakeWin();
    expect(collectAttributionForSubmit(win, CONSENT_DENIED)).toBe('');
    expect(collectAttributionForSubmit(win, null)).toBe('');
    expect(collectAttributionForSubmit(win, CONSENT_ALL)).toBe('');
  });

  it('incluye sesión y first/last; cookies de Meta solo con marketing; sin datos personales', () => {
    const win = fakeWin();
    captureAttribution(win, CONSENT_ALL, extractTouch(META_URL, ''), 1000);
    const json = collectAttributionForSubmit(win, CONSENT_ALL, '_fbp=fb.1.1.2; _fbc=fb.1.1.IwAR123; x=1', 2000);
    const p = JSON.parse(json);
    expect(p.session_id).toMatch(/^s_/);
    expect(p.fbp).toBe('fb.1.1.2');
    expect(p.last.ad_id).toBe('120003');
    expect(json).not.toMatch(/@|nombre|telefono|email/i);
    const onlyAnalytics = JSON.parse(
      collectAttributionForSubmit(win, { analytics: true, marketing: false }, '_fbp=fb.1.1.2', 2000),
    );
    expect(onlyAnalytics.fbp).toBeUndefined();
    expect(onlyAnalytics.last.fbclid).toBeUndefined();
  });
});

describe('parseSubmitAttribution (servidor)', () => {
  it('rechaza vacío, JSON roto, versión errónea y payload sin consentimiento declarado', () => {
    expect(parseSubmitAttribution('')).toBeNull();
    expect(parseSubmitAttribution('{')).toBeNull();
    expect(parseSubmitAttribution(JSON.stringify({ v: 2 }))).toBeNull();
    expect(
      parseSubmitAttribution(
        JSON.stringify({
          v: 1,
          consent: { analytics: false, marketing: false },
          first: { landing_page: '/' },
          last: { landing_page: '/' },
        }),
      ),
    ).toBeNull();
    expect(parseSubmitAttribution('x'.repeat(7000))).toBeNull();
    expect(parseSubmitAttribution(undefined)).toBeNull();
  });

  it('descarta click ids y cookies de Meta sin consentimiento de marketing, aunque el cliente los mande', () => {
    const raw = JSON.stringify({
      v: 1,
      consent: { analytics: true, marketing: false },
      session_id: 's_abc123_def456',
      first: { landing_page: '/', fbclid: 'zzz', utm_source: 'meta' },
      last: { landing_page: '/', gclid: 'yyy' },
      fbp: 'fb.1.1.2',
    });
    const p = parseSubmitAttribution(raw)!;
    expect(p.first.fbclid).toBeUndefined();
    expect(p.last.gclid).toBeUndefined();
    expect(p.first.utm_source).toBe('meta');
    expect(p.fbp).toBeUndefined();
  });

  it('ignora claves desconocidas (no se cuela nada, ni datos personales)', () => {
    const t = sanitizeTouch({ landing_page: '/x', email: 'a@b.com', utm_source: 'meta', ts: 5 })!;
    expect(Object.keys(t).sort()).toEqual(['landing_page', 'ts', 'utm_source']);
  });
});
