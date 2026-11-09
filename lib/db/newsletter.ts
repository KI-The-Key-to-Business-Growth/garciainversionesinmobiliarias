import 'server-only';
import { getSupabase } from '@/lib/supabase';

// ── Suscriptor de newsletter ─────────────────────────────────────────────────
// Portado de legacy/server.js:708-727. Maneja unique_violation (23505) → isNew:false.
// Sin Supabase configurado: lanza error. Nunca se informa éxito si la suscripción no se registró.

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
    throw new Error('supabase_not_configured');
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
