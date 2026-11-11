-- ============================================================
-- Referencia de WhatsApp — columnas ADICIONALES en `lead_attribution` (la tabla YA EXISTE;
-- NO repite la migración inicial 2026-11-10_lead_attribution.sql).
-- PARA REVISIÓN: NO ejecutado. Ejecutar en Supabase (proyecto de García) ANTES de publicar la web
-- que escribe `asset_key` (si falta, el registro de clics de WhatsApp falla en silencio; los
-- formularios no se ven afectados porque no envían la columna).
--
-- Es aditivo e idempotente: no modifica ni borra filas, no cambia RLS ni permisos.
--
-- Reversión:
--   DROP INDEX IF EXISTS idx_lead_attribution_asset, idx_lead_attribution_type_created;
--   ALTER TABLE lead_attribution DROP COLUMN IF EXISTS asset_key,
--     DROP COLUMN IF EXISTS wa_message_received_at, DROP COLUMN IF EXISTS wa_match_method;
-- ============================================================

-- Activo con la convención única: inv:<slug> | prop:<propertyId> | dev:<slug> (NULL = consulta general).
ALTER TABLE lead_attribution ADD COLUMN IF NOT EXISTS asset_key TEXT;

-- Estado «mensaje efectivamente recibido»: NULL = NO MEDIDO TODAVÍA. Un clic registrado
-- (lead_type = 'whatsapp_click') NO confirma un mensaje. Solo lo completará una integración
-- autorizada (WhatsApp Business Platform u otra) al encontrar la referencia en un mensaje.
ALTER TABLE lead_attribution ADD COLUMN IF NOT EXISTS wa_message_received_at TIMESTAMPTZ;
-- 'ref' = la referencia estaba en el mensaje (confirmado); 'probable' = coincidencia aproximada (inferida).
ALTER TABLE lead_attribution ADD COLUMN IF NOT EXISTS wa_match_method TEXT;
ALTER TABLE lead_attribution DROP CONSTRAINT IF EXISTS lead_attribution_wa_match_method_chk;
ALTER TABLE lead_attribution ADD CONSTRAINT lead_attribution_wa_match_method_chk
  CHECK (wa_match_method IS NULL OR wa_match_method IN ('ref', 'probable'));

CREATE INDEX IF NOT EXISTS idx_lead_attribution_asset        ON lead_attribution (asset_key);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_type_created ON lead_attribution (lead_type, created_at DESC);

-- Verificación posterior (solo lectura):
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'lead_attribution' AND column_name IN ('asset_key','wa_message_received_at','wa_match_method');  -- 3 filas
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'lead_attribution';                                              -- true
--   SELECT count(*) FROM pg_policies WHERE tablename = 'lead_attribution';                                               -- 0
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--     WHERE table_name = 'lead_attribution' AND grantee IN ('anon','authenticated');                                    -- 0 filas
