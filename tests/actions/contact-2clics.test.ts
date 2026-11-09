import { describe, it, expect, beforeEach, vi } from 'vitest';

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['x-forwarded-for', '11.22.33.44'],
      ['user-agent', HUMAN_UA],
    ]),
}));

const { sendEmail, sendLeadMessage } = vi.hoisted(() => ({
  sendEmail: vi.fn(
    async (_args: { to: string; subject: string; html: string }) =>
      ({ ok: true, result: {} }) as { ok: boolean; error?: string },
  ),
  sendLeadMessage: vi.fn(
    async (..._args: unknown[]) => ({ status: 'success' }) as { status?: string },
  ),
}));
vi.mock('@/lib/resend', () => ({ sendEmail }));
vi.mock('@/lib/2clics/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/2clics/client')>()),
  twoclicsClient: { sendLeadMessage },
}));

import {
  TwoclicsApiError,
  TwoclicsNetworkError,
  TwoclicsTimeoutError,
} from '@/lib/2clics/client';
import { MissingTwoclicsCredentialsError } from '@/lib/2clics/config';
import { submitContact } from '@/actions/contact';
import { _resetRateLimit } from '@/lib/security/ratelimit';

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

const VALID = {
  nombre: 'Ana',
  apellido: 'García',
  email: 'ana@example.com',
  telefono: '+54 9 11 6724-0353',
  motivo: 'Inversión inmobiliaria',
  mensaje: 'Quiero invertir',
  page_location: 'https://www.garciainversionesinmobiliarias.com.ar/contacto',
  utm_source: 'meta',
  utm_campaign: 'camp-secreta',
};

const REVIEW_MESSAGE =
  'Recibimos tu consulta y la vamos a revisar. Te contactaremos a la brevedad.';

beforeEach(() => {
  _resetRateLimit();
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ ok: true });
  sendLeadMessage.mockReset();
  sendLeadMessage.mockResolvedValue({ status: 'success' });
});

describe('submitContact → 2Clics', () => {
  it('envío exitoso: va a 2Clics sin propiedad, sin reintentos, y no manda email', async () => {
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Consulta recibida correctamente.');
    expect(r.event_id).toBeTruthy();

    expect(sendLeadMessage).toHaveBeenCalledOnce();
    const [region, input, options] = sendLeadMessage.mock.calls[0] as [
      string,
      Record<string, unknown>,
      { retries: number },
    ];
    expect(region).toBe('AR');
    expect(options).toEqual({ retries: 0 }); // escritura: nunca se reintenta
    expect(input).toMatchObject({ name: 'Ana García', email: 'ana@example.com' });
    // Sin asociación artificial a propiedad/desarrollo/agente.
    expect(input).not.toHaveProperty('property_app_id');
    expect(input).not.toHaveProperty('development_app_id');
    expect(input).not.toHaveProperty('agent');
    // Contexto comercial mínimo; sin UTM completas (eso es del Attribution Hub).
    const message = String(input.message);
    expect(message).toContain('Quiero invertir');
    expect(message).toContain('Origen: Formulario web');
    expect(message).toContain(`Ref: ${r.event_id}`); // trazabilidad con logs y emails
    expect(message).toContain('Motivo: Inversión inmobiliaria');
    expect(message).toContain('Página: https://www.garciainversionesinmobiliarias.com.ar/contacto');
    expect(message).not.toContain('meta');
    expect(message).not.toContain('camp-secreta');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('consulta sin mensaje: usa un texto por defecto (la API exige message)', async () => {
    await submitContact(fd({ ...VALID, mensaje: '' }));
    const input = sendLeadMessage.mock.calls[0][1] as { message: string };
    expect(input.message).toContain('consulta general');
  });

  it('falla de API (4xx): respaldo por email, sin reintento, ok al usuario', async () => {
    sendLeadMessage.mockRejectedValueOnce(new TwoclicsApiError('bad request', 400));
    const r = await submitContact(fd(VALID));

    expect(r.ok).toBe(true);
    expect(r.message).toBe(REVIEW_MESSAGE); // recibida para revisión, no "creada en el CRM"
    expect(r.event_id).toBeTruthy();
    expect(sendLeadMessage).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('alertas@test.local');
    expect(mail.html).toContain('ana@example.com');
    expect(mail.html).toContain('No se pudo crear el negocio en 2Clics');
    expect(mail.subject).not.toContain('VERIFICAR');
  });

  it('API responde status "fail": se trata como fallo, con respaldo por email', async () => {
    sendLeadMessage.mockResolvedValueOnce({ status: 'fail' });
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0].html).toContain('No se pudo crear el negocio');
  });

  it('timeout: resultado incierto → un solo intento, email "VERIFICAR", sin afirmar que se creó', async () => {
    sendLeadMessage.mockRejectedValueOnce(new TwoclicsTimeoutError());
    const r = await submitContact(fd(VALID));

    expect(r.ok).toBe(true);
    expect(r.message).toBe(REVIEW_MESSAGE); // no afirma que el negocio exista
    expect(sendLeadMessage).toHaveBeenCalledOnce(); // sin reintento automático
    const mail = sendEmail.mock.calls[0][0];
    expect(mail.subject).toContain('VERIFICAR en 2Clics');
    expect(mail.html).toContain('Resultado incierto');
    expect(mail.html).toContain('YA exista');
  });

  it('error de red o 5xx: también se considera incierto', async () => {
    sendLeadMessage.mockRejectedValueOnce(new TwoclicsNetworkError('net'));
    await submitContact(fd(VALID));
    expect(sendEmail.mock.calls[0][0].subject).toContain('VERIFICAR');

    _resetRateLimit();
    sendEmail.mockClear();
    sendLeadMessage.mockRejectedValueOnce(new TwoclicsApiError('boom', 503));
    await submitContact(fd(VALID));
    expect(sendEmail.mock.calls[0][0].subject).toContain('VERIFICAR');
  });

  it('2Clics y Resend fallan: error controlado al usuario (nunca éxito falso)', async () => {
    sendLeadMessage.mockRejectedValueOnce(new TwoclicsTimeoutError());
    sendEmail.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(false);
    expect(r.event_id).toBeUndefined();
    expect(r.message).toContain('No pudimos procesar tu consulta en este momento');
  });

  it('credenciales de 2Clics ausentes: cae a email de respaldo', async () => {
    sendLeadMessage.mockRejectedValueOnce(new MissingTwoclicsCredentialsError('AR' as never));
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});
