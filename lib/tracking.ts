// ── Campos de tracking / atribución ──────────────────────────────────────────
// Portado de legacy/server.js:851-872.

export type TrackingBody = Record<string, unknown>;

const TRACKING_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'landing_page',
  'referrer',
  'first_visit_date',
  'last_visit_date',
  'current_page',
  'page_location',
  'page_title',
  'session_id',
  'event_id',
  'form_name',
  'lead_type',
];

export function pickTrackingFields(body: TrackingBody = {}): Record<string, unknown> {
  return TRACKING_KEYS.reduce<Record<string, unknown>>((acc, key) => {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') acc[key] = body[key];
    return acc;
  }, {});
}

// Genera un event_id único — server.js:802-804
export function createEventId(prefix = 'server'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Auditoría 2026-11-17: el event_id que manda el navegador se usa como clave de deduplicación y
// se guarda/envía a terceros. Solo se acepta con el formato que generamos nosotros; si no, se crea uno.
export function safeEventId(value: unknown, prefix = 'server'): string {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value) ? value : createEventId(prefix);
}
