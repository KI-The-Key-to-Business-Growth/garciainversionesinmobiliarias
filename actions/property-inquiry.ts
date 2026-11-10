'use server';

import { headers } from 'next/headers';
import { buildPropertyInquiryLead, type PropertyInquiryState } from '@/lib/2clics/property-inquiry';
import { sendLeadOnce } from '@/lib/2clics/general-inquiry';
import { checkRate } from '@/lib/security/ratelimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { escapeHtml } from '@/lib/security/sanitize';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/resend';
import { dbLogIntegration } from '@/lib/db/logs';
import { createEventId } from '@/lib/tracking';
import { captureError } from '@/lib/observability';
import { isProductionRuntime, NON_PRODUCTION_SUBMISSION_MESSAGE } from '@/lib/runtime-env';

// Consulta de ficha → External API de 2Clics (negocio asociado a la propiedad). Sin reintentos
// automáticos: la API no documenta idempotencia y un 5xx/timeout puede haber creado el negocio.
// Si 2Clics falla o el resultado es incierto, se avisa por email al equipo (respaldo) para revisar.

async function safeLog(entry: Parameters<typeof dbLogIntegration>[0]): Promise<void> {
  await Promise.race([
    dbLogIntegration(entry).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, 2000)),
  ]);
}

async function requestContext(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const xff = h.get('x-forwarded-for') || '';
  return {
    ip: xff.split(',')[0].trim() || h.get('x-real-ip') || '',
    userAgent: h.get('user-agent') || '',
  };
}

export async function submitPropertyInquiry(formData: FormData): Promise<PropertyInquiryState> {
  const { ip, userAgent } = await requestContext();
  const built = buildPropertyInquiryLead(formData, userAgent);

  if (!built.ok) return built.state;

  if (!(await checkRate(ip, 'property-inquiry', 5, 15 * 60_000))) {
    return { ok: false, message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' };
  }

  // Cloudflare Turnstile verificado en el servidor (token vacío o inválido → rechazo).
  const turnstileToken = String(formData.get('cf-turnstile-response') || '');
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return {
      ok: false,
      message: 'Verificación de seguridad fallida. Recargá la página e intentá nuevamente.',
    };
  }

  // Preview/Development comparten la API key de 2Clics con producción: no crear negocios reales.
  if (!isProductionRuntime()) {
    console.warn('[2clics] Entorno no productivo: consulta de propiedad simulada.');
    return { ok: true, message: NON_PRODUCTION_SUBMISSION_MESSAGE };
  }

  const eventId = createEventId('lead');
  const { region, input } = built.payload;
  const crmRef = `property:${input.property_app_id ?? 'n/a'}:${eventId}`;
  const outcome = await sendLeadOnce(
    { ...input, message: `${input.message}

Ref: ${eventId}` },
    region,
  );

  if (outcome.status === 'sent') {
    return { ok: true, event_id: eventId, message: 'Consulta recibida correctamente.' };
  }

  const uncertain = outcome.status === 'uncertain';
  console.warn(`[2clics] Property inquiry ${outcome.status} (${outcome.reason}). event_id: ${eventId}`);
  captureError(new Error(`2Clics property inquiry ${outcome.status}: ${outcome.reason}`), {
    source: 'property-inquiry-crm',
    event_id: eventId,
  });
  await safeLog({
    provider: '2clics',
    event_type: 'consulta_propiedad',
    crm_app_id: crmRef,
    status: uncertain ? 'uncertain' : 'error',
    error_message: outcome.reason,
  });

  const note = uncertain
    ? `<p style="font-family:Arial;color:#b45309"><b>⚠ Resultado incierto en 2Clics (${escapeHtml(outcome.reason)}).</b> Puede que el negocio YA exista: buscá por email en 2Clics antes de cargarlo a mano.</p>`
    : `<p style="font-family:Arial;color:#b91c1c"><b>No se pudo crear el negocio en 2Clics (${escapeHtml(outcome.reason)}).</b> Cargalo manualmente.</p>`;
  const emailRes = await sendEmail({
    to: env.CONTACT_TO_EMAIL,
    subject: uncertain
      ? `Consulta de propiedad — VERIFICAR en 2Clics — ${input.name}`
      : `Consulta de propiedad (respaldo) — ${input.name}`,
    html: `<h2 style="font-family:Arial">Nueva consulta de propiedad desde la web</h2>
      ${note}
      <p style="font-family:Arial"><b>Nombre:</b> ${escapeHtml(input.name)}<br>
      <b>Email:</b> ${escapeHtml(input.email)}<br>
      <b>Teléfono:</b> ${escapeHtml(input.phone || '')}<br>
      <b>Propiedad (app id):</b> ${escapeHtml(String(input.property_app_id ?? ''))}<br>
      <b>Mensaje:</b> ${escapeHtml(input.message)}</p>
      <p style="font-family:Arial;color:#999;font-size:12px">event_id: ${escapeHtml(eventId)}</p>`,
  });
  await safeLog({
    provider: 'email-fallback',
    event_type: 'consulta_propiedad',
    crm_app_id: crmRef,
    status: emailRes.ok ? 'ok' : 'error',
    error_message: emailRes.ok ? null : 'resend_failed',
  });

  if (!emailRes.ok) {
    captureError(new Error(`property inquiry backup email failed: ${emailRes.error}`), {
      source: 'property-inquiry-fallback',
      event_id: eventId,
    });
    return {
      ok: false,
      message:
        'No pudimos procesar tu consulta en este momento. Por favor intenta de nuevo o escribinos por WhatsApp.',
    };
  }

  return {
    ok: true,
    event_id: eventId,
    message: 'Recibimos tu consulta y la vamos a revisar. Te contactaremos a la brevedad.',
  };
}
