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

// CRM SIN configurar (CRM_HASH vacío) → debe activarse el fallback por email.
vi.mock('@/lib/env', () => ({
  env: {
    CRM_HASH: '',
    CRM_AGENT_ID: 0,
    CRM_MESSAGE_URL: 'https://crm.test/msg',
    CONTACT_TO_EMAIL: 'alertas@test.local',
    CONTACT_FROM_EMAIL: 'web@test.local',
  },
  isProduction: false,
  CANONICAL_BASE_URL: 'https://test.local',
}));

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async () => ({ ok: true, result: {} }) as { ok: boolean; error?: string }),
}));
vi.mock('@/lib/resend', () => ({ sendEmail }));

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
};

beforeEach(() => {
  _resetRateLimit();
  sendEmail.mockClear();
});

describe('submitContact — fallback por email cuando el CRM no está configurado', () => {
  it('envía el lead por email y confirma al usuario', async () => {
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(true);
    expect(r.message).toBe('Consulta recibida correctamente.');
    expect(sendEmail).toHaveBeenCalledOnce();
    const arg = sendEmail.mock.calls[0][0] as { to: string; subject: string; html: string };
    expect(arg.to).toBe('alertas@test.local');
    expect(arg.html).toContain('ana@example.com'); // datos del lead presentes
  });

  it('si el email falla, devuelve error controlado', async () => {
    sendEmail.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    const r = await submitContact(fd(VALID));
    expect(r.ok).toBe(false);
    expect(r.message).toContain('No pudimos procesar tu consulta en este momento');
  });
});
