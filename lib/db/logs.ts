import 'server-only';
import { getSupabase } from '@/lib/supabase';

// ── Log de integración técnica (sin datos personales) ────────────────────────
// Portado de legacy/server.js:698-705. Informe §5.6 (logs sin PII).

export async function dbLogIntegration({
  provider = '2clics',
  event_type = '',
  crm_app_id = '',
  status,
  error_message = null,
}: {
  provider?: string;
  event_type?: string;
  crm_app_id?: string;
  status: string;
  error_message?: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('integration_logs').insert({
    provider,
    event_type,
    crm_app_id: String(crm_app_id).slice(0, 100),
    status,
    error_message,
  });
  if (error) console.error('[db] logIntegration:', error.message);
}
