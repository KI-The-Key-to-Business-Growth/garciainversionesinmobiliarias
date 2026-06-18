// ── Protecciones anti-bot ────────────────────────────────────────────────────
// Portado de legacy/server.js: honeypot, timing check, filtro anti-spam por
// contenido. Paridad exacta con el comportamiento auditado (informe §5.2).

export type FormBody = Record<string, unknown>;

// Honeypot: el campo "website" debe estar vacío (oculto para humanos, bots lo llenan)
// server.js:253-255
export function isBotRequest(body: FormBody = {}): boolean {
  return typeof body.website === 'string' && body.website.length > 0;
}

// ── Filtro anti-spam por contenido — server.js:287-329 ───────────────────────
const SPAM_PHRASES = [
  'automated test', 'kindly disregard', 'this is a test message',
  'seo service', 'seo services', 'buy backlinks', 'crypto', 'casino',
  'loan offer', 'payday loan', 'viagra', 'cialis', 'free traffic',
  'backlink', 'guest post', 'adult content', 'make money fast',
];

export function isSpamContent(body: FormBody = {}, userAgent = ''): boolean {
  const combined = [
    body.nombre, body.apellido, body.name, body.email,
    body.telefono, body.phone, body.motivo, body.message, body.mensaje,
  ].filter(Boolean).join(' ').toLowerCase();

  // 1. Frases de spam conocidas
  if (SPAM_PHRASES.some((p) => combined.includes(p))) {
    console.warn('[spam] Frase detectada en payload');
    return true;
  }

  // 2. Demasiados links en el mensaje
  const msg = String(body.message || body.mensaje || '');
  if ((msg.match(/https?:\/\//gi) || []).length >= 3) {
    console.warn('[spam] Demasiados links en mensaje');
    return true;
  }

  // 3. Nombre genérico repetido (ej: "Test Test", "Xyz Xyz")
  const n = String(body.nombre || '').trim().toLowerCase();
  const a = String(body.apellido || '').trim().toLowerCase();
  if (n && a && n === a && n.length > 1) {
    console.warn('[spam] Nombre === apellido:', n);
    return true;
  }

  // 4. User-agent ausente o claramente automatizado
  const ua = String(userAgent || '').trim();
  if (!ua || ua.length < 10 || /^(curl|python|java|go-http|okhttp|axios|libwww)/i.test(ua)) {
    console.warn('[spam] User-agent sospechoso:', ua || '(vacío)');
    return true;
  }

  return false;
}

// ── Control de tiempo mínimo (timing check) — server.js:332-359 ──────────────
const TIMING_MIN_MS = 3_000; // menos de 3 segundos → sospechoso
const TIMING_MAX_MS = 7_200_000; // más de 2 horas → ignorar (sesión abandonada)

export function isTooFast(body: FormBody = {}): boolean {
  const raw = parseInt(String(body._form_loaded_at || ''), 10);

  // Sin timestamp, vacío o NaN → no bloquear (campo opcional)
  if (!raw || isNaN(raw) || raw <= 0) return false;

  const elapsed = Date.now() - raw;

  // Negativo o futuro → desfase de reloj cliente/servidor → no bloquear, solo loguear
  if (elapsed < 0) {
    console.warn('[timing] Timestamp inválido o futuro (clock skew):', elapsed, 'ms — sin bloqueo');
    return false;
  }

  // Demasiado viejo → sesión abandonada o valor corrupto → no bloquear
  if (elapsed > TIMING_MAX_MS) return false;

  // Demasiado rápido → bot probable
  if (elapsed < TIMING_MIN_MS) {
    console.warn('[timing] Formulario enviado demasiado rápido:', elapsed, 'ms');
    return true;
  }

  return false;
}
