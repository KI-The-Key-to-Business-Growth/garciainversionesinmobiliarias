import { compactText } from '@/lib/2clics/format';
import { isBotRequest, isSpamContent, isTooFast } from '@/lib/security/antibot';
import { isValidEmail, isValidPhone, MAX_LENGTHS } from '@/lib/security/sanitize';
import type { TwoclicsLeadMessageInput, TwoclicsRegion } from '@/lib/2clics/types';

export type PropertyInquiryState = {
  ok: boolean;
  message?: string;
  event_id?: string;
};

export type PropertyInquiryLead = {
  region: TwoclicsRegion;
  input: TwoclicsLeadMessageInput;
};

export type PropertyInquiryBuildResult =
  | { ok: true; payload: PropertyInquiryLead }
  | { ok: false; state: PropertyInquiryState; silent?: boolean };

const DEFAULT_PROPERTY_MESSAGE = 'Hola, quiero recibir mas informacion sobre esta propiedad.';

function bodyFromFormData(formData: FormData): Record<string, string> {
  const body: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') body[key] = value;
  }
  return body;
}

function stringField(body: Record<string, string>, key: string, maxLength = 500): string {
  return String(body[key] || '').trim().slice(0, maxLength);
}

function parsePropertyId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseRegion(value: string): TwoclicsRegion {
  return value === 'US' ? 'US' : 'AR';
}

function normalizeUrl(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString().slice(0, 500);
  } catch {
    return '';
  }
}

function buildMessage(message: string, propertyTitle: string, pageUrl: string): string {
  return compactText(
    [
      message || DEFAULT_PROPERTY_MESSAGE,
      compactText([propertyTitle ? `Propiedad: ${propertyTitle}` : '', pageUrl ? `URL: ${pageUrl}` : ''], '\n'),
    ],
    '\n\n',
  );
}

export function buildPropertyInquiryLead(
  formData: FormData,
  userAgent = '',
): PropertyInquiryBuildResult {
  const body = bodyFromFormData(formData);

  if (isBotRequest(body) || isTooFast(body) || isSpamContent(body, userAgent)) {
    return { ok: false, state: { ok: true }, silent: true };
  }

  const propertyId = parsePropertyId(stringField(body, 'property_app_id', 32));
  const name = stringField(body, 'name', MAX_LENGTHS.name + 20);
  const email = stringField(body, 'email', MAX_LENGTHS.email + 20);
  const phone = stringField(body, 'phone', MAX_LENGTHS.phone + 20);
  const rawMessage = stringField(body, 'message', MAX_LENGTHS.message + 20);
  const propertyTitle = stringField(body, 'property_title', 180);
  const pageUrl = normalizeUrl(stringField(body, 'page_url', 520));

  if (!propertyId) {
    return { ok: false, state: { ok: false, message: 'No pudimos identificar la propiedad.' } };
  }
  if (!name) return { ok: false, state: { ok: false, message: 'El nombre es requerido.' } };
  if (!phone) return { ok: false, state: { ok: false, message: 'El telefono es requerido.' } };
  if (!email || !isValidEmail(email)) {
    return { ok: false, state: { ok: false, message: 'Ingresa un email valido.' } };
  }
  if (name.length > MAX_LENGTHS.name) {
    return { ok: false, state: { ok: false, message: 'El nombre es demasiado largo.' } };
  }
  if (phone.length > MAX_LENGTHS.phone) {
    return { ok: false, state: { ok: false, message: 'El telefono es demasiado largo.' } };
  }
  if (email.length > MAX_LENGTHS.email) {
    return { ok: false, state: { ok: false, message: 'El email es demasiado largo.' } };
  }
  if (rawMessage.length > MAX_LENGTHS.message) {
    return {
      ok: false,
      state: { ok: false, message: `El mensaje no puede superar los ${MAX_LENGTHS.message} caracteres.` },
    };
  }
  if (!isValidPhone(phone)) {
    return {
      ok: false,
      state: {
        ok: false,
        message: 'Ingresa un telefono valido (solo numeros, espacios, +, -, ()).',
      },
    };
  }

  return {
    ok: true,
    payload: {
      region: parseRegion(stringField(body, 'property_region', 4)),
      input: {
        name,
        email,
        phone,
        message: buildMessage(rawMessage, propertyTitle, pageUrl),
        property_app_id: propertyId,
      },
    },
  };
}
