'use server';

import { headers } from 'next/headers';
import { checkRate } from '@/lib/security/ratelimit';
import { recordLeadAttribution } from '@/lib/db/attribution';
import { parseSubmitAttribution } from '@/lib/attribution';
import { buildLeadAttributionRow, resolveAssetKey, resolveAttributionAsset } from '@/lib/attribution-server';
import { isValidWhatsAppRef } from '@/lib/whatsapp-ref';
import { isProductionRuntime } from '@/lib/runtime-env';

// ── Server Action: registro del clic en un enlace de WhatsApp ────────────────
// Guarda UNA fila en `lead_attribution` (sin datos personales): lead_type `whatsapp_click`, event_id =
// referencia «GI-XXXXXX» que viaja en el mensaje preparado. Un clic NO confirma que el mensaje se
// haya enviado: el estado «mensaje recibido» queda vacío (NO MEDIDO TODAVÍA) hasta que una
// integración autorizada lo confirme. La clave única de `event_id` evita duplicados.
// Sin consentimiento solo se guarda el registro operativo (referencia, activo, página): la atribución
// de campaña llega únicamente si el visitante aceptó (la validación del payload la descarta si no).

export type WhatsAppClickInput = {
  ref: string;
  page_location?: string;
  property_id?: number;
  attribution?: string;
};

export type WhatsAppClickResult = { ok: boolean; simulated?: boolean };

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
  const pageLocation = typeof input.page_location === 'string' ? input.page_location.slice(0, 500) : undefined;
  const asset = resolveAttributionAsset({ propertyAppId: input.property_id, pageLocation, attribution });

  await recordLeadAttribution(
    buildLeadAttributionRow({
      eventId: ref,
      leadType: 'whatsapp_click',
      formName: 'WhatsApp',
      crmStatus: 'not_applicable',
      attribution,
      asset,
      pageLocation,
      assetKey: resolveAssetKey({ asset, pageLocation }),
    }),
  );
  return { ok: true };
}
