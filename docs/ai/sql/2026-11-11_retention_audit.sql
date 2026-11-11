-- ============================================================
-- Auditoría de la conservación de datos — tabla NUEVA, sin datos personales.
-- PARA REVISIÓN: NO ejecutado. Ejecutar en Supabase (proyecto de García) ANTES de habilitar la
-- ruta /api/maintenance/retention (que hace una fila de auditoría por corrida y, si no puede
-- registrarla, no borra nada).
--
-- Es aditivo e idempotente: no modifica ni borra tablas existentes ni filas.
-- Reversión:  DROP TABLE IF EXISTS retention_audit;
-- ============================================================

CREATE TABLE IF NOT EXISTS retention_audit (
  id             BIGSERIAL PRIMARY KEY,
  ran_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Regla aplicada (hoy: 'whatsapp_click_unmatched' = clics de WhatsApp sin mensaje asociado).
  rule           TEXT        NOT NULL,
  retention_days INTEGER     NOT NULL CHECK (retention_days >= 30),
  -- Se eliminan las filas creadas ANTES de este instante.
  cutoff         TIMESTAMPTZ NOT NULL,
  dry_run        BOOLEAN     NOT NULL DEFAULT FALSE,
  matched        INTEGER     NOT NULL DEFAULT 0,   -- filas que cumplían la regla al contar
  deleted        INTEGER     NOT NULL DEFAULT 0,   -- filas efectivamente eliminadas
  status         TEXT        NOT NULL DEFAULT 'started',  -- started | ok | dry_run | nothing_to_delete | error
  error          TEXT
);

CREATE INDEX IF NOT EXISTS idx_retention_audit_ran ON retention_audit (ran_at DESC);

-- Mismo criterio que el resto: la app usa la service role; anon/authenticated sin acceso.
ALTER TABLE retention_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE retention_audit FROM anon, authenticated;
REVOKE ALL ON SEQUENCE retention_audit_id_seq FROM anon, authenticated;

-- Verificación posterior (solo lectura):
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'retention_audit';                   -- true
--   SELECT count(*) FROM pg_policies WHERE tablename = 'retention_audit';                    -- 0
--   SELECT grantee FROM information_schema.role_table_grants
--     WHERE table_name = 'retention_audit' AND grantee IN ('anon','authenticated');           -- 0 filas
--
-- Revisión de lo que se ha borrado (para el asesor / una auditoría):
--   SELECT ran_at, rule, retention_days, cutoff, dry_run, matched, deleted, status, error
--     FROM retention_audit ORDER BY ran_at DESC LIMIT 20;
--
-- ALTERNATIVA sin código de aplicación (decisión pendiente): programar el mismo borrado con la
-- extensión `pg_cron` de Supabase (disponible, NO instalada). Equivalente SQL de la regla:
--   DELETE FROM lead_attribution
--    WHERE lead_type = 'whatsapp_click' AND wa_message_received_at IS NULL
--      AND created_at < NOW() - INTERVAL '90 days';
