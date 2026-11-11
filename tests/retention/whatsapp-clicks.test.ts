import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_ROWS_PER_RUN,
  MIN_RETENTION_DAYS,
  RETENTION_RULE,
  runWhatsAppClickRetention,
  WHATSAPP_CLICK_RETENTION_DAYS,
} from '@/lib/retention/whatsapp-clicks';

type Call = { table: string; op: string; args: unknown[]; filters: Array<[string, ...unknown[]]> };

// Base simulada: registra tabla, operación y filtros de cada consulta, en orden.
function fakeDb(opts: { count?: number; deleteCount?: number; auditError?: boolean; deleteError?: boolean; countError?: boolean } = {}) {
  const calls: Call[] = [];
  const db = {
    from(table: string) {
      const call: Call = { table, op: '', args: [], filters: [] };
      calls.push(call);
      const builder: Record<string, unknown> = {};
      const chain = (name: string) => (...args: unknown[]) => {
        if (['eq', 'is', 'lt'].includes(name)) call.filters.push([name, ...args]);
        else if (name === 'select' && call.op === 'insert') call.args.push(['returning', ...args]);
        else {
          call.op = call.op || name;
          call.args.push(...args);
        }
        return builder;
      };
      for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'lt']) builder[m] = chain(m);
      builder.single = async () => (opts.auditError ? { data: null, error: { message: 'audit down' } } : { data: { id: 77 }, error: null });
      builder.then = (resolve: (v: unknown) => void) => {
        if (call.op === 'select') resolve(opts.countError ? { count: null, error: { message: 'count down' } } : { count: opts.count ?? 0, error: null });
        else if (call.op === 'delete') resolve(opts.deleteError ? { count: null, error: { message: 'delete down' } } : { count: opts.deleteCount ?? opts.count ?? 0, error: null });
        else resolve({ error: null });
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

const NOW = new Date('2026-12-01T12:00:00.000Z');
const CUTOFF_90 = '2026-09-02T12:00:00.000Z';

describe('conservación de clics de WhatsApp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa 90 días por defecto (propuesta de trabajo) y fija el corte a 90 días', async () => {
    expect(WHATSAPP_CLICK_RETENTION_DAYS).toBe(90);
    const { db } = fakeDb({ count: 0 });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    expect(r.retentionDays).toBe(90);
    expect(r.cutoff).toBe(CUTOFF_90);
  });

  it('borra SOLO clics de WhatsApp sin mensaje asociado y anteriores al corte, y solo en lead_attribution', async () => {
    const { db, calls } = fakeDb({ count: 5, deleteCount: 5 });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    expect(r).toMatchObject({ ok: true, dryRun: false, matched: 5, deleted: 5, rule: RETENTION_RULE });
    const del = calls.find((c) => c.op === 'delete')!;
    expect(del.table).toBe('lead_attribution');
    expect(del.filters).toEqual([
      ['eq', 'lead_type', 'whatsapp_click'],
      ['is', 'wa_message_received_at', null],
      ['lt', 'created_at', CUTOFF_90],
    ]);
    // El conteo previo usa exactamente las mismas condiciones.
    const count = calls.find((c) => c.op === 'select')!;
    expect(count.filters).toEqual(del.filters);
    // Ninguna otra tabla se borra ni se modifica (formularios, contactos, CRM).
    const tablesTouched = new Set(calls.map((c) => c.table));
    expect([...tablesTouched].sort()).toEqual(['lead_attribution', 'retention_audit']);
    expect(calls.filter((c) => c.op === 'delete').every((c) => c.table === 'lead_attribution')).toBe(true);
  });

  it('registra la auditoría ANTES de borrar y la completa después', async () => {
    const { db, calls } = fakeDb({ count: 3 });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    const order = calls.map((c) => `${c.table}:${c.op}`);
    expect(order).toEqual([
      'lead_attribution:select',
      'retention_audit:insert',
      'lead_attribution:delete',
      'retention_audit:update',
    ]);
    expect(r.auditId).toBe(77);
    const insert = calls.find((c) => c.op === 'insert')!;
    expect(insert.args[0]).toMatchObject({ rule: RETENTION_RULE, retention_days: 90, cutoff: CUTOFF_90, dry_run: false, matched: 3, status: 'started' });
    const update = calls.find((c) => c.op === 'update')!;
    expect(update.args[0]).toMatchObject({ deleted: 3, status: 'ok' });
    expect(update.filters).toEqual([['eq', 'id', 77]]);
  });

  it('si no puede registrar la auditoría, NO borra (falla cerrado)', async () => {
    const { db, calls } = fakeDb({ count: 4, auditError: true });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/auditor/i);
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
  });

  it('modo de prueba: cuenta y audita, pero no borra', async () => {
    const { db, calls } = fakeDb({ count: 9 });
    const r = await runWhatsAppClickRetention({ now: NOW, db, dryRun: true });
    expect(r).toMatchObject({ ok: true, dryRun: true, matched: 9, deleted: 0 });
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
    expect(calls.find((c) => c.op === 'insert')!.args[0]).toMatchObject({ dry_run: true });
    expect(calls.find((c) => c.op === 'update')!.args[0]).toMatchObject({ status: 'dry_run', deleted: 0 });
  });

  it('sin filas para borrar audita «nothing_to_delete» y no ejecuta el borrado', async () => {
    const { db, calls } = fakeDb({ count: 0 });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    expect(r).toMatchObject({ ok: true, matched: 0, deleted: 0 });
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
    expect(calls.find((c) => c.op === 'update')!.args[0]).toMatchObject({ status: 'nothing_to_delete' });
  });

  it('rechaza plazos menores al mínimo (un error de configuración no puede vaciar la tabla)', async () => {
    for (const days of [0, 1, 7, MIN_RETENTION_DAYS - 1, -5, 30.5]) {
      const { db, calls } = fakeDb({ count: 100 });
      const r = await runWhatsAppClickRetention({ now: NOW, db, retentionDays: days });
      expect(r.ok, String(days)).toBe(false);
      expect(calls).toHaveLength(0);
    }
    const { db } = fakeDb({ count: 0 });
    expect((await runWhatsAppClickRetention({ now: NOW, db, retentionDays: MIN_RETENTION_DAYS })).ok).toBe(true);
  });

  it('aborta si las filas a borrar superan el tope por corrida', async () => {
    const { db, calls } = fakeDb({ count: MAX_ROWS_PER_RUN + 1 });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/tope/);
    expect(calls.some((c) => c.op === 'delete' || c.op === 'insert')).toBe(false);
  });

  it('registra el error de borrado en la auditoría y lo informa', async () => {
    const { db, calls } = fakeDb({ count: 2, deleteError: true });
    const r = await runWhatsAppClickRetention({ now: NOW, db });
    expect(r.ok).toBe(false);
    expect(calls.find((c) => c.op === 'update')!.args[0]).toMatchObject({ status: 'error', deleted: 0 });
  });

  it('informa si no se puede contar o si no hay base configurada, sin escribir nada', async () => {
    const a = fakeDb({ countError: true });
    expect((await runWhatsAppClickRetention({ now: NOW, db: a.db })).ok).toBe(false);
    expect(a.calls.some((c) => c.op !== 'select')).toBe(false);
    expect((await runWhatsAppClickRetention({ now: NOW, db: null })).error).toMatch(/no configurado/i);
  });
});

describe('alcance del código de borrado (control estático)', () => {
  const src = readFileSync('lib/retention/whatsapp-clicks.ts', 'utf8')
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

  it('solo toca lead_attribution y retention_audit, y tiene un único borrado', () => {
    const tables = [...src.matchAll(/\.from\('([a-z_]+)'\)/g)].map((m) => m[1]);
    expect([...new Set(tables)].sort()).toEqual(['lead_attribution', 'retention_audit']);
    expect([...src.matchAll(/\.delete\(/g)]).toHaveLength(1);
    expect([...src.matchAll(/\.rpc\(|\.raw\(|\.sql\(|truncate/gi)]).toHaveLength(0);
  });

  it('el borrado y el conteo comparten exactamente las tres condiciones de la política', () => {
    const conds = [...src.matchAll(/\.(eq|is|lt)\('(lead_type|wa_message_received_at|created_at)'/g)].map((m) => m[2]);
    // conteo + borrado: las mismas tres condiciones dos veces (la auditoría filtra por id)
    expect(conds.sort()).toEqual(['created_at', 'created_at', 'lead_type', 'lead_type', 'wa_message_received_at', 'wa_message_received_at']);
    expect(src).toContain(".eq('lead_type', 'whatsapp_click')");
    expect(src).toContain(".is('wa_message_received_at', null)");
  });

  it('no hay eliminación automática para 2Clics ni WhatsApp Business (decisión pendiente)', () => {
    expect(src).not.toMatch(/2clics|twoclics|whatsapp_business/i);
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: Array<{ path: string }> };
    expect(vercel.crons.map((c) => c.path)).toEqual(['/api/maintenance/retention']);
  });
});
