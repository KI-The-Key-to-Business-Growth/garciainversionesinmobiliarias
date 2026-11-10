// ── Consentimiento de medición (modelo conservador: opt-in previo) ───────────
// Sin elección guardada NO se carga GTM, GA4, Meta Pixel ni etiquetas publicitarias. Los
// formularios, Turnstile, WhatsApp y todo lo esencial NO dependen de este módulo.
//
// La elección vive en una cookie propia (`gi_consent`, 180 días, SameSite=Lax) para que el snippet
// inline del <head> pueda leerla antes de cargar GTM. Este módulo es puro (sin DOM): las funciones
// de navegador reciben el "entorno" por parámetro, así se prueban en Node.

export const CONSENT_COOKIE = 'gi_consent';
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 180;
// Evento DOM que abre el panel de preferencias (lo usa el link del footer y /privacidad).
export const CONSENT_OPEN_EVENT = 'gi:open-consent';
// Evento DOM que se emite al cambiar la elección (detail: ConsentChoice).
export const CONSENT_CHANGE_EVENT = 'gi:consent-change';

export type ConsentChoice = {
  // GA4 (medición de uso del sitio).
  analytics: boolean;
  // Meta Pixel + Google Ads (publicidad y medición de campañas).
  marketing: boolean;
};

export type StoredConsent = ConsentChoice & { v: number; ts: number };

export const CONSENT_DENIED: ConsentChoice = { analytics: false, marketing: false };
export const CONSENT_ALL: ConsentChoice = { analytics: true, marketing: true };

// Señales de Google Consent Mode v2.
export type ConsentModeSignals = {
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  analytics_storage: 'granted' | 'denied';
};

export function toConsentModeSignals(choice: ConsentChoice): ConsentModeSignals {
  const ads = choice.marketing ? 'granted' : 'denied';
  return {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: choice.analytics ? 'granted' : 'denied',
  };
}

export function hasAnyConsent(choice: ConsentChoice | null | undefined): boolean {
  return Boolean(choice && (choice.analytics || choice.marketing));
}

// Formato compacto: `v=1&a=1&m=0&t=1731200000`. Cualquier cosa que no encaje se ignora (= sin
// elección → se vuelve a preguntar).
export function parseConsent(raw: string | null | undefined): StoredConsent | null {
  if (!raw) return null;
  let value = String(raw);
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  const params = new URLSearchParams(value);
  const v = Number(params.get('v'));
  const a = params.get('a');
  const m = params.get('m');
  const ts = Number(params.get('t'));
  if (v !== CONSENT_VERSION) return null; // versión distinta → volver a pedir
  if ((a !== '0' && a !== '1') || (m !== '0' && m !== '1')) return null;
  return { v, analytics: a === '1', marketing: m === '1', ts: Number.isFinite(ts) ? ts : 0 };
}

export function serializeConsent(choice: ConsentChoice, now: number = Date.now()): string {
  const body = `v=${CONSENT_VERSION}&a=${choice.analytics ? 1 : 0}&m=${choice.marketing ? 1 : 0}&t=${Math.floor(now / 1000)}`;
  return encodeURIComponent(body);
}

export function readCookie(cookieString: string, name: string): string | null {
  for (const part of String(cookieString || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

export function readConsentFromCookieString(cookieString: string): StoredConsent | null {
  return parseConsent(readCookie(cookieString, CONSENT_COOKIE));
}

export function buildConsentCookie(choice: ConsentChoice, now: number = Date.now(), secure = true): string {
  return (
    `${CONSENT_COOKIE}=${serializeConsent(choice, now)}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax` +
    (secure ? '; Secure' : '')
  );
}

// Cookies de medición/publicidad que se borran al retirar el consentimiento.
const MEASUREMENT_COOKIE_PATTERNS: RegExp[] = [
  /^_ga$/,
  /^_ga_/,
  /^_gid$/,
  /^_gat/,
  /^_gcl_/,
  /^_gac_/,
  /^_fbp$/,
  /^_fbc$/,
];

export function listMeasurementCookies(cookieString: string): string[] {
  const names: string[] = [];
  for (const part of String(cookieString || '').split(';')) {
    const name = part.split('=')[0].trim();
    if (name && MEASUREMENT_COOKIE_PATTERNS.some((re) => re.test(name))) names.push(name);
  }
  return names;
}

// Variantes de dominio con las que Google/Meta pudieron setear la cookie: host exacto y dominios
// padre (`.garciainversionesinmobiliarias.com.ar`, `.com.ar` no, porque el navegador lo rechaza).
export function cookieDomainVariants(hostname: string): string[] {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  const parts = host.split('.');
  const variants = new Set<string>(['']); // sin atributo Domain
  variants.add(host);
  for (let i = 1; i < parts.length - 1; i++) variants.add('.' + parts.slice(i).join('.'));
  return [...variants];
}

export function buildExpiredCookie(name: string, domain: string): string {
  return `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${domain ? `; Domain=${domain}` : ''}`;
}
