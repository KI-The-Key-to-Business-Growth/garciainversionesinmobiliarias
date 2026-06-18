import 'server-only';
import { getSupabase } from '@/lib/supabase';

// ── Suscriptor de newsletter ─────────────────────────────────────────────────
// Portado de legacy/server.js:708-727. Maneja unique_violation (23505) → isNew:false.
// Sin Supabase: en serverless no se persiste (filesystem read-only) → isNew:true.

export async function dbInsertNewsletter({
  email,
  origen = '',
  utm_source = '',
  utm_medium = '',
  utm_campaign = '',
}: {
  email: string;
  origen?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}): Promise<{ isNew: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    // Sin DB configurada → se asume nuevo (no hay forma de deduplicar sin persistencia)
    return { isNew: true };
  }

  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: email.toLowerCase(), origen, utm_source, utm_medium, utm_campaign });

  if (error) {
    if (error.code === '23505') return { isNew: false }; // unique_violation — ya existe
    console.error('[db] insertNewsletter:', error.message);
    throw error;
  }
  return { isNew: true };
}
