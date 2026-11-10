import 'server-only';

// ── Cloudflare Turnstile ─────────────────────────────────────────────────────
// Verificación humana real en formularios. FAIL-CLOSED: si Cloudflare no responde, tarda más de 5 s
// o devuelve algo ilegible, el envío se RECHAZA (resultado 'unavailable'); nunca se saltea la
// protección. Un token vacío o rechazado es 'invalid'. Sin TURNSTILE_SECRET_KEY solo se saltea la
// validación (desarrollo local); en Vercel la clave está configurada.

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = 'ok' | 'invalid' | 'unavailable';

export const TURNSTILE_INVALID_MESSAGE =
  'Verificación de seguridad fallida. Recargá la página e intentá nuevamente.';
export const TURNSTILE_UNAVAILABLE_MESSAGE =
  'No pudimos completar la verificación de seguridad en este momento. No se envió tu consulta: intentá nuevamente en unos minutos o escribinos por WhatsApp.';

export function turnstileFailureMessage(result: Exclude<TurnstileResult, 'ok'>): string {
  return result === 'unavailable' ? TURNSTILE_UNAVAILABLE_MESSAGE : TURNSTILE_INVALID_MESSAGE;
}

export async function verifyTurnstileResult(token: string, ip: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY || '';

  if (!secret) {
    // Sin clave configurada: skip (útil en desarrollo local)
    console.warn('[Turnstile] TURNSTILE_SECRET_KEY no configurada — saltando validación.');
    return 'ok';
  }
  if (!token) return 'invalid';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip || '' }),
      signal: controller.signal,
    });
    // 5xx de Cloudflare: no es un veredicto sobre el token → no disponible.
    if (response.status >= 500) {
      console.error('[Turnstile] Cloudflare respondió', response.status, '— rechazando (fail-closed).');
      return 'unavailable';
    }
    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success === true) return 'ok';
    const codes = data['error-codes'] || [];
    console.warn('[Turnstile] Falló. Códigos:', codes);
    // Errores del lado de Cloudflare/configuración (no del usuario) → no disponible.
    return codes.includes('internal-error') ? 'unavailable' : 'invalid';
  } catch (err) {
    console.error('[Turnstile] Sin respuesta de Cloudflare — rechazando (fail-closed):', (err as Error).message);
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  return (await verifyTurnstileResult(token, ip)) === 'ok';
}
