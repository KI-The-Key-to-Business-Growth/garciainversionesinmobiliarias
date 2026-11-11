import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { runRetention, isProductionRuntime } = vi.hoisted(() => ({
  runRetention: vi.fn(async (opts: { dryRun?: boolean }) => ({ ok: true, dryRun: !!opts.dryRun, matched: 0, deleted: 0 })),
  isProductionRuntime: vi.fn(() => true),
}));
vi.mock('@/lib/retention/whatsapp-clicks', () => ({ runWhatsAppClickRetention: runRetention }));
vi.mock('@/lib/runtime-env', () => ({ isProductionRuntime }));

import { GET } from '@/app/api/maintenance/retention/route';

const req = (auth?: string, query = '') =>
  new NextRequest(`https://www.garciainversionesinmobiliarias.com.ar/api/maintenance/retention${query}`, {
    headers: auth ? { authorization: auth } : {},
  });

const saved = { s: process.env.CRON_SECRET, e: process.env.RETENTION_ENABLED };
beforeEach(() => {
  runRetention.mockClear();
  isProductionRuntime.mockReturnValue(true);
  process.env.CRON_SECRET = 'secreto-de-prueba-123';
  process.env.RETENTION_ENABLED = 'true';
});
afterEach(() => {
  if (saved.s === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = saved.s;
  if (saved.e === undefined) delete process.env.RETENTION_ENABLED;
  else process.env.RETENTION_ENABLED = saved.e;
});

describe('/api/maintenance/retention', () => {
  it('está deshabilitada por defecto: sin CRON_SECRET o sin RETENTION_ENABLED no hace nada', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req('Bearer secreto-de-prueba-123'))).status).toBe(503);
    process.env.CRON_SECRET = 'secreto-de-prueba-123';
    process.env.RETENTION_ENABLED = 'false';
    expect((await GET(req('Bearer secreto-de-prueba-123'))).status).toBe(503);
    delete process.env.RETENTION_ENABLED;
    expect((await GET(req('Bearer secreto-de-prueba-123'))).status).toBe(503);
    expect(runRetention).not.toHaveBeenCalled();
  });

  it('exige la autorización exacta', async () => {
    for (const bad of [undefined, '', 'Bearer otro', 'secreto-de-prueba-123', 'Bearer secreto-de-prueba-1234', 'bearer secreto-de-prueba-123']) {
      expect((await GET(req(bad))).status, String(bad)).toBe(401);
    }
    expect(runRetention).not.toHaveBeenCalled();
  });

  it('en producción con autorización válida ejecuta la regla (borrando)', async () => {
    const res = await GET(req('Bearer secreto-de-prueba-123'));
    expect(res.status).toBe(200);
    expect(runRetention).toHaveBeenCalledWith({ dryRun: false });
  });

  it('?dry=1 fuerza el modo de prueba también en producción', async () => {
    await GET(req('Bearer secreto-de-prueba-123', '?dry=1'));
    expect(runRetention).toHaveBeenCalledWith({ dryRun: true });
  });

  it('fuera de producción (Preview/Development) NUNCA borra: modo de prueba forzado', async () => {
    isProductionRuntime.mockReturnValue(false);
    await GET(req('Bearer secreto-de-prueba-123'));
    expect(runRetention).toHaveBeenCalledWith({ dryRun: true });
  });

  it('devuelve 500 si la regla falla', async () => {
    runRetention.mockResolvedValueOnce({ ok: false, dryRun: false, matched: 0, deleted: 0 });
    expect((await GET(req('Bearer secreto-de-prueba-123'))).status).toBe(500);
  });
});
