import {
  cleanValue,
  type AttributionTouch,
  type SubmitAttribution,
} from '@/lib/attribution';
import {
  getDevelopmentBySlug,
  getDevelopmentForPropertyId,
  getInvestmentOpportunityBySlug,
  isDevelopmentPublic,
} from '@/lib/site-curation';

// ── Atribución del lado servidor ─────────────────────────────────────────────
// Identifica el ACTIVO (desarrollo/propiedad) con IDs reales del registro curado (propertyId de
// 2Clics y slug de lib/site-curation.ts) — nunca por el nombre de la campaña o del anuncio — y arma
// (a) la nota comercial compacta que viaja en el mensaje al CRM y (b) la fila de `lead_attribution`.
// Nada de esto contiene datos personales.

export type AttributionAsset = {
  property_id?: number;
  development_slug?: string;
};

function parsePositiveInt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function assetFromPath(pathname: string): AttributionAsset {
  const dev = pathname.match(/^\/desarrollos\/([a-z0-9-]{1,80})\/?$/i);
  if (dev) {
    const development = getDevelopmentBySlug(dev[1]);
    return development && isDevelopmentPublic(development) ? { development_slug: development.slug } : {};
  }
  const prop = pathname.match(/^\/propiedades\/(\d{1,12})\/?$/);
  if (prop) {
    const property_id = parsePositiveInt(prop[1]);
    const development = getDevelopmentForPropertyId(property_id);
    return { property_id, ...(development ? { development_slug: development.slug } : {}) };
  }
  return {};
}

function pathOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

// Prioridad: propiedad explícita del formulario (ficha) → página donde se envió → landing de la
// campaña (último toque). Así el formulario general también hereda el desarrollo de la campaña.
export function resolveAttributionAsset(input: {
  propertyAppId?: number | string | null;
  pageLocation?: string;
  attribution?: SubmitAttribution | null;
}): AttributionAsset {
  const explicit = parsePositiveInt(input.propertyAppId);
  if (explicit) {
    const development = getDevelopmentForPropertyId(explicit);
    return { property_id: explicit, ...(development ? { development_slug: development.slug } : {}) };
  }
  for (const path of [pathOf(input.pageLocation), input.attribution?.last.landing_page, input.attribution?.first.landing_page]) {
    const asset = path ? assetFromPath(path) : {};
    if (asset.development_slug || asset.property_id) return asset;
  }
  return {};
}

// Clave estable del activo para análisis por activo (una sola convención para todo García):
//   inv:<slug>  oportunidad de inversión · prop:<propertyId>  propiedad · dev:<slug>  desarrollo.
// Sin activo identificable → null (consulta general/institucional). Se calcula con IDs y slugs reales
// del registro curado, nunca con el nombre de una campaña o de un anuncio.
export function resolveAssetKey(input: { asset: AttributionAsset; pageLocation?: string }): string | null {
  const path = pathOf(input.pageLocation);
  const inv = path.match(/^\/invertir\/([a-z0-9-]{1,80})\/?$/i);
  if (inv && getInvestmentOpportunityBySlug(inv[1].toLowerCase())) return `inv:${inv[1].toLowerCase()}`;
  const prop = path.match(/^\/propiedades\/(\d{1,12})\/?$/);
  if (prop) return `prop:${Number(prop[1])}`;
  if (input.asset.development_slug) return `dev:${input.asset.development_slug}`;
  if (input.asset.property_id) return `prop:${input.asset.property_id}`;
  return null;
}

function campaignTouch(attr: SubmitAttribution | null | undefined): AttributionTouch | null {
  if (!attr) return null;
  const hasSignal = (t: AttributionTouch) =>
    Boolean(t.utm_source || t.utm_campaign || t.campaign_id || t.adset_id || t.ad_id || t.gclid || t.fbclid);
  return [attr.last, attr.first].find(hasSignal) ?? null;
}

// Línea de contexto para el mensaje al CRM (visible para el equipo comercial). Solo con atribución
// de campaña real; nunca nombres de personas.
export function buildAttributionNote(
  attr: SubmitAttribution | null | undefined,
  asset: AttributionAsset = {},
): string {
  const touch = campaignTouch(attr);
  if (!touch) return '';
  const parts = [
    touch.utm_source || touch.utm_medium
      ? `${touch.utm_source || '?'} / ${touch.utm_medium || '?'}`
      : touch.gclid
        ? 'google / click'
        : touch.fbclid
          ? 'meta / click'
          : '',
    touch.utm_campaign ? `campaña: ${touch.utm_campaign}${touch.campaign_id ? ` (id ${touch.campaign_id})` : ''}` : touch.campaign_id ? `campaña id ${touch.campaign_id}` : '',
    touch.adset_id ? `conjunto id ${touch.adset_id}` : '',
    touch.ad_id ? `anuncio id ${touch.ad_id}` : '',
    asset.development_slug ? `desarrollo: ${asset.development_slug}` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `Atribución web: ${parts.join(' · ')}`.slice(0, 400);
}

export type LeadAttributionRow = {
  event_id: string;
  lead_type: string;
  form_name: string;
  crm_status: string;
  property_app_id: number | null;
  development_slug: string | null;
  consent_analytics: boolean;
  consent_marketing: boolean;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  placement: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  landing_page: string | null;
  referrer: string | null;
  page_path: string | null;
  // Solo lo escribe el registro de clics de WhatsApp (requiere el SQL 2026-11-11_whatsapp_ref.sql).
  asset_key?: string | null;
  first_touch: AttributionTouch | null;
  last_touch: AttributionTouch | null;
};

const orNull = (v: string | undefined): string | null => (v ? v : null);

// Fila de `lead_attribution` (sin datos personales). Sin consentimiento: solo el registro
// operativo del lead (tipo, activo, estado en el CRM) con los campos de atribución en NULL.
export function buildLeadAttributionRow(input: {
  eventId: string;
  leadType: string;
  formName: string;
  crmStatus: string;
  attribution: SubmitAttribution | null;
  asset: AttributionAsset;
  pageLocation?: string;
  assetKey?: string | null;
}): LeadAttributionRow {
  const a = input.attribution;
  const t = a?.last;
  return {
    event_id: cleanValue(input.eventId, 100),
    lead_type: cleanValue(input.leadType, 60),
    form_name: cleanValue(input.formName, 80),
    crm_status: cleanValue(input.crmStatus, 40),
    property_app_id: input.asset.property_id ?? null,
    development_slug: input.asset.development_slug ?? null,
    consent_analytics: a?.consent.analytics ?? false,
    consent_marketing: a?.consent.marketing ?? false,
    session_id: orNull(a?.session_id),
    utm_source: orNull(t?.utm_source),
    utm_medium: orNull(t?.utm_medium),
    utm_campaign: orNull(t?.utm_campaign),
    utm_content: orNull(t?.utm_content),
    utm_term: orNull(t?.utm_term),
    campaign_id: orNull(t?.campaign_id),
    adset_id: orNull(t?.adset_id),
    ad_id: orNull(t?.ad_id),
    placement: orNull(t?.placement),
    gclid: orNull(t?.gclid),
    gbraid: orNull(t?.gbraid),
    wbraid: orNull(t?.wbraid),
    fbclid: orNull(t?.fbclid),
    fbp: orNull(a?.fbp),
    fbc: orNull(a?.fbc),
    landing_page: orNull(t?.landing_page),
    referrer: orNull(t?.referrer),
    page_path: orNull(pathOf(input.pageLocation) || undefined),
    // Omitido (no null) cuando no aplica: los formularios no dependen de la columna nueva.
    ...(input.assetKey ? { asset_key: input.assetKey } : {}),
    first_touch: a?.first ?? null,
    last_touch: a?.last ?? null,
  };
}
