import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ getSupabase }));

import { dbInsertLeadAttribution, recordLeadAttribution } from '@/lib/db/attribution';
import { buildLeadAttributionRow } from '@/lib/attribution-server';

const ROW = buildLeadAttributionRow({
  eventId: 'lead_1',
  leadType: 'consulta_general',
  formName: 'Formulario principal',
  crmStatus: 'sent',
  attribution: null,
  asset: {},
});

beforeEach(() => {
  getSupabase.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('lead_attribution — best-effort, nunca rompe el envío del formulario', () => {
  it('sin Supabase configurado no hace nada', async () => {
    getSupabase.mockReturnValue(null);
    await expect(recordLeadAttribution(ROW)).resolves.toBeUndefined();
  });

  it('inserta en la tabla lead_attribution', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ insert }));
    getSupabase.mockReturnValue({ from });
    await dbInsertLeadAttribution(ROW);
    expect(from).toHaveBeenCalledWith('lead_attribution');
    expect(insert).toHaveBeenCalledWith(ROW);
  });

  it('tabla inexistente / error de Supabase: se registra y NO lanza', async () => {
    getSupabase.mockReturnValue({ from: () => ({ insert: async () => ({ error: { code: '42P01', message: 'relation does not exist' } }) }) });
    await expect(recordLeadAttribution(ROW)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('event_id duplicado (23505) se ignora en silencio', async () => {
    getSupabase.mockReturnValue({ from: () => ({ insert: async () => ({ error: { code: '23505', message: 'dup' } }) }) });
    await recordLeadAttribution(ROW);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('excepción inesperada: no propaga', async () => {
    getSupabase.mockReturnValue({ from: () => ({ insert: async () => { throw new Error('red caída'); } }) });
    await expect(recordLeadAttribution(ROW)).resolves.toBeUndefined();
  });

  it('Supabase colgado: corta por timeout y sigue', async () => {
    getSupabase.mockReturnValue({ from: () => ({ insert: () => new Promise(() => undefined) }) });
    const t0 = Date.now();
    await recordLeadAttribution(ROW, 50);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
