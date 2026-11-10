import { hasAnyConsent, readConsentFromCookieString } from '@/lib/consent';

// ── Único punto de salida de eventos hacia el dataLayer (GTM) ────────────────
// - Sin consentimiento (analytics o marketing) NO se empuja nada: así un evento previo al "Aceptar"
//   no se reproduce después cuando GTM carga.
// - Sin `window.dataLayer` (localhost / previews: el snippet de lib/gtm.ts no lo inicializa) tampoco.
// - Nunca viajan datos personales: se descartan claves de contacto y valores con forma de email o
//   teléfono, aunque un caller se equivoque.
// - `trackEventOnce` evita duplicados (mismo evento + mismo event_id) dentro de la página.

type Params = Record<string, string | number | boolean | undefined | null>;

export type AnalyticsWindow = {
  document: { cookie: string };
  dataLayer?: unknown[];
};

// Claves de datos del visitante. `form_name`, `property_name` etc. NO son personales y se conservan.
const PII_KEY =
  /^(name|full_name|first_name|last_name|nombre|apellido|e-?mail|mail|phone|tel|telefono|celular|whatsapp_number|address|direccion|dni|message|mensaje|user_data|em|ph|fn|ln)$/i;
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_VALUE = /^\+?[\d\s().-]{8,}$/;

export function stripPii(params: Params): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (PII_KEY.test(key)) continue;
    if (typeof value === 'string' && (EMAIL_VALUE.test(value) || PHONE_VALUE.test(value.trim()))) continue;
    out[key] = value;
  }
  return out;
}

function browserWindow(): AnalyticsWindow | null {
  return typeof window === 'undefined' ? null : (window as unknown as AnalyticsWindow);
}

export function analyticsAllowed(win: AnalyticsWindow | null = browserWindow()): boolean {
  if (!win || !Array.isArray(win.dataLayer)) return false;
  try {
    return hasAnyConsent(readConsentFromCookieString(win.document.cookie));
  } catch {
    return false;
  }
}

export function newEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function trackEvent(event: string, params: Params = {}, win: AnalyticsWindow | null = browserWindow()): boolean {
  if (!win || !analyticsAllowed(win)) return false;
  win.dataLayer!.push({ event, ...stripPii(params) });
  return true;
}

const fired = new Set<string>();
export function trackEventOnce(
  event: string,
  eventId: string,
  params: Params = {},
  win: AnalyticsWindow | null = browserWindow(),
): boolean {
  const key = `${event}:${eventId}`;
  if (fired.has(key)) return false;
  const pushed = trackEvent(event, { ...params, event_id: eventId }, win);
  if (pushed) fired.add(key);
  return pushed;
}

export function _resetFiredEvents(): void {
  fired.clear();
}
