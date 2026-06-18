// ── Cloudflare Turnstile ─────────────────────────────────────────────────────
// Portado de legacy/server.js:258-284. Verificación humana real en formularios.
// Comportamiento auditado: sin clave configurada → skip (dev); error de red → fail-open.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || '';

  if (!secret) {
    // Sin clave configurada: skip (útil en desarrollo local)
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY no configurada — saltando validación.');
    return true;
  }
  if (!token) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || '' }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!data.success) console.warn('[Turnstile] Falló. Códigos:', data['error-codes']);
    return data.success === true;
  } catch (err) {
    // Error de red → fail open para no bloquear usuarios legítimos
    console.error('[Turnstile] Error de red:', (err as Error).message);
    return true;
  }
}
