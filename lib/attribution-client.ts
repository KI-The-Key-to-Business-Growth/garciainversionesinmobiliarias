import { collectAttributionForSubmit } from '@/lib/attribution';
import { getStoredConsent, type ConsentWindow } from '@/lib/consent-client';

// Payload de atribución que se adjunta a los formularios (campo `attribution`). Vacío si el
// visitante no dio consentimiento: en ese caso no viaja ni se guarda nada de atribución.
export function getAttributionPayload(win: ConsentWindow = window as unknown as ConsentWindow): string {
  try {
    const consent = getStoredConsent(win);
    return collectAttributionForSubmit(win, consent, win.document.cookie);
  } catch {
    return '';
  }
}
