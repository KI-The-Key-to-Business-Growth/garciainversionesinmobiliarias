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

-- Parcial: solo filas con activo (las consultas generales no se indexan).
CREATE INDEX IF NOT EXISTS idx_lead_attribution_asset        ON lead_attribution (asset_key) WHERE asset_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_attribution_type_created ON lead_attribution (lead_type, created_at DESC);

-- ── REVISIÓN (2026-11-11, solo lectura contra el esquema real; nada se ejecutó) ──
--  * Sin conflictos: la tabla no tiene `asset_key`, `wa_message_received_at` ni `wa_match_method`.
--  * Deduplicación: `event_id` ya es UNIQUE (lead_attribution_event_id_key). La web ignora el error 23505
--    (misma referencia dos veces = una sola fila).
--  * Permisos: solo `service_role` y `postgres` tienen privilegios (sin privilegios para `anon` ni
--    `authenticated`, tampoco por columna). ADD COLUMN hereda los privilegios de la tabla: las columnas
--    nuevas quedan igual de cerradas. RLS activo, 0 políticas.
--  * Bloqueo: columnas NULL sin DEFAULT = cambio de catálogo, sin reescribir la tabla (hoy 1 fila, 96 kB).
--    El CHECK valida las filas existentes (todas NULL) al instante.
--  * Errores: cada sentencia es idempotente (IF NOT EXISTS / DROP IF EXISTS); si se corta a la mitad, se
--    puede volver a ejecutar completo. Si falta una columna, la web registra el error y sigue: el insert
--    es best-effort con tope de 2 s y nunca rompe un formulario.
--  * Formularios: no envían `asset_key` ni las columnas `wa_*` (hay un test que lo garantiza), así que no
--    dependen de este SQL.
--  * Índices: `idx_lead_attribution_asset` (parcial) y `idx_lead_attribution_type_created`. Con el volumen
--    esperado (cientos o miles de filas) son baratos; se pueden omitir sin afectar el funcionamiento.
--
-- ── RETENCIÓN (PROPUESTA, NO forma parte de esta migración; requiere decisión) ──
-- La tabla no tiene datos personales, pero `session_id`, `fbp`, `fbc` y los click ids son identificadores
-- seudónimos. Propuesta: conservarlos 90 días (igual que la atribución del navegador) y mantener después
-- solo lo agregable (activo, campaña, fecha). Se puede ejecutar a mano cada trimestre; `pg_cron` está
-- disponible pero NO instalada (habilitarla es otra decisión).
--   UPDATE lead_attribution
--      SET session_id = NULL, fbp = NULL, fbc = NULL, gclid = NULL, gbraid = NULL, wbraid = NULL,
--          fbclid = NULL, first_touch = NULL, last_touch = NULL, referrer = NULL
--    WHERE created_at < now() - interval '90 days'
--      AND (session_id IS NOT NULL OR fbp IS NOT NULL OR fbc IS NOT NULL OR gclid IS NOT NULL
--           OR fbclid IS NOT NULL OR first_touch IS NOT NULL);
-- Borrado total de filas (si se decide un plazo): DELETE FROM lead_attribution WHERE created_at < now() - interval '25 months';
--
-- Verificación posterior (solo lectura):
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'lead_attribution' AND column_name IN ('asset_key','wa_message_received_at','wa_match_method');  -- 3 filas
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'lead_attribution';                                              -- true
--   SELECT count(*) FROM pg_policies WHERE tablename = 'lead_attribution';                                               -- 0
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--     WHERE table_name = 'lead_attribution' AND grantee IN ('anon','authenticated');                                    -- 0 filas
