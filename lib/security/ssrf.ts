// ── Validación de URLs externas (anti-SSRF) ──────────────────────────────────
// Portado de legacy/server.js:387-455. Rechaza no-https, localhost, IPs
// privadas/cloud-metadata y extensiones peligrosas (informe §5.5).

const _ALLOWED_IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const _PRIVATE_IP_RE = /^(10\.|192\.168\.|169\.254\.|100\.64\.|172\.(1[6-9]|2\d|3[01])\.)/;
const _CLOUD_META_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  '169.254.169.253',
  'metadata.azure.com',
]);

export function isPublicHttpsUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  if (_PRIVATE_IP_RE.test(host)) return false;
  if (_CLOUD_META_HOSTS.has(host)) return false;
  const ext = parsed.pathname.toLowerCase().match(/\.\w{2,5}$/)?.[0];
  if (ext && !_ALLOWED_IMG_EXTS.has(ext)) return false;
  return true;
}

// Devuelve la URL si es pública y válida, de lo contrario vacío — server.js:409-411
export function sanitizeImageUrl(url: unknown): string {
  return isPublicHttpsUrl(url) ? (url as string).trim() : '';
}

// ── Validación de URLs de video/tour — server.js:413-433 ─────────────────────
// Igual que isPublicHttpsUrl pero sin restricción de extensión de imagen.
export function sanitizeVideoUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return '';
  }
  if (parsed.protocol !== 'https:') return '';
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return '';
  if (_PRIVATE_IP_RE.test(host)) return '';
  if (_CLOUD_META_HOSTS.has(host)) return '';
  return url.trim();
}
