import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';

// ── Email transaccional (Resend) ─────────────────────────────────────────────
// Portado de legacy/server.js:806-849. Devuelve { ok, ... } sin lanzar.

let _resend: Resend | null | undefined;
function getResend(): Resend | null {
  if (_resend !== undefined) return _resend;
  _resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  return _resend;
}

type SendEmailArgs = { to: string; subject: string; html: string };
type SendEmailResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string; details?: unknown };

export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<SendEmailResult> {
  const resend = getResend();

  if (!resend) {
    console.error('[sendEmail] RESEND_API_KEY no está configurada.');
    return { ok: false, error: 'RESEND_API_KEY no configurada' };
  }
  if (!to) {
    console.error('[sendEmail] CONTACT_TO_EMAIL no está configurado.');
    return { ok: false, error: 'Destinatario no configurado (CONTACT_TO_EMAIL)' };
  }

  try {
    const result = await resend.emails.send({ from: env.CONTACT_FROM_EMAIL, to, subject, html });

    if (result?.error) {
      console.error('Resend rechazó el envío:', result.error);
      return {
        ok: false,
        error: result.error.message || 'Resend rechazó el envío',
        details: result.error,
      };
    }

    console.log('[sendEmail] Email enviado correctamente. ID:', result.data?.id || '(sin id)');
    return { ok: true, result: result.data };
  } catch (error) {
    console.error('Error enviando email con Resend:', error);
    return { ok: false, error: (error as Error).message || 'Error desconocido enviando email' };
  }
}
