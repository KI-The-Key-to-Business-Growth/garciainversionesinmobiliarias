// ── Validación de URLs externas (anti-SSRF) ──────────────────────────────────
// Portado de legacy/server.js:387-455. Rechaza no-https, localhost, IPs
// privadas/cloud-metadata y extensiones peligrosas (informe §5.5).
//
// Endurecido en la auditoría de calidad 2026-11-17 (cada caso tiene prueba en tests/qa/):
//  • `URL.hostname` devuelve las IPv6 ENTRE CORCHETES (`[::1]`): antes `host === '::1'` nunca coincidía.
//  • Todo 127.0.0.0/8 (no solo 127.0.0.1), 0.0.0.0/8 y CGNAT completo 100.64.0.0/10.
//  • IPv6: loopback, no especificada, ULA fc00::/7, link-local fe80::/10 e IPv4 mapeada (::ffff:a.b.c.d).
//  • `localhost.` (con punto final), `*.localhost`, `*.local`, `*.internal` y nombres sin punto.

const _ALLOWED_IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const _CLOUD_META_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  '169.254.169.253',
  'metadata.azure.com',
]);
const _INTERNAL_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.lan', '.home.arpa'];

function normalizeHostname(hostname: string): string {
  let h = hostname.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  return h.replace(/\.+$/, '');
}

function ipv4Octets(host: string): number[] | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((n) => n >= 0 && n <= 255) ? o : null;
}

function isPrivateIPv4(o: number[]): boolean {
  const [a, b] = o;
  return (
    a === 0 || // 0.0.0.0/8 (incluye 0.0.0.0)
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
    (a === 169 && b === 254) || // link-local / metadata cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

// Expande una IPv6 textual a 8 grupos de 16 bits. Devuelve null si no es una IPv6 válida.
function expandIPv6(host: string): number[] | null {
  if (!host.includes(':') || !/^[0-9a-f:.]+$/.test(host)) return null;
  let h = host;
  // Cola con IPv4 embebida (::ffff:1.2.3.4) → dos grupos hexadecimales.
  const v4 = h.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const o = ipv4Octets(v4[1]);
    if (!o) return null;
    h = h.slice(0, -v4[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = h.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8) return null;
  const nums = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return nums.some(Number.isNaN) ? null : nums;
}

function isPrivateIPv6(g: number[]): boolean {
  const allZeroUpTo = (n: number) => g.slice(0, n).every((x) => x === 0);
  if (allZeroUpTo(7) && (g[7] === 0 || g[7] === 1)) return true; // :: y ::1
  if (allZeroUpTo(5) && g[5] === 0xffff) {
    // IPv4 mapeada ::ffff:a.b.c.d → se juzga por la IPv4
    return isPrivateIPv4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255]);
  }
  if ((g[0] & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true; // site-local (obsoleta) fec0::/10
  return false;
}

// ¿El host es local, privado, interno o de metadata de la nube? (true = NO debe consultarse)
export function isBlockedHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (host === 'localhost' || _CLOUD_META_HOSTS.has(host)) return true;
  if (_INTERNAL_SUFFIXES.some((s) => host.endsWith(s))) return true;
  const v4 = ipv4Octets(host);
  if (v4) return isPrivateIPv4(v4);
  const v6 = expandIPv6(host);
  if (v6) return isPrivateIPv6(v6);
  if (host.includes(':')) return true; // parece IPv6 pero no se pudo interpretar: ante la duda, bloquear
  if (!host.includes('.')) return true; // nombre de una sola etiqueta (intranet, router…)
  return false;
}

export function isPublicHttpsUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (isBlockedHost(parsed.hostname)) return false;
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
  if (isBlockedHost(parsed.hostname)) return '';
  return url.trim();
}
