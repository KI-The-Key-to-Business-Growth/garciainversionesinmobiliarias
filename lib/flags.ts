// ── Feature flags ────────────────────────────────────────────────────────────
// PROPERTIES_ENABLED: cuando el CRM 2Clics esté conectado y Supabase Pro activo,
// poner PROPERTIES_ENABLED=true para activar el listado público. Mientras tanto
// la home muestra "Selección en preparación" (informe §3.7 / §6.1).

export const PROPERTIES_ENABLED = process.env.PROPERTIES_ENABLED === 'true';
