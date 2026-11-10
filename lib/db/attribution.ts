import 'server-only';
import { getSupabase } from '@/lib/supabase';
import type { LeadAttributionRow } from '@/lib/attribution-server';

// ── Registro de atribución por lead (sin datos personales) ───────────────────
// Tabla `lead_attribution` (ver supabase-schema.sql). Cruza con el negocio de 2Clics por `event_id`
// (viaja como "Ref:" en el mensaje al CRM). Es best-effort: NUNCA debe frenar ni romper el envío
// del formulario (Supabase lento, tabla todavía no creada, etc.). Se registra el error y se sigue.

export async function dbInsertLeadAttribution(row: LeadAttributionRow): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('lead_attribution').insert(row);
  if (error && error.code !== '23505') {
    console.error('[db] insertLeadAttribution:', error.code || '', error.message);
  }
}

export async function recordLeadAttribution(row: LeadAttributionRow, timeoutMs = 2000): Promise<void> {
  try {
    await Promise.race([
      dbInsertLeadAttribution(row),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch (err) {
    console.error('[attribution] no se pudo registrar:', (err as Error).message);
  }
}
