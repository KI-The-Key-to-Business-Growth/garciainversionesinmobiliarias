// QA — pruebas de PROPIEDADES y DIFERENCIALES sobre consentimiento, atribución, WhatsApp y tracking.
import { describe, expect, it, vi } from 'vitest';
import {
  buildConsentCookie,
  cookieDomainVariants,
  CONSENT_COOKIE,
  CONSENT_VERSION,
  listMeasurementCookies,
  parseConsent,
  readConsentFromCookieString,
  serializeConsent,
  toConsentModeSignals,
  type ConsentChoice,
} from '@/lib/consent';
import {
  cleanValue,
  extractTouch,
  hasCampaignSignal,
  readAttributionStore,
  restrictTouch,
  sanitizeTouch,
  ATTRIBUTION_STORAGE_KEY,
  ATTRIBUTION_TTL_DAYS,
  CLICK_ID_KEYS,
  UTM_KEYS,
} from '@/lib/attribution';
import {
  buildWhatsAppHref,
  buildWhatsAppMessage,
  cleanAssetLabel,
  extractWhatsAppRef,
  generateWhatsAppRef,
  getSessionRef,
  isEffectiveWhatsAppClick,
  isGarciaWhatsAppHref,
  isValidWhatsAppRef,
  WA_REF_ENTROPY_BITS,
  WHATSAPP_NUMBER,
} from '@/lib/whatsapp-ref';
import { isTrackingHost, normalizeHost, TRACKING_HOSTS } from '@/lib/tracking-hosts';
import { isHomePathname } from '@/lib/home-path';
import { createEventId, pickTrackingFields } from '@/lib/tracking';
import { gen, SEEDS } from './_gen';

// ──────────────────────────── consentimiento ────────────────────────────
describe('consentimiento (propiedades + diferencial)', () => {
  it('serialize → parse es un ida y vuelta exacto para las 4 combinaciones', () => {
    for (const analytics of [true, false])
      for (const marketing of [true, false]) {
        const now = 1_731_200_000_000;
        const parsed = parseConsent(serializeConsent({ analytics, marketing }, now));
        expect(parsed).toEqual({ v: CONSENT_VERSION, analytics, marketing, ts: Math.floor(now / 1000) });
      }
  });

  it('parseConsent nunca lanza con basura y solo acepta el formato exacto', () => {
    for (const seed of SEEDS(3000)) {
      const g = gen(seed);
      const raw = g.pick([g.str(60), g.evil(), encodeURIComponent(g.str(30)), `v=${g.int(0, 4)}&a=${g.int(0, 3)}&m=${g.int(0, 3)}&t=${g.str(5)}`, '%E0%A4%A', '%']);
      let r: ReturnType<typeof parseConsent> = null;
      expect(() => (r = parseConsent(raw))).not.toThrow();
      if (r) {
        const x = r as { v: number; analytics: boolean; marketing: boolean };
        expect(x.v).toBe(CONSENT_VERSION);
        expect(typeof x.analytics).toBe('boolean');
        expect(typeof x.marketing).toBe('boolean');
      }
    }
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent('')).toBeNull();
    expect(parseConsent('v=1&a=1&m=1&t=1')).toBeNull(); // versión vieja → volver a pedir
    expect(parseConsent('v=2&a=2&m=1&t=1')).toBeNull();
  });

  it('Consent Mode: marketing controla las 3 señales de anuncios y analytics solo analytics_storage', () => {
    for (const analytics of [true, false])
      for (const marketing of [true, false]) {
        const s = toConsentModeSignals({ analytics, marketing });
        expect(s.ad_storage).toBe(marketing ? 'granted' : 'denied');
        expect(s.ad_user_data).toBe(s.ad_storage);
        expect(s.ad_personalization).toBe(s.ad_storage);
        expect(s.analytics_storage).toBe(analytics ? 'granted' : 'denied');
      }
  });

  it('la cookie generada se lee de vuelta, también mezclada con otras cookies (diferencial con un parser de referencia)', () => {
    // Referencia independiente: separar por ';' y '=' como lo haría un parser estándar.
    const refGet = (cookieString: string, name: string): string | undefined =>
      Object.fromEntries(
        cookieString
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => [p.slice(0, p.indexOf('=')).trim(), p.slice(p.indexOf('=') + 1).trim()]),
      )[name];
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const choice: ConsentChoice = { analytics: g.bool(), marketing: g.bool() };
      const set = buildConsentCookie(choice, Date.now(), true);
      expect(set).toContain('Secure');
      expect(set).toContain('SameSite=Lax');
      expect(set).toMatch(/Max-Age=\d+/);
      const value = set.split(';')[0]; // "gi_consent=...."
      const others = [`_ga=GA1.1.${g.int(1, 999999)}`, `a=${g.int(0, 9)}`, `x=y=z`];
      const jar = [...others.slice(0, g.int(0, 3)), value, ...others.slice(0, g.int(0, 3))].join('; ');
      const mine = readConsentFromCookieString(jar);
      expect(mine?.analytics).toBe(choice.analytics);
      expect(mine?.marketing).toBe(choice.marketing);
      expect(refGet(jar, CONSENT_COOKIE)).toBe(value.slice(CONSENT_COOKIE.length + 1));
    }
    expect(buildConsentCookie({ analytics: true, marketing: true }, 0, false)).not.toContain('Secure');
  });

  it('listMeasurementCookies detecta solo cookies de medición y nunca la de consentimiento ni las de sesión', () => {
    const jar = '_ga=1; _ga_ABC123=2; _gid=3; _gcl_au=4; _fbp=5; _fbc=6; gi_consent=x; gi_sid=7; other=8; _gat_gtag=9';
    expect(listMeasurementCookies(jar).sort()).toEqual(['_fbc', '_fbp', '_ga', '_ga_ABC123', '_gat_gtag', '_gcl_au', '_gid'].sort());
  });

  it('cookieDomainVariants: nunca intenta borrar en un sufijo público (.com.ar, .ar)', () => {
    for (const host of ['www.garciainversionesinmobiliarias.com.ar', 'garciainversionesinmobiliarias.com.ar', 'WWW.GARCIAINVERSIONESINMOBILIARIAS.COM.AR.', 'localhost']) {
      const v = cookieDomainVariants(host);
      expect(v).toContain('');
      for (const d of v) {
        expect(d, `${host} generó el dominio ${d}`).not.toBe('.com.ar');
        expect(d).not.toBe('.ar');
        expect(d).not.toBe('.com');
      }
    }
  });
});

// ───────────────────────────── atribución ─────────────────────────────
describe('atribución (propiedades)', () => {
  it('cleanValue: sin control ni marcado, recortado, idempotente, nunca lanza', () => {
    for (const seed of SEEDS(3000)) {
      const g = gen(seed);
      const max = g.pick([5, 50, 200, 300]);
      const v = g.pick<unknown>([g.str(500), g.evil(), 42, null, undefined, {}, [], true]);
      const out = cleanValue(v, max);
      expect(out).not.toMatch(/[\u0000-\u001f\u007f<>]/);
      expect(out.length).toBeLessThanOrEqual(max);
      expect(cleanValue(out, max)).toBe(out);
    }
  });

  it('sanitizeTouch es idempotente y siempre produce un touch utilizable', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const raw: Record<string, unknown> = { landing_page: g.str(60), ts: g.pick([g.int(-5, 2e12), 'x', null, NaN]), referrer: g.str(80) };
      for (const k of [...UTM_KEYS, ...CLICK_ID_KEYS]) if (g.bool(0.4)) raw[k] = g.pick([g.str(100), g.evil()]);
      const t = sanitizeTouch(raw)!;
      expect(t.landing_page.startsWith('/')).toBe(true);
      expect(Number.isInteger(t.ts) && t.ts >= 0).toBe(true);
      expect(sanitizeTouch(t)).toEqual(t);
      expect(JSON.stringify(t)).not.toMatch(/[<>]/);
    }
    expect(sanitizeTouch(null)).toBeNull();
    expect(sanitizeTouch('x')).toBeNull();
    expect(sanitizeTouch(42)).toBeNull();
  });

  it('extractTouch: nunca guarda la query en landing_page, ignora referrer propio y no lanza con URLs raras', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const q = new URLSearchParams({ utm_source: g.str(20), utm_campaign: g.str(20), fbclid: g.str(40) }).toString();
      const href = `https://www.garciainversionesinmobiliarias.com.ar/desarrollos/domus?${q}#frag`;
      const t = extractTouch(href, g.pick(['', 'https://www.garciainversionesinmobiliarias.com.ar/x', 'https://l.facebook.com/l.php?u=1', 'no-es-url']), 123);
      expect(t.landing_page).toBe('/desarrollos/domus');
      expect(t.landing_page).not.toContain('?');
      expect(t.ts).toBe(123);
      if (t.referrer) expect(t.referrer).not.toContain('garciainversionesinmobiliarias');
    }
    for (const weird of ['', 'about:blank', 'javascript:alert(1)', '//x', 'https://']) expect(() => extractTouch(weird, '')).not.toThrow();
  });

  it('restrictTouch: sin consentimiento de marketing se borran TODOS los click ids y nada más', () => {
    for (const seed of SEEDS(500)) {
      const g = gen(seed);
      const touch = sanitizeTouch({ landing_page: '/x', ts: 5, utm_source: 'meta', gclid: 'G'.repeat(g.int(1, 50)), fbclid: 'F', gbraid: 'B', wbraid: 'W' })!;
      const r = restrictTouch(touch, { analytics: g.bool(), marketing: false });
      for (const k of CLICK_ID_KEYS) expect(r[k]).toBeUndefined();
      expect(r.utm_source).toBe('meta');
      expect(restrictTouch(touch, { analytics: true, marketing: true })).toEqual(touch);
    }
    expect(hasCampaignSignal({ landing_page: '/', ts: 1 })).toBe(false);
  });

  it('readAttributionStore: nunca lanza con JSON arbitrario y respeta el vencimiento de 90 días', () => {
    const mk = (raw: string | null) => ({ localStorage: { getItem: () => raw, setItem() {}, removeItem: vi.fn() } });
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const raw = g.pick<string | null>([null, g.str(80), JSON.stringify({ v: 1, first: g.str(10), last: {}, ts: g.str(3) }), JSON.stringify([1, 2, 3]), 'null', '{"v":1}']);
      expect(() => readAttributionStore(mk(raw), Date.now())).not.toThrow();
    }
    const now = 2_000_000_000_000;
    const t = { landing_page: '/', ts: 1 };
    const fresh = JSON.stringify({ v: 1, first: t, last: t, ts: now - (ATTRIBUTION_TTL_DAYS - 1) * 86_400_000 });
    const old = JSON.stringify({ v: 1, first: t, last: t, ts: now - (ATTRIBUTION_TTL_DAYS + 1) * 86_400_000 });
    expect(readAttributionStore(mk(fresh), now)).not.toBeNull();
    expect(readAttributionStore(mk(old), now)).toBeNull();
    expect(ATTRIBUTION_STORAGE_KEY).toBe('gi_attr');
  });
});

// ──────────────────────────── WhatsApp / Ref ────────────────────────────
describe('referencia de WhatsApp (propiedades + diferencial)', () => {
  it('generateWhatsAppRef: formato exacto y 65 bits de entropía', () => {
    expect(WA_REF_ENTROPY_BITS).toBeGreaterThanOrEqual(64);
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const ref = generateWhatsAppRef((n) => g.bytes(n));
      expect(isValidWhatsAppRef(ref)).toBe(true);
      expect(ref).toMatch(/^GI-[A-HJ-NP-Z2-9]{13}$/);
    }
  });

  it('sin sesgo: cada uno de los 32 símbolos aparece exactamente 8 veces sobre los 256 valores de byte', () => {
    const counts = new Map<string, number>();
    for (let b = 0; b < 256; b++) {
      const ref = generateWhatsAppRef(() => new Uint8Array(13).fill(b));
      const sym = ref[3];
      counts.set(sym, (counts.get(sym) ?? 0) + 1);
    }
    expect(counts.size).toBe(32);
    for (const c of counts.values()) expect(c).toBe(8);
  });

  it('sin colisiones en 100.000 referencias con el generador criptográfico real', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100_000; i++) seen.add(generateWhatsAppRef());
    expect(seen.size).toBe(100_000);
  });

  it('extractWhatsAppRef recupera la referencia aunque editen el texto (diferencial con regex de referencia)', () => {
    const ref = /GI-[A-HJ-NP-Z2-9]{13}/;
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const r = generateWhatsAppRef((n) => g.bytes(n));
      const lower = g.bool();
      const text = `${g.str(30)} Ref: ${lower ? r.toLowerCase() : r} ${g.str(30)}`;
      const exp = text.toUpperCase().match(ref)?.[0] ?? null;
      expect(extractWhatsAppRef(text)).toBe(exp);
      expect(extractWhatsAppRef(text)).toBe(r);
    }
    expect(extractWhatsAppRef(null)).toBeNull();
    expect(extractWhatsAppRef('sin referencia')).toBeNull();
    expect(extractWhatsAppRef('GI-SHORT')).toBeNull();
  });

  it('buildWhatsAppHref: el mensaje se decodifica idéntico y solo se toca el número de García', () => {
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const ref = generateWhatsAppRef((n) => g.bytes(n));
      const msg = buildWhatsAppMessage({ label: g.pick([g.str(120), g.evil(), null, undefined]), ref });
      expect(msg).toContain(`Código de consulta: ${ref}`);
      // Un único salto de línea (el nuestro, antes del código): el nombre del activo no puede colar otro
      // salto ni ningún otro carácter de control, ni marcado HTML.
      expect(msg.split('\n')).toHaveLength(2);
      expect(msg.replace('\n', '')).not.toMatch(/[\u0000-\u001f\u007f<>]/);
      const href = buildWhatsAppHref(`https://wa.me/${WHATSAPP_NUMBER}`, msg);
      expect(isGarciaWhatsAppHref(href)).toBe(true);
      expect(new URL(href).searchParams.get('text')).toBe(msg);
    }
    for (const other of ['https://wa.me/5491100000000', 'https://api.whatsapp.com/send?phone=5491167240353', 'https://evil.com/wa.me/5491167240353', 'tel:+5491167240353', '']) {
      expect(buildWhatsAppHref(other, 'x')).toBe(other);
      expect(isGarciaWhatsAppHref(other)).toBe(false);
    }
  });

  it('cleanAssetLabel: idempotente, ≤70 caracteres, sin marcado ni control', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const out = cleanAssetLabel(g.pick([g.str(300), g.evil()]));
      expect(out.length).toBeLessThanOrEqual(70);
      expect(out).not.toMatch(/[\u0000-\u001f\u007f<>]/);
      expect(out).toBe(out.trim());
      expect(cleanAssetLabel(out)).toBe(out);
    }
  });

  it('getSessionRef: misma referencia por activo, distinta entre activos, y tolera storage roto', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const a1 = getSessionRef(storage, 'domus');
    expect(getSessionRef(storage, 'domus')).toBe(a1);
    expect(getSessionRef(storage, 'benavidez')).not.toBe(a1);
    store.set('gi_wa_ref', '{{{no-json');
    expect(isValidWhatsAppRef(getSessionRef(storage, 'domus'))).toBe(true);
    const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(isValidWhatsAppRef(getSessionRef(broken, 'x'))).toBe(true);
    expect(isValidWhatsAppRef(getSessionRef(null, 'x'))).toBe(true);
  });

  it('solo cuenta como clic el botón principal (click) o el central (auxclick); copiar el enlace no', () => {
    for (let btn = 0; btn <= 4; btn++) {
      expect(isEffectiveWhatsAppClick('click', btn)).toBe(btn === 0);
      expect(isEffectiveWhatsAppClick('auxclick', btn)).toBe(btn === 1);
      expect(isEffectiveWhatsAppClick('contextmenu', btn)).toBe(false);
    }
  });
});

// ─────────────────────────── hosts / home / ids ───────────────────────────
describe('tracking-hosts, home y event ids (propiedades)', () => {
  it('solo los dos hosts exactos de producción cargan tracking; ningún lookalike pasa', () => {
    for (const h of TRACKING_HOSTS) {
      expect(isTrackingHost(h)).toBe(true);
      expect(isTrackingHost(h.toUpperCase())).toBe(true);
      expect(isTrackingHost(h + '.')).toBe(true);
      expect(isTrackingHost('  ' + h + ' ')).toBe(true);
    }
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const apex = 'garciainversionesinmobiliarias.com.ar';
      const bad = g.pick([`${g.str(8)}.${apex}`.replace(/[^a-z0-9.-]/gi, 'x'), `${apex}.evil.com`, `evil${apex}`, `${apex}x`, 'localhost', '127.0.0.1', 'x.vercel.app', `${apex.replace('.com.ar', '.com')}`, '']);
      if (bad === `www.${apex}`) continue;
      if (TRACKING_HOSTS.includes(normalizeHost(bad))) continue;
      expect(isTrackingHost(bad), bad).toBe(false);
    }
    expect(isTrackingHost(null)).toBe(false);
    expect(isTrackingHost(undefined)).toBe(false);
  });

  it('isHomePathname: solo "/" y "/index"', () => {
    for (const seed of SEEDS(1000)) {
      const g = gen(seed);
      const p = '/' + g.str(12).replace(/\s/g, '');
      if (p === '/index' || p === '/') continue;
      expect(isHomePathname(p), p).toBe(false);
    }
    expect(isHomePathname('/')).toBe(true);
    expect(isHomePathname('/index')).toBe(true);
    for (const n of ['/index.html', '/indexador', '/x/index', '/index/', '', null, undefined]) expect(isHomePathname(n as string)).toBe(false);
  });

  it('createEventId: formato estable y sin repeticiones en ráfaga', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i++) seen.add(createEventId('lead'));
    expect(seen.size).toBeGreaterThan(19_990); // ráfaga en el mismo milisegundo: colisiones casi nulas
    expect(createEventId('lead')).toMatch(/^lead_\d{13}_[a-z0-9]{1,8}$/);
  });

  it('pickTrackingFields solo devuelve claves permitidas y omite vacíos', () => {
    for (const seed of SEEDS(1000)) {
      const g = gen(seed);
      const body: Record<string, unknown> = { password: g.evil(), __proto__x: g.str(5), utm_source: g.pick(['meta', '', null, undefined]), event_id: g.str(10), isAdmin: true };
      const out = pickTrackingFields(body);
      for (const k of Object.keys(out)) expect(['utm_source', 'event_id']).toContain(k);
      expect(out).not.toHaveProperty('password');
      expect(out).not.toHaveProperty('isAdmin');
    }
  });
});
