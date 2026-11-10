'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

// Vista de /gracias-consulta: evento de engagement (`thank_you_page_view`). NO cuenta como lead:
// el lead es `generate_lead`, que se emite una sola vez desde el formulario tras confirmar la
// recepción. Recargar o entrar directo a esta página no genera conversiones.
export default function ThankYouTracking() {
  useEffect(() => {
    trackEvent('thank_you_page_view', {
      page_path: window.location.pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, []);
  return null;
}
