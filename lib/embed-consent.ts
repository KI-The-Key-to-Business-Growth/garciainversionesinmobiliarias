import type { ConsentChoice } from '@/lib/consent';

// Los contenidos incrustados de terceros (Google Maps) se cargan solos únicamente si el visitante
// aceptó las cookies de publicidad; en cualquier otro caso esperan un clic explícito.
// Criterio propuesto, pendiente de revisión jurídica (ver docs/ai/PRIVACIDAD_REVISION.md).
export function shouldAutoLoadEmbed(consent: Pick<ConsentChoice, 'marketing'> | null | undefined): boolean {
  return consent?.marketing === true;
}
