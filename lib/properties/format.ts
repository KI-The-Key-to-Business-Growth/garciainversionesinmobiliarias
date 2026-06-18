// ── Formato y resolución de medios de propiedades ────────────────────────────
// Portado de legacy/server.js:367-498. Funciones puras reutilizadas por el data
// layer, la ficha y el sitemap.

import { isPublicHttpsUrl, sanitizeImageUrl } from '@/lib/security/ssrf';

// Imagen institucional de fallback (existe en /public/assets/propiedades/)
export const INSTITUTIONAL_FALLBACK = 'assets/propiedades/condor-resort.jpeg';

export function slugify(text: unknown): string {
  return (
    String(text || 'propiedad')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'propiedad'
  );
}

export function normalizeOperation(operation = ''): string {
  const value = String(operation).toLowerCase();
  if (value.includes('alquiler temporario')) return 'alquiler-temporario';
  if (value.includes('alquiler')) return 'alquiler';
  if (value.includes('venta')) return 'venta';
  return 'proyecto';
}

// Normaliza el estado del CRM a uno de los tres estados canónicos — server.js:486-492
export function normalizeEstado(prop: Record<string, unknown>): string {
  const raw = String(prop.estado || prop.status || prop.prop_status || '')
    .toLowerCase()
    .trim();
  if (!raw) return 'activa';
  if (['eliminada', 'baja', 'deleted', 'removed', 'trash'].some((v) => raw.includes(v)))
    return 'eliminada';
  if (['pausada', 'paused', 'inactive', 'draft', 'oculta', 'hidden'].some((v) => raw.includes(v)))
    return 'pausada';
  return 'activa';
}

// Devuelve true si la propiedad debe mostrarse públicamente — server.js:495-498
export function isVisible(prop: { estado?: string }): boolean {
  return (prop.estado || 'activa') === 'activa';
}

export function formatPrice(prop: Record<string, unknown>): string {
  const price = (prop.precio_propiedad || prop.precio || '') as string | number;
  const currency = (prop.moneda_propiedad || prop.moneda || '') as string;
  if (!price) return 'Consultar';
  const numeric = Number(price);
  const display = Number.isFinite(numeric) ? numeric.toLocaleString('es-AR') : String(price);
  return `${currency} ${display}`.trim();
}

// Prioridad: manual principal → CRM destacada → primera CRM → galería manual → fallback
export function getFeaturedImage(prop: Record<string, any>): string {
  if (prop.imagen_manual) return prop.imagen_manual;
  const images = Array.isArray(prop.imagenes_propiedad) ? prop.imagenes_propiedad : [];
  const featured = images.find((img: any) => img && img.featured_image) || images[0];
  const crmSrc = sanitizeImageUrl(featured?.source || '');
  if (crmSrc) return crmSrc;
  if (Array.isArray(prop.galeria_manual) && prop.galeria_manual[0]) return prop.galeria_manual[0];
  return INSTITUTIONAL_FALLBACK;
}

// Prioridad OG: og_image_manual → imagen_manual → imagen CRM → fallback institucional
export function resolveOgImage(property: Record<string, any>, base: string): string {
  const raw = property.og_image_manual || property.imagen_manual || property.imagen || '';
  if (!raw) return `${base}/${INSTITUTIONAL_FALLBACK}`;
  return raw.startsWith('http') ? raw : `${base}/${String(raw).replace(/^\//, '')}`;
}

// ── YouTube helpers — server.js:436-455 ──────────────────────────────────────
export function extractYouTubeId(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url.trim());
    const h = u.hostname.replace('www.', '');
    if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || '';
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || '';
      return u.searchParams.get('v') || '';
    }
  } catch {
    /* invalid URL */
  }
  return '';
}

export function toYouTubeEmbed(urlOrId: string): string {
  const id = urlOrId.length < 15 ? urlOrId : extractYouTubeId(urlOrId);
  if (!id) return '';
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export { isPublicHttpsUrl };
