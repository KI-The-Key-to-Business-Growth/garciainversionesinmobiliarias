import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Supabase client (service role — server-side only, nunca exponer al front) ─
// Portado de legacy/server.js:24-32. Sin el transporte realtime/ws (no se usa).
// Si falta configuración → null y el data layer cae a fallback JSON local.

let _client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    console.warn('[db] Supabase no configurado — usando JSON local como fallback.');
    _client = null;
  }
  return _client;
}
