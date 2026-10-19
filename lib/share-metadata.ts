import 'server-only';
import type { Metadata } from 'next';
import { CANONICAL_BASE_URL } from '@/lib/env';

// Metadata para compartir en redes (WhatsApp / Facebook / LinkedIn / X): cada ficha publica su
// propio título, descripción, imagen y URL. Open Graph y Twitter salen SIEMPRE del mismo objeto —
// si una ficha define `openGraph` pero no `twitter`, Next hereda el `twitter` del layout raíz y la
// preview vuelve a mostrar la imagen del Home (era el bug original).
//
// Las imágenes llegan ya filtradas: assets editoriales locales (public/) o `displayUrl` del DTO
// sanitizado de 2Clics (lib/2clics/adapters.ts). Este módulo solo las vuelve absolutas.

export const SITE_NAME = 'García Inversiones Inmobiliarias';

// Imagen institucional del Home — fallback solo cuando una ficha no tiene ninguna imagen segura.
export const DEFAULT_SHARE_IMAGE = '/assets/propiedades/condor-resort.jpeg';

const HOME_SHARE_TITLE = 'García Inversiones Inmobiliarias | Real Estate Buenos Aires y Miami';
const HOME_SHARE_DESCRIPTION =
  'Consultora boutique de real estate en Buenos Aires y Miami, con propiedades seleccionadas y acompañamiento personalizado.';

// Metadata institucional (layout raíz). Sin `url`: cada página que no define la suya no debe
// declarar la URL del Home como propia. El Home agrega `url: '/'` en app/page.tsx.
export const INSTITUTIONAL_OPEN_GRAPH = {
  type: 'website',
  siteName: SITE_NAME,
  locale: 'es_AR',
  title: HOME_SHARE_TITLE,
  description: HOME_SHARE_DESCRIPTION,
  images: [{ url: DEFAULT_SHARE_IMAGE, width: 1200, height: 630 }],
} satisfies NonNullable<Metadata['openGraph']>;

export const INSTITUTIONAL_TWITTER = {
  card: 'summary_large_image',
  title: HOME_SHARE_TITLE,
  description: HOME_SHARE_DESCRIPTION,
  images: [DEFAULT_SHARE_IMAGE],
} satisfies NonNullable<Metadata['twitter']>;

// URL absoluta https para una imagen o ruta del sitio. Rutas locales (`/…`) se resuelven contra
// el dominio canónico; cualquier otra cosa (http plano, `//host`, `data:`, vacío) se descarta.
export function absoluteShareUrl(pathOrUrl: string | null | undefined): string | null {
  const value = String(pathOrUrl || '').trim();
  if (!value) return null;
  if (/^https:\/\/[^\s]+$/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return `${CANONICAL_BASE_URL}${value}`;
  return null;
}

// Descripción para previews: una línea limpia, cortada en palabra completa.
export function shareDescription(text: string | null | undefined, maxLength = 200): string | undefined {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:·–-]+$/, '')}…`;
}

export type ShareMetadataInput = {
  // Nombre público de la ficha (sin el sufijo del sitio).
  title: string;
  description?: string | null;
  // Ruta canónica de la ficha (ej. `/desarrollos/domus-brickell-center`).
  path: string;
  // Imagen principal ya validada (asset local o displayUrl público de 2Clics).
  image?: string | null;
};

export function buildShareMetadata({ title, description, path, image }: ShareMetadataInput): Metadata {
  const shareImage = absoluteShareUrl(image) || absoluteShareUrl(DEFAULT_SHARE_IMAGE)!;
  const summary = shareDescription(description);
  return {
    title: `${title} | ${SITE_NAME}`,
    description: summary,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'es_AR',
      title,
      description: summary,
      url: `${CANONICAL_BASE_URL}${path}`,
      images: [{ url: shareImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: summary,
      images: [shareImage],
    },
  };
}
