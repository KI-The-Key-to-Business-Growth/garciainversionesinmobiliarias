'use server';

import { headers } from 'next/headers';
import { checkRate } from '@/lib/security/ratelimit';
import { recordLeadAttribution } from '@/lib/db/attribution';
import { parseSubmitAttribution } from '@/lib/attribution';
import { hasAnyConsent } from '@/lib/consent';
import { WHATSAPP_CLICK_REQUIRES_CONSENT } from '@/lib/whatsapp-policy';
import { buildLeadAttributionRow, resolveAssetKey, resolveAttributionAsset } from '@/lib/attribution-server';
import { isValidWhatsAppRef } from '@/lib/whatsapp-ref';
import { isProductionRuntime } from '@/lib/runtime-env';

// ── Server Action: registro del clic en un enlace de WhatsApp ────────────────
// Guarda UNA fila en `lead_attribution` (sin datos personales): lead_type `whatsapp_click`, event_id =
// referencia «GI-XXXXXX» que viaja en el mensaje preparado. Un clic NO confirma que el mensaje se
// haya enviado: el estado «mensaje recibido» queda vacío (NO MEDIDO TODAVÍA) hasta que una
// integración autorizada lo confirme. La clave única de `event_id` evita duplicados.
// Política vigente (lib/whatsapp-policy.ts): SIN consentimiento no se guarda nada; con consentimiento
// la atribución de campaña respeta las reglas existentes (click ids y cookies de Meta solo con
// publicidad). Copiar el enlace NO es un clic: el navegador solo prepara el texto.

export type WhatsAppClickInput = {
  ref: string;
  page_location?: string;
  property_id?: number;
  attribution?: string;
  // Consentimiento leído de la cookie del sitio; solo se usa si no hay payload de atribución.
  consent?: { analytics?: boolean; marketing?: boolean };
};

export type WhatsAppClickResult = { ok: boolean; simulated?: boolean; skipped?: 'no_consent' };

async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || h.get('x-real-ip') || '';
}

export async function recordWhatsAppClick(input: WhatsAppClickInput): Promise<WhatsAppClickResult> {
  const ref = String(input?.ref ?? '').trim().toUpperCase();
  if (!isValidWhatsAppRef(ref)) return { ok: false };

  // Límite por IP: el clic es barato de falsificar, pero no debe poder inundar la tabla.
  if (!(await checkRate(await clientIp(), 'whatsapp-click', 40, 15 * 60_000))) return { ok: false };

  // Preview/Development comparten Supabase con producción: no escribir.
  if (!isProductionRuntime()) return { ok: true, simulated: true };

  const attribution = parseSubmitAttribution(typeof input.attribution === 'string' ? input.attribution : undefined);
  const declaredConsent = attribution
    ? attribution.consent
    : { analytics: input.consent?.analytics === true, marketing: input.consent?.marketing === true };
  if (WHATSAPP_CLICK_REQUIRES_CONSENT && !hasAnyConsent(declaredConsent)) return { ok: true, skipped: 'no_consent' };
  const pageLocation = typeof input.page_location === 'string' ? input.page_location.slice(0, 500) : undefined;
  const asset = resolveAttributionAsset({ propertyAppId: input.property_id, pageLocation, attribution });

  const row = buildLeadAttributionRow({
      eventId: ref,
      leadType: 'whatsapp_click',
      formName: 'WhatsApp',
      crmStatus: 'not_applicable',
      attribution,
      asset,
      pageLocation,
      assetKey: resolveAssetKey({ asset, pageLocation }),
  });
  // Refleja el consentimiento declarado aunque no haya habido touch de atribución que guardar.
  row.consent_analytics = declaredConsent.analytics;
  row.consent_marketing = declaredConsent.marketing;
  await recordLeadAttribution(row);
  return { ok: true };
}
