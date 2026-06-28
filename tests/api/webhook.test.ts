import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del data layer (evita Supabase real) y de los logs.
const { dbUpsertProperty, dbDeleteProperty } = vi.hoisted(() => ({
  dbUpsertProperty: vi.fn(async () => {}),
  dbDeleteProperty: vi.fn(async () => {}),
}));
vi.mock('@/lib/db/properties', () => ({ dbUpsertProperty, dbDeleteProperty }));
vi.mock('@/lib/db/logs', () => ({ dbLogIntegration: vi.fn(async () => {}) }));

import { handle2ClicsWebhook } from '@/lib/crm/handle-webhook';
import { _resetRateLimit } from '@/lib/security/ratelimit';

// vitest.config define CRM_HASH='testhash'
const HASH = 'testhash';

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/2clics/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const PROP = {
  action: 'add_property',
  hash: HASH,
  prop_id: '5001',
  id_prop_houzez_cli: '5001',
  titulo: 'Departamento en Nordelta',
  operacion: 'venta',
  tipo: 'departamento',
  precio_propiedad: '250000',
  moneda_propiedad: 'USD',
  pais: 'Argentina',
  ciudad: 'Tigre',
  descripcion: 'Lindo depto',
};

beforeEach(() => {
  _resetRateLimit();
  dbUpsertProperty.mockClear();
  dbDeleteProperty.mockClear();
});

describe('handle2ClicsWebhook', () => {
  it('rechaza content-type no JSON → 415', async () => {
    const r = await handle2ClicsWebhook(req(PROP, { 'content-type': 'text/plain' }));
    expect(r.status).toBe(415);
  });

  it('hash inválido → 403', async () => {
    const r = await handle2ClicsWebhook(req({ getprop: true, prop: { ...PROP, hash: 'wrong' } }));
    expect(r.status).toBe(403);
    expect(await r.text()).toBe('INVALID_HASH');
    expect(dbUpsertProperty).not.toHaveBeenCalled();
  });

  it('falta getprop → 400', async () => {
    const r = await handle2ClicsWebhook(req({ prop: PROP }));
    expect(r.status).toBe(400);
  });

  it('add_property válido → upsert + devuelve id|url', async () => {
    const r = await handle2ClicsWebhook(req({ getprop: true, prop: PROP }));
    expect(r.status).toBe(200);
    expect(dbUpsertProperty).toHaveBeenCalledOnce();
    const out = await r.text();
    expect(out).toContain('5001');
    expect(out).toContain('/propiedad?id=');
  });

  it('update_property válido → upsert', async () => {
    const r = await handle2ClicsWebhook(
      req({ getprop: true, prop: { ...PROP, action: 'update_property' } }),
    );
    expect(r.status).toBe(200);
    expect(dbUpsertProperty).toHaveBeenCalledOnce();
  });

  it('del_property → DELETE físico + SUCCESS', async () => {
    const r = await handle2ClicsWebhook(
      req({ getprop: true, prop: { ...PROP, action: 'del_property' } }),
    );
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('SUCCESS');
    expect(dbDeleteProperty).toHaveBeenCalledOnce();
    expect(dbDeleteProperty).toHaveBeenCalledWith('5001');
  });

  it('acción desconocida → 400', async () => {
    const r = await handle2ClicsWebhook(
      req({ getprop: true, prop: { ...PROP, action: 'frobnicate' } }),
    );
    expect(r.status).toBe(400);
  });

  it('rate limit: 121ª llamada → 429', async () => {
    for (let i = 0; i < 120; i++) {
      await handle2ClicsWebhook(req({ getprop: true, prop: PROP }));
    }
    const r = await handle2ClicsWebhook(req({ getprop: true, prop: PROP }));
    expect(r.status).toBe(429);
  });
});
