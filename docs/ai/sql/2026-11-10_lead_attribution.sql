-- ============================================================
-- Atribución por lead — tabla NUEVA, sin datos personales.
-- Ejecutar en: Supabase Dashboard → SQL Editor (proyecto de García).
-- Es aditiva e idempotente: no modifica ni borra tablas existentes.
-- La web funciona igual si todavía no se creó (el registro es best-effort).
--
-- Reversión:  DROP TABLE IF EXISTS lead_attribution;
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_attribution (
  id                 BIGSERIAL PRIMARY KEY,
  -- Mismo valor que el "Ref:" del mensaje en 2Clics y que el event_id de generate_lead.
  event_id           TEXT UNIQUE NOT NULL,
  lead_type          TEXT,          -- consulta_general | consulta_propiedad | newsletter
  form_name          TEXT,
  crm_status         TEXT,          -- sent | failed | uncertain | not_applicable | simulated
  -- Activo identificado por IDs reales (propertyId de 2Clics / slug curado), nunca por nombre de campaña.
  property_app_id    BIGINT,
  development_slug   TEXT,
  -- Consentimiento declarado al enviar (si ambos son false, los campos de atribución van en NULL).
  consent_analytics  BOOLEAN DEFAULT false,
  consent_marketing  BOOLEAN DEFAULT false,
  session_id         TEXT,
  utm_source         TEXT,
  utm_medium         TEXT,
  utm_campaign       TEXT,
  utm_content        TEXT,
  utm_term           TEXT,
  -- IDs reales de Meta (macros dinámicas {{campaign.id}}, {{adset.id}}, {{ad.id}}).
  campaign_id        TEXT,
  adset_id           TEXT,
  ad_id              TEXT,
  placement          TEXT,
  -- Click ids y cookies de Meta: solo con consentimiento de marketing (base para una futura CAPI).
  gclid              TEXT,
  gbraid             TEXT,
  wbraid             TEXT,
  fbclid             TEXT,
  fbp                TEXT,
  fbc                TEXT,
  landing_page       TEXT,
  referrer           TEXT,
  page_path          TEXT,
  first_touch        JSONB,
  last_touch         JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_attribution_created  ON lead_attribution (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_campaign ON lead_attribution (campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_dev      ON lead_attribution (development_slug);

-- Mismo criterio que el resto: la app usa la service role (bypassa RLS); anon/authenticated quedan sin acceso.
ALTER TABLE lead_attribution ENABLE ROW LEVEL SECURITY;
