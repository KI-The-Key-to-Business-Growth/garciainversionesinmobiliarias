import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

// ── Conservación de los registros de clics de WhatsApp ───────────────────────
// PROPUESTA DE TRABAJO (no política aprobada): los registros técnicos de clics a WhatsApp
// (`lead_attribution.lead_type = 'whatsapp_click'`) se eliminan a los 90 días.
//
// Alcance deliberadamente estrecho:
//  - SOLO la tabla `lead_attribution` y SOLO filas `whatsapp_click`. No toca formularios
//    (`consulta_general`, `consulta_propiedad`, `newsletter`), contactos, CRM ni otras tablas.
//  - SOLO filas sin mensaje asociado (`wa_message_received_at IS NULL`). Una referencia que ya se
//    vinculó a un mensaje recibido pasa a ser parte de un registro comercial: su plazo es otra
//    decisión (ver docs/ai/PRIVACIDAD_REVISION.md) y esta regla NO la elimina.
//
// Controlada y auditable:
//  - Cada corrida registra una fila en `retention_audit` ANTES de borrar (si no puede registrarla,
//    no borra: falla cerrado) y la completa con el resultado.
//  - Modo de prueba (`dryRun`): cuenta y audita sin borrar.
//  - Plazo mínimo de 30 días y tope de filas por corrida, para que un error de configuración no
//    pueda vaciar la tabla.
//  - Solo se ejecuta si la ruta de mantenimiento está habilitada y autenticada (ver la ruta).

export const WHATSAPP_CLICK_RETENTION_DAYS = 90;
export const MIN_RETENTION_DAYS = 30;
export const MAX_ROWS_PER_RUN = 10_000;
export const RETENTION_RULE = 'whatsapp_click_unmatched';

export type RetentionResult = {
  ok: boolean;
  dryRun: boolean;
  rule: string;
  retentionDays: number;
  cutoff: string;
  matched: number;
  deleted: number;
  auditId?: number;
  error?: string;
};

type Options = {
  now?: Date;
  retentionDays?: number;
  dryRun?: boolean;
  db?: SupabaseClient | null;
};

export async function runWhatsAppClickRetention(options: Options = {}): Promise<RetentionResult> {
  const retentionDays = options.retentionDays ?? WHATSAPP_CLICK_RETENTION_DAYS;
  const dryRun = options.dryRun ?? false;
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
  const base: RetentionResult = { ok: false, dryRun, rule: RETENTION_RULE, retentionDays, cutoff, matched: 0, deleted: 0 };

  if (!Number.isInteger(retentionDays) || retentionDays < MIN_RETENTION_DAYS) {
    return { ...base, error: `Plazo inválido: mínimo ${MIN_RETENTION_DAYS} días.` };
  }
  const db = options.db === undefined ? getSupabase() : options.db;
  if (!db) return { ...base, error: 'Supabase no configurado.' };

  // 1) Cuántas filas corresponden (mismas condiciones que el borrado).
  const counted = await db
    .from('lead_attribution')
    .select('id', { count: 'exact', head: true })
    .eq('lead_type', 'whatsapp_click')
    .is('wa_message_received_at', null)
    .lt('created_at', cutoff);
  if (counted.error) return { ...base, error: `No se pudo contar: ${counted.error.message}` };
  const matched = counted.count ?? 0;

  if (matched > MAX_ROWS_PER_RUN) {
    return { ...base, matched, error: `Se abortó: ${matched} filas superan el tope de ${MAX_ROWS_PER_RUN} por corrida.` };
  }

  // 2) Auditoría ANTES de borrar. Sin registro de auditoría no se borra.
  const audit = await db
    .from('retention_audit')
    .insert({ rule: RETENTION_RULE, retention_days: retentionDays, cutoff, dry_run: dryRun, matched, status: 'started' })
    .select('id')
    .single();
  if (audit.error || !audit.data) {
    return { ...base, matched, error: `No se pudo registrar la auditoría: ${audit.error?.message ?? 'sin datos'}` };
  }
  const auditId = Number((audit.data as { id: number }).id);

  const finish = async (patch: { deleted: number; status: string; error?: string }) => {
    await db.from('retention_audit').update(patch).eq('id', auditId);
  };

  if (dryRun || matched === 0) {
    await finish({ deleted: 0, status: dryRun ? 'dry_run' : 'nothing_to_delete' });
    return { ...base, ok: true, matched, auditId };
  }

  // 3) Borrado acotado: mismas condiciones, solo `whatsapp_click` sin mensaje asociado.
  const removed = await db
    .from('lead_attribution')
    .delete({ count: 'exact' })
    .eq('lead_type', 'whatsapp_click')
    .is('wa_message_received_at', null)
    .lt('created_at', cutoff);
  if (removed.error) {
    await finish({ deleted: 0, status: 'error', error: removed.error.message.slice(0, 300) });
    return { ...base, matched, auditId, error: `No se pudo borrar: ${removed.error.message}` };
  }
  const deleted = removed.count ?? 0;
  await finish({ deleted, status: 'ok' });
  return { ...base, ok: true, matched, deleted, auditId };
}
