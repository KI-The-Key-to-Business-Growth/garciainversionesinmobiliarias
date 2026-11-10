'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution, extractTouch, hasCampaignSignal, type AttributionTouch } from '@/lib/attribution';
import { CONSENT_CHANGE_EVENT } from '@/lib/consent';
import { getStoredConsent, type ConsentWindow } from '@/lib/consent-client';

// Captura el origen de la visita (UTMs, IDs de campaña/conjunto/anuncio de Meta, click ids,
// landing y referrer). Solo se PERSISTE con consentimiento. Mientras no haya elección, el touch
// queda únicamente en memoria de esta pestaña: si el visitante acepta más tarde, se guarda el
// touch de entrada (no se pierde la campaña por haber decidido después).
let pendingTouch: AttributionTouch | null = null;

function persist(touch: AttributionTouch | null): void {
  if (!touch) return;
  const win = window as unknown as ConsentWindow;
  const consent = getStoredConsent(win);
  if (consent) captureAttribution(win, consent, touch);
}

export default function AttributionCapture() {
  const pathname = usePathname();

  useEffect(() => {
    const touch = extractTouch(window.location.href, pendingTouch ? '' : document.referrer);
    // Entrada a la web: siempre es el touch pendiente. Navegación interna: solo si trae campaña.
    if (!pendingTouch || hasCampaignSignal(touch)) pendingTouch = touch;
    persist(pendingTouch);
  }, [pathname]);

  useEffect(() => {
    const onChange = () => persist(pendingTouch);
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  return null;
}
