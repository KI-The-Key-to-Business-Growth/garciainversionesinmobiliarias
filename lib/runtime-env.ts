// ── Entorno real de ejecución ────────────────────────────────────────────────
// `isProduction` de lib/env.ts es true también en Preview (NODE_ENV=production + VERCEL), así que NO
// sirve para decidir si se pueden hacer envíos externos. `VERCEL_ENV` lo fija Vercel en cada
// despliegue: 'production' | 'preview' | 'development'. Se lee en cada llamada (no al importar).
//
// Los previews y el desarrollo comparten credenciales con producción (CRM, Resend, Supabase). Por eso
// los formularios comerciales solo hacen efectos externos reales (negocios en 2Clics, emails,
// escrituras en Supabase) cuando VERCEL_ENV === 'production'. Fuera de eso se simula el envío.

export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

export const NON_PRODUCTION_SUBMISSION_MESSAGE =
  'Entorno no productivo: el envío fue simulado y no se enviaron datos a 2Clics, Resend ni Supabase.';
