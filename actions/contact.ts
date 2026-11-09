'use server';

import { headers } from 'next/headers';
import { env } from '@/lib/env';
import {
  escapeHtml,
  isValidEmail,
  isValidPhone,
  MAX_LENGTHS,
  MOTIVOS_PERMITIDOS,
} from '@/lib/security/sanitize';
import { isBotRequest, isSpamContent, isTooFast } from '@/lib/security/antibot';
import { checkRate } from '@/lib/security/ratelimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { buildGeneralInquiryInput, sendGeneralInquiry } from '@/lib/2clics/general-inquiry';
import { dbLogIntegration } from '@/lib/db/logs';
import { sendEmail } from '@/lib/resend';
import { createEventId } from '@/lib/tracking';
import { captureError } from '@/lib/observability';

// ── Server Action: formulario de contacto ────────────────────────────────────
// Validaciones y respuestas silenciosas anti-bot con paridad con legacy/server.js POST /api/contact.
// Destino comercial: External API de 2Clics (`POST /api/lead/message`, sin propiedad). Resend queda
// como respaldo controlado: solo se usa si 2Clics falla o su resultado es incierto.

export type ActionResult = { ok: boolean; message?: string; event_id?: string };

function toBody(formData: FormData): Record<string, string> {
  const body: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === 'string') body[k] = v;
  }
  return body;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || h.get('x-real-ip') || '';
}

// El log técnico nunca debe frenar ni romper la respuesta al usuario (Supabase puede estar lento).
async function safeLog(entry: Parameters<typeof dbLogIntegration>[0]): Promise<void> {
  try {
    await Promise.race([
      dbLogIntegration(entry),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (err) {
    console.error('[contact] log de integración falló:', (err as Error).message);
  }
}

export async function submitContact(formData: FormData): Promise<ActionResult> {
  const body = toBody(formData);
  const ip = await clientIp();
  const userAgent = (await headers()).get('user-agent') || '';

  // Rate limit: 5 envíos cada 15 minutos por IP
  if (!(await checkRate(ip, 'contact', 5, 15 * 60_000))) {
    return { ok: false, message: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' };
  }

  // Honeypot → silencioso
  if (isBotRequest(body)) return { ok: true };
  // Timing (< 3s) → silencioso
  if (isTooFast(body)) return { ok: true };
  // Spam por contenido → silencioso
  if (isSpamContent(body, userAgent)) return { ok: true };

  const {
    name,
    nombre,
    apellido,
    phone,
    telefono,
    email,
    message,
    mensaje,
    motivo,
  } = body;

  const fullName = String(name || [nombre, apellido].filter(Boolean).join(' ') || '').trim();
  const finalPhone = String(phone || telefono || '').trim();
  const finalEmail = String(email || '').trim();
  const finalMessage = String(message || mensaje || '').trim();
  const motivoVal = String(motivo || '').trim();

  // Validaciones de presencia
  if (!fullName) return { ok: false, message: 'El nombre es requerido.' };
  if (!finalPhone) return { ok: false, message: 'El teléfono es requerido.' };
  if (!finalEmail || !isValidEmail(finalEmail))
    return { ok: false, message: 'Ingresá un email válido.' };

  // Validaciones de longitud
  if (fullName.length > MAX_LENGTHS.name)
    return { ok: false, message: 'El nombre es demasiado largo.' };
  if (finalPhone.length > MAX_LENGTHS.phone)
    return { ok: false, message: 'El teléfono es demasiado largo.' };
  if (finalEmail.length > MAX_LENGTHS.email)
    return { ok: false, message: 'El email es demasiado largo.' };
  if (finalMessage.length > MAX_LENGTHS.message)
    return {
      ok: false,
      message: `El mensaje no puede superar los ${MAX_LENGTHS.message} caracteres.`,
    };

  // Formato de teléfono
  if (!isValidPhone(finalPhone))
    return { ok: false, message: 'Ingresá un teléfono válido (solo números, espacios, +, -, ()).' };

  // Motivo contra lista blanca
  if (motivoVal && !MOTIVOS_PERMITIDOS.has(motivoVal))
    return { ok: false, message: 'Motivo de consulta no válido.' };

  // Cloudflare Turnstile
  const turnstileToken = String(body['cf-turnstile-response'] || '');
  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk)
    return {
      ok: false,
      message: 'Verificación de seguridad fallida. Recargá la página e intentá nuevamente.',
    };

  const eventId = body.event_id || createEventId('lead');
  const leadType = 'consulta_general';
  const crmRef = `general:${eventId}`;

  // ── 2Clics: único destino comercial. Sin reintentos automáticos (evita duplicar negocios). ──
  const outcome = await sendGeneralInquiry(
    buildGeneralInquiryInput({
      fullName,
      phone: finalPhone,
      email: finalEmail,
      message: finalMessage,
      motivo: motivoVal,
      pageLocation: body.page_location,
      eventId,
    }),
  );

  if (outcome.status === 'sent') {
    await safeLog({ provider: '2clics', event_type: leadType, crm_app_id: crmRef, status: 'ok' });
    console.log('[contact] Lead enviado a 2Clics. event_id:', eventId);
    return { ok: true, event_id: eventId, message: 'Consulta recibida correctamente.' };
  }

  // ── Falla o resultado incierto: trazabilidad + respaldo por email ─────────────
  await safeLog({
    provider: '2clics',
    event_type: leadType,
    crm_app_id: crmRef,
    status: outcome.status === 'uncertain' ? 'uncertain' : 'error',
    error_message: outcome.reason,
  });
  console.error(`[contact] 2Clics ${outcome.status}. event_id: ${eventId} | motivo: ${outcome.reason}`);
  captureError(new Error(`2Clics general inquiry ${outcome.status}: ${outcome.reason}`), {
    source: 'contact-crm',
    event_id: eventId,
  });

  const uncertain = outcome.status === 'uncertain';
  const statusNote = uncertain
    ? `<p style="font-family:Arial;color:#b45309"><b>⚠ Resultado incierto en 2Clics (${escapeHtml(outcome.reason)}).</b> Puede que el negocio YA exista: buscá por email en 2Clics antes de cargarlo a mano.</p>`
    : `<p style="font-family:Arial;color:#b91c1c"><b>No se pudo crear el negocio en 2Clics (${escapeHtml(outcome.reason)}).</b> Cargalo manualmente.</p>`;

  const emailRes = await sendEmail({
    to: env.CONTACT_TO_EMAIL,
    subject: uncertain
      ? `Nueva consulta web — VERIFICAR en 2Clics — ${fullName}`
      : `Nueva consulta web (respaldo) — ${fullName}`,
    html: `<h2 style="font-family:Arial">Nueva consulta desde la web</h2>
      ${statusNote}
      <p style="font-family:Arial"><b>Nombre:</b> ${escapeHtml(fullName)}<br>
      <b>Email:</b> ${escapeHtml(finalEmail)}<br>
      <b>Teléfono:</b> ${escapeHtml(finalPhone)}<br>
      <b>Motivo:</b> ${escapeHtml(motivoVal || '(no indicado)')}<br>
      <b>Mensaje:</b> ${escapeHtml(finalMessage || '(sin mensaje)')}</p>
      <p style="font-family:Arial;color:#999;font-size:12px">event_id: ${escapeHtml(eventId)} · página: ${escapeHtml(String(body.page_location || ''))}</p>`,
  });

  await safeLog({
    provider: 'email-fallback',
    event_type: leadType,
    crm_app_id: crmRef,
    status: emailRes.ok ? 'ok' : 'error',
    error_message: emailRes.ok ? null : 'resend_failed',
  });

  if (!emailRes.ok) {
    console.error('[contact] Respaldo por email falló:', emailRes.error);
    captureError(new Error(`contact backup email failed: ${emailRes.error}`), {
      source: 'contact-fallback',
      event_id: eventId,
    });
    return {
      ok: false,
      message:
        'No pudimos procesar tu consulta en este momento. Por favor intentá de nuevo o escribinos por WhatsApp.',
    };
  }

  // Respaldo aceptado por Resend: la consulta llegó al equipo para revisión, pero NO se afirma que
  // exista como negocio en 2Clics (falló o el resultado es incierto).
  console.log('[contact] Lead recibido por email de respaldo. event_id:', eventId);
  return {
    ok: true,
    event_id: eventId,
    message: 'Recibimos tu consulta y la vamos a revisar. Te contactaremos a la brevedad.',
  };
}
