'use client';

import { useEffect } from 'react';
import { newEventId, trackEventOnce } from '@/lib/analytics';
import { runWhenAnalyticsReady } from '@/lib/when-analytics-ready';
import { clearWhatsAppAssetContext, setWhatsAppAssetContext } from '@/lib/whatsapp-context';

type PropertyViewTrackerProps = {
  contentType: 'property' | 'development' | 'investment';
  propertyId?: number | null;
  developmentSlug?: string | null;
  market?: string | null;
  // Nombre visible del activo: arma el texto del mensaje de WhatsApp («… sobre {nombre}. Ref: …»).
  assetLabel?: string | null;
};

// Evento `property_view` (GTM → GA4 `property_view` + Meta `ViewContent`): una vez por visualización
// de ficha de propiedad, desarrollo u oportunidad. Identifica el activo por IDs reales (property_id de
// 2Clics, slug curado), nunca por texto libre. Solo con consentimiento: si el visitante acepta DESPUÉS
// de cargar la ficha, la vista se registra en ese momento; si ya tenía consentimiento guardado y GTM
// todavía no creó el `dataLayer`, se reintenta unos instantes (lib/when-analytics-ready.ts).
// Siempre una sola vez por visualización (mismo event_id); la limpieza corta listener e intervalo.
export default function PropertyViewTracker({
  contentType,
  propertyId,
  developmentSlug,
  market,
  assetLabel,
}: PropertyViewTrackerProps) {
  // Activo de la página para los enlaces de WhatsApp (no depende del consentimiento: describe la página).
  useEffect(() => {
    const context = {
      key: `${contentType}:${propertyId ?? developmentSlug ?? ''}`,
      label: assetLabel ?? undefined,
      propertyId: propertyId ?? undefined,
    };
    setWhatsAppAssetContext(context);
    return () => clearWhatsAppAssetContext(context);
  }, [contentType, propertyId, developmentSlug, assetLabel]);

  useEffect(() => {
    const viewId = newEventId('view');
    return runWhenAnalyticsReady(() => {
      trackEventOnce('property_view', viewId, {
        content_type: contentType,
        property_id: propertyId ?? undefined,
        development_slug: developmentSlug ?? undefined,
        market: market ?? undefined,
        page_path: window.location.pathname,
      });
    });
  }, [contentType, propertyId, developmentSlug, market]);

  return null;
}
