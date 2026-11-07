// ── Hosts donde se permite cargar tracking (GTM / Meta Pixel / GA4) ──────────
// Única fuente de verdad. Cualquier otro host (localhost, 127.0.0.1, IPs de red local,
// previews *.vercel.app, dominios lookalike) NO carga GTM y por lo tanto no dispara el Pixel,
// GA4 ni Google Ads. Evita contaminar el dataset de producción con tráfico de desarrollo.
//
// Comparación EXACTA (no por sufijo): `www.garciainversionesinmobiliarias.com.ar.evil.com` o
// `evilgarciainversionesinmobiliarias.com.ar` no deben pasar.

export const TRACKING_HOSTS: readonly string[] = [
  'www.garciainversionesinmobiliarias.com.ar',
  'garciainversionesinmobiliarias.com.ar',
];

// `hostname` es lo que devuelve `location.hostname` (sin puerto). Se normaliza a minúsculas y se
// descarta un punto final (FQDN absoluto).
export function normalizeHost(hostname: string | null | undefined): string {
  return String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

export function isTrackingHost(
  hostname: string | null | undefined,
  hosts: readonly string[] = TRACKING_HOSTS,
): boolean {
  const host = normalizeHost(hostname);
  return host !== '' && hosts.includes(host);
}
