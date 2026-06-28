import 'server-only';
import { env } from '@/lib/env';

// ── Construcción y envío de leads a 2Clics ───────────────────────────────────
// Portado de legacy/server.js:1209-1274 (la parte de payload + envío).

export type ContactInput = {
  fullName: string;
  phone: string;
  email: string;
  message: string;
  eventId: string;
  body: Record<string, unknown>;
  isPropertyInquiry: boolean;
  propId: number | null;
  devId: number | null;
};

export type CrmPayload = Record<string, unknown> & {
  property_app_id?: number;
  development_app_id?: number;
  agent?: number;
};

export function buildCrmPayload(input: ContactInput): { payload: CrmPayload } | { error: string } {
  const { fullName, phone, email, message, eventId, body, isPropertyInquiry, propId, devId } =
    input;

  const payload: CrmPayload = {
    name: fullName,
    phone,
    email,
    message: message || 'Consulta desde la web García Inversiones Inmobiliarias',
    hash: env.CRM_HASH,
    event_id: eventId,
    source: String(body.utm_source || '').slice(0, 200),
    medium: String(body.utm_medium || '').slice(0, 200),
    campaign: String(body.utm_campaign || '').slice(0, 200),
    gclid: String(body.gclid || '').slice(0, 200),
    gbraid: String(body.gbraid || '').slice(0, 200),
    wbraid: String(body.wbraid || '').slice(0, 200),
    fbclid: String(body.fbclid || '').slice(0, 200),
    lead_type:
      (body.lead_type as string) || (isPropertyInquiry ? 'consulta_propiedad' : 'consulta_general'),
    form_name: String(body.form_name || '').slice(0, 100),
  };

  if (propId && !isNaN(propId) && propId > 0) {
    payload.property_app_id = propId;
  } else if (devId && !isNaN(devId) && devId > 0) {
    payload.development_app_id = devId;
  } else {
    if (!env.CRM_AGENT_ID) {
      console.error('[contact] CRM_AGENT_ID no configurado — lead general rechazado.');
      return { error: 'CRM_AGENT_ID no configurado' };
    }
    payload.agent = env.CRM_AGENT_ID;
  }

  return { payload };
}

export type CrmSendResult = { ok: boolean; status: number | null; error: string | null };

// Envío a 2Clics — único destino de leads comerciales (timeout 8s) — server.js:1259-1274
export async function sendLeadToCrm(payload: CrmPayload): Promise<CrmSendResult> {
  let ok = false;
  let status: number | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(env.CRM_MESSAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    ok = response.ok;
    status = response.status;
    if (!ok) error = `HTTP ${status}`;
  } catch (err) {
    error = (err as Error).name === 'AbortError' ? 'timeout' : 'network_error';
  }

  return { ok, status, error };
}
