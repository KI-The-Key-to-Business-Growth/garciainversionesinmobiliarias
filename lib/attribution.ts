import { hasAnyConsent, type ConsentChoice } from '@/lib/consent';

// ── Atribución first-touch / last-touch (cliente + validación compartida con el servidor) ────
// Solo se PERSISTE con consentimiento (analytics o marketing). Los identificadores de clic
// (gclid/gbraid/wbraid/fbclid) y las cookies de Meta solo con consentimiento de marketing. Sin
// consentimiento no se guarda ni se envía nada. Jamás contiene datos personales.
//
// Convención de URL de los anuncios de Meta: ver docs/ai/MEASUREMENT.md.

export const ATTRIBUTION_STORAGE_KEY = 'gi_attr';
export const SESSION_STORAGE_KEY = 'gi_sid';
export const ATTRIBUTION_TTL_DAYS = 90; // retención first-touch provisional (decisión documentada)
export const ATTRIBUTION_VERSION = 1;

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'] as const;
// IDs reales de Meta (macros dinámicas {{campaign.id}}, {{adset.id}}, {{ad.id}}): se usan para
// diferenciar campañas y desarrollos sin depender de los NOMBRES.
export const AD_ID_KEYS = ['campaign_id', 'adset_id', 'ad_id', 'placement', 'site_source_name'] as const;
export const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid'] as const;

export type TouchKey = (typeof UTM_KEYS)[number] | (typeof AD_ID_KEYS)[number] | (typeof CLICK_ID_KEYS)[number];

export type AttributionTouch = Partial<Record<TouchKey, string>> & {
  landing_page: string;
  referrer?: string;
  ts: number;
};

export type AttributionStore = {
  v: number;
  first: AttributionTouch;
  last: AttributionTouch;
  ts: number;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type AttributionWindow = {
  localStorage?: StorageLike;
  sessionStorage?: StorageLike;
};

const MAX_VALUE = 200;
const MAX_CLICK_ID = 300;

export function cleanValue(value: unknown, max = MAX_VALUE): string {
  if (typeof value !== 'string') return '';
  // Sin caracteres de control ni marcado: los valores terminan en un CRM y en una tabla.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
}

function cleanPath(value: unknown): string {
  const v = cleanValue(value, 300);
  return v.startsWith('/') ? v : v ? `/${v}` : '/';
}

// Valida/normaliza un touch venido de cualquier fuente (storage del navegador o payload del form).
export function sanitizeTouch(input: unknown): AttributionTouch | null {
  if (!input || typeof input !== 'object') return null;
  const src = input as Record<string, unknown>;
  const touch: AttributionTouch = { landing_page: cleanPath(src.landing_page), ts: 0 };
  for (const key of [...UTM_KEYS, ...AD_ID_KEYS]) {
    const v = cleanValue(src[key]);
    if (v) touch[key] = v;
  }
  for (const key of CLICK_ID_KEYS) {
    const v = cleanValue(src[key], MAX_CLICK_ID);
    if (v) touch[key] = v;
  }
  const referrer = cleanValue(src.referrer, 300);
  if (referrer) touch.referrer = referrer;
  const ts = Number(src.ts);
  touch.ts = Number.isFinite(ts) && ts > 0 ? Math.floor(ts) : 0;
  return touch;
}

export function hasCampaignSignal(touch: AttributionTouch): boolean {
  const keys: TouchKey[] = [...UTM_KEYS, ...AD_ID_KEYS, ...CLICK_ID_KEYS];
  return keys.some((k) => Boolean(touch[k])) || Boolean(touch.referrer);
}

// Lee el touch de la URL actual. Landing = solo el path (sin query: evita guardar dos veces los IDs).
// Referrer = solo origen+path y solo si es externo.
export function extractTouch(href: string, referrer: string, now: number = Date.now()): AttributionTouch {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { landing_page: '/', ts: now };
  }
  const touch: AttributionTouch = { landing_page: cleanPath(url.pathname), ts: now };
  for (const key of [...UTM_KEYS, ...AD_ID_KEYS]) {
    const v = cleanValue(url.searchParams.get(key) ?? '');
    if (v) touch[key] = v;
  }
  for (const key of CLICK_ID_KEYS) {
    const v = cleanValue(url.searchParams.get(key) ?? '', MAX_CLICK_ID);
    if (v) touch[key] = v;
  }
  if (referrer) {
    try {
      const ref = new URL(referrer);
      if (ref.host !== url.host) touch.referrer = cleanValue(`${ref.origin}${ref.pathname}`, 300);
    } catch {
      /* referrer inválido: se ignora */
    }
  }
  return touch;
}

// Quita lo que el consentimiento vigente no permite conservar.
export function restrictTouch(touch: AttributionTouch, choice: ConsentChoice): AttributionTouch {
  if (choice.marketing) return touch;
  const copy: AttributionTouch = { ...touch };
  for (const key of CLICK_ID_KEYS) delete copy[key];
  return copy;
}

function safeGet(storage: StorageLike | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function safeSet(storage: StorageLike | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    /* storage bloqueado / lleno: la atribución simplemente no se persiste */
  }
}
function safeRemove(storage: StorageLike | undefined, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    /* nada */
  }
}

export function readAttributionStore(win: AttributionWindow, now: number = Date.now()): AttributionStore | null {
  const raw = safeGet(win.localStorage, ATTRIBUTION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AttributionStore>;
    if (parsed.v !== ATTRIBUTION_VERSION) return null;
    const first = sanitizeTouch(parsed.first);
    const last = sanitizeTouch(parsed.last);
    if (!first || !last) return null;
    const ageMs = now - Number(parsed.ts || 0);
    if (!Number.isFinite(ageMs) || ageMs > ATTRIBUTION_TTL_DAYS * 86_400_000) {
      safeRemove(win.localStorage, ATTRIBUTION_STORAGE_KEY);
      return null;
    }
    return { v: ATTRIBUTION_VERSION, first, last, ts: Number(parsed.ts) };
  } catch {
    return null;
  }
}

export function clearAttribution(win: AttributionWindow): void {
  safeRemove(win.localStorage, ATTRIBUTION_STORAGE_KEY);
  safeRemove(win.sessionStorage, SESSION_STORAGE_KEY);
}

// Aplica un retiro parcial: sin marketing se descartan los click ids; sin ningún permiso, todo.
export function pruneAttribution(choice: ConsentChoice, win: AttributionWindow, now: number = Date.now()): void {
  if (!hasAnyConsent(choice)) {
    clearAttribution(win);
    return;
  }
  const store = readAttributionStore(win, now);
  if (!store) return;
  safeSet(
    win.localStorage,
    ATTRIBUTION_STORAGE_KEY,
    JSON.stringify({ ...store, first: restrictTouch(store.first, choice), last: restrictTouch(store.last, choice) }),
  );
}

export function newSessionId(now: number = Date.now()): string {
  return `s_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// Identificador de sesión: solo con consentimiento. Vive en sessionStorage (se pierde al cerrar la pestaña).
export function getSessionId(win: AttributionWindow, choice: ConsentChoice, now: number = Date.now()): string {
  if (!hasAnyConsent(choice)) return '';
  const existing = safeGet(win.sessionStorage, SESSION_STORAGE_KEY);
  if (existing && /^s_[a-z0-9_]{6,40}$/.test(existing)) return existing;
  const id = newSessionId(now);
  safeSet(win.sessionStorage, SESSION_STORAGE_KEY, id);
  return id;
}

// Persiste el touch actual. first-touch se escribe una sola vez; last-touch solo se reemplaza si el
// touch trae señal de campaña o referrer externo (una navegación interna no pisa la campaña).
export function captureAttribution(
  win: AttributionWindow,
  choice: ConsentChoice,
  touch: AttributionTouch,
  now: number = Date.now(),
): AttributionStore | null {
  if (!hasAnyConsent(choice)) return null;
  const current = restrictTouch(touch, choice);
  const store = readAttributionStore(win, now);
  const next: AttributionStore = store
    ? {
        v: ATTRIBUTION_VERSION,
        first: restrictTouch(store.first, choice),
        last: hasCampaignSignal(current) ? current : restrictTouch(store.last, choice),
        ts: store.ts,
      }
    : { v: ATTRIBUTION_VERSION, first: current, last: current, ts: now };
  safeSet(win.localStorage, ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  getSessionId(win, choice, now);
  return next;
}

export type SubmitAttribution = {
  v: number;
  consent: { analytics: boolean; marketing: boolean };
  session_id: string;
  first: AttributionTouch;
  last: AttributionTouch;
  // Cookies de Meta (solo con consentimiento de marketing): base para una futura Conversions API.
  fbp?: string;
  fbc?: string;
};

// Payload que viaja al servidor con cada formulario. Sin consentimiento: '' (no viaja nada).
export function collectAttributionForSubmit(
  win: AttributionWindow,
  choice: ConsentChoice | null,
  cookieString = '',
  now: number = Date.now(),
): string {
  if (!choice || !hasAnyConsent(choice)) return '';
  const store = readAttributionStore(win, now);
  if (!store) return '';
  const payload: SubmitAttribution = {
    v: ATTRIBUTION_VERSION,
    consent: { analytics: choice.analytics, marketing: choice.marketing },
    session_id: getSessionId(win, choice, now),
    first: restrictTouch(store.first, choice),
    last: restrictTouch(store.last, choice),
  };
  if (choice.marketing) {
    const fbp = cookieValue(cookieString, '_fbp');
    const fbc = cookieValue(cookieString, '_fbc');
    if (fbp) payload.fbp = cleanValue(fbp, 120);
    if (fbc) payload.fbc = cleanValue(fbc, 300);
  }
  return JSON.stringify(payload);
}

function cookieValue(cookieString: string, name: string): string {
  for (const part of String(cookieString || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx !== -1 && part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return '';
}

// Validación del payload recibido en el servidor (nunca se confía en el cliente).
export function parseSubmitAttribution(raw: unknown): SubmitAttribution | null {
  if (typeof raw !== 'string' || !raw || raw.length > 6000) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.v !== ATTRIBUTION_VERSION) return null;
    const first = sanitizeTouch(data.first);
    const last = sanitizeTouch(data.last);
    if (!first || !last) return null;
    const consent = (data.consent || {}) as Record<string, unknown>;
    const parsed: SubmitAttribution = {
      v: ATTRIBUTION_VERSION,
      consent: { analytics: consent.analytics === true, marketing: consent.marketing === true },
      session_id: /^s_[a-z0-9_]{6,40}$/.test(String(data.session_id)) ? String(data.session_id) : '',
      first,
      last,
    };
    // Sin consentimiento declarado no se acepta nada (defensa ante payloads manipulados).
    if (!hasAnyConsent(parsed.consent)) return null;
    if (!parsed.consent.marketing) {
      parsed.first = restrictTouch(first, parsed.consent);
      parsed.last = restrictTouch(last, parsed.consent);
    } else {
      const fbp = cleanValue(data.fbp, 120);
      const fbc = cleanValue(data.fbc, 300);
      if (fbp) parsed.fbp = fbp;
      if (fbc) parsed.fbc = fbc;
    }
    return parsed;
  } catch {
    return null;
  }
}
