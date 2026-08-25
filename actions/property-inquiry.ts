'use server';

import { headers } from 'next/headers';
import { buildPropertyInquiryLead, type PropertyInquiryState } from '@/lib/2clics/property-inquiry';
import {
  twoclicsClient,
  TwoclicsApiError,
  TwoclicsNetworkError,
  TwoclicsTimeoutError,
} from '@/lib/2clics/client';
import { MissingTwoclicsCredentialsError } from '@/lib/2clics/config';
import { checkRate } from '@/lib/security/ratelimit';

function externalLeadErrorSummary(error: unknown): string {
  if (error instanceof MissingTwoclicsCredentialsError) return 'missing_credentials';
  if (error instanceof TwoclicsTimeoutError) return 'timeout';
  if (error instanceof TwoclicsNetworkError) return error.causeCode ? `network:${error.causeCode}` : 'network';
  if (error instanceof TwoclicsApiError) return `http:${error.statusCode}`;
  return 'unexpected';
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

  try {
    await twoclicsClient.sendLeadMessage(built.payload.region, built.payload.input);
    return { ok: true, message: 'Consulta recibida correctamente.' };
  } catch (error) {
    const summary = externalLeadErrorSummary(error);
    if (summary === 'unexpected') {
      console.error('[2clics] Property inquiry failed unexpectedly.');
    } else {
      console.warn(`[2clics] Property inquiry unavailable (${summary}).`);
    }
    return {
      ok: false,
      message:
        'No pudimos procesar tu consulta en este momento. Por favor intenta de nuevo o escribinos por WhatsApp.',
    };
  }
}
