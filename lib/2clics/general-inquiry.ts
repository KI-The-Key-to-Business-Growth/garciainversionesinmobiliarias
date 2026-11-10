import { compactText } from '@/lib/2clics/format';
import {
  twoclicsClient,
  TwoclicsApiError,
  TwoclicsNetworkError,
  TwoclicsTimeoutError,
} from '@/lib/2clics/client';
import { MissingTwoclicsCredentialsError } from '@/lib/2clics/config';
import type { TwoclicsLeadMessageInput, TwoclicsRegion } from '@/lib/2clics/types';

// ── Consulta general (sin propiedad) → External API de 2Clics ────────────────
// Misma API que las fichas (`POST /api/lead/message`), sin property/development. El spec público
// marca solo name/email/message como obligatorios; el destino (agent/realEstate) se completa en
// `sendLeadMessage` solo si hay configuración regional — acá no se inventa ningún ID.
// La atribución completa (UTM, click ids) queda para el Attribution Hub: al CRM solo viaja el
// contexto comercial mínimo (origen web, motivo y página de la consulta).

const DEFAULT_GENERAL_MESSAGE = 'Hola, quiero hacer una consulta general.';

export type GeneralInquiryFields = {
  fullName: string;
  phone: string;
  email: string;
  message: string;
  motivo?: string;
  pageLocation?: string;
  // Referencia de trazabilidad: permite cruzar el negocio del CRM con logs y emails de respaldo.
  eventId?: string;
};

export type GeneralInquiryOutcome =
  | { status: 'sent' }
  // 2Clics respondió que NO creó el negocio (4xx, credenciales faltantes, status "fail").
  | { status: 'failed'; reason: string }
  // Timeout / red / 5xx: no se sabe si el negocio se creó. No se reintenta ni se afirma nada.
  | { status: 'uncertain'; reason: string };

function normalizeUrl(value: string | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().slice(0, 500);
  } catch {
    return '';
  }
}

export function buildGeneralInquiryInput(fields: GeneralInquiryFields): TwoclicsLeadMessageInput {
  const context = compactText(
    [
      'Origen: Formulario web — consulta general',
      fields.motivo ? `Motivo: ${fields.motivo}` : '',
      normalizeUrl(fields.pageLocation) ? `Página: ${normalizeUrl(fields.pageLocation)}` : '',
      fields.eventId ? `Ref: ${fields.eventId.slice(0, 80)}` : '',
    ],
    '\n',
  );

  return {
    name: fields.fullName,
    email: fields.email,
    phone: fields.phone,
    message: compactText([fields.message || DEFAULT_GENERAL_MESSAGE, context], '\n\n'),
  };
}

export function sendGeneralInquiry(input: TwoclicsLeadMessageInput): Promise<GeneralInquiryOutcome> {
  return sendLeadOnce(input, 'AR');
}

// Envío de un lead a 2Clics SIN reintentos automáticos y con resultado clasificado. La API no
// documenta idempotencia: tras un timeout/red/5xx no se puede saber si el negocio se creó, así que
// jamás se reintenta una escritura. Lo usan el contacto general y las consultas de fichas.
export async function sendLeadOnce(
  input: TwoclicsLeadMessageInput,
  region: TwoclicsRegion = 'AR',
): Promise<GeneralInquiryOutcome> {
  try {
    const res = await twoclicsClient.sendLeadMessage(region, input, { retries: 0 });
    if (res?.status === 'fail') return { status: 'failed', reason: 'api_status_fail' };
    return { status: 'sent' };
  } catch (error) {
    if (error instanceof MissingTwoclicsCredentialsError) {
      return { status: 'failed', reason: 'missing_credentials' };
    }
    if (error instanceof TwoclicsTimeoutError) return { status: 'uncertain', reason: 'timeout' };
    if (error instanceof TwoclicsNetworkError) {
      return {
        status: 'uncertain',
        reason: error.causeCode ? `network:${error.causeCode}` : 'network',
      };
    }
    if (error instanceof TwoclicsApiError) {
      // 5xx: el backend pudo haber creado el negocio antes de fallar → incierto. 4xx: rechazo claro.
      return error.statusCode >= 500
        ? { status: 'uncertain', reason: `http:${error.statusCode}` }
        : { status: 'failed', reason: `http:${error.statusCode}` };
    }
    return { status: 'failed', reason: 'unexpected' };
  }
}
