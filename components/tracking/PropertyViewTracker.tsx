'use client';

import { useEffect } from 'react';
import { analyticsAllowed, newEventId, trackEventOnce } from '@/lib/analytics';
import { CONSENT_CHANGE_EVENT } from '@/lib/consent';

type PropertyViewTrackerProps = {
  contentType: 'property' | 'development' | 'investment';
  propertyId?: number | null;
  developmentSlug?: string | null;
  market?: string | null;
};

// Evento `property_view` (GTM → GA4 `property_view` + Meta `ViewContent`): una vez por visualización
// de ficha de propiedad, desarrollo u oportunidad. Identifica el activo por IDs reales
// (property_id de 2Clics, slug curado), nunca por texto libre. Solo con consentimiento: si el
// visitante acepta DESPUÉS de cargar la ficha, la vista se registra en ese momento (una sola vez).
export default function PropertyViewTracker({
  contentType,
  propertyId,
  developmentSlug,
  market,
}: PropertyViewTrackerProps) {
  useEffect(() => {
    const viewId = newEventId('view');
    const fire = () =>
      trackEventOnce('property_view', viewId, {
        content_type: contentType,
        property_id: propertyId ?? undefined,
        development_slug: developmentSlug ?? undefined,
        market: market ?? undefined,
        page_path: window.location.pathname,
      });

    if (analyticsAllowed()) {
      fire();
      return;
    }
    const onConsent = () => {
      if (analyticsAllowed()) fire();
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsent);
  }, [contentType, propertyId, developmentSlug, market]);

  return null;
}
