import 'server-only';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getDevelopmentEditorialCuration } from '@/lib/desarrollos';
import type { PublicImage } from '@/lib/2clics/types';

// Assets editoriales de desarrollos (renders, masterplans, fotos propias aprobadas) — separados
// de 2Clics a propósito: 2Clics es la fuente de inventario/precio/datos vivos; estos archivos son
// material editorial que no tiene por qué pasar por el CRM para llegar a la web.
//
// Cada slot declara el archivo exacto esperado en `public/developments/<slug>/` y a qué parte de
// la ficha alimenta. Un slot solo se activa si el archivo EXISTE físicamente — mientras tanto la
// sección conserva su imagen actual de 2Clics (o no muestra imagen). Nunca hay placeholders.

export type EditorialAssetKind = 'render' | 'photo' | 'plan';

export type DevelopmentAssetSlot = {
  // 'hero' alimenta la apertura y la card del índice; cualquier otro valor es el `key` de una
  // sección de la curaduría (lib/desarrollos.ts).
  target: string;
  file: string;
  kind: EditorialAssetKind;
  // De dónde sale el archivo (para quien lo incorpore al repo).
  source: string;
  // Texto alternativo (SEO y accesibilidad): describe lo que muestra la imagen, sin promesas.
  alt?: string;
};

export type ResolvedEditorialAsset = { src: string; kind: EditorialAssetKind; alt?: string };
export type ResolvedEditorialAssets = Record<string, ResolvedEditorialAsset[]>;

export const DEVELOPMENT_ASSET_SLOTS: Record<string, DevelopmentAssetSlot[]> = {
  'benavidez-village': [
    { target: 'hero', file: 'hero.jpg', kind: 'render', source: 'New Brochure BENAVIDEZ VILLAGE 2GARCIA.pdf — render diurno de fachada/conjunto con piscina', alt: 'Render del exterior de Benavídez Village: viviendas de dos plantas con jardín y piscina' },
    { target: 'proyecto', file: 'exterior.jpg', kind: 'render', source: 'New Brochure BENAVIDEZ VILLAGE 2GARCIA.pdf — render nocturno/dusk de fachada', alt: 'Render de la fachada de una vivienda de Benavídez Village, con ventanales y balcón' },
    { target: 'residencias', file: 'vivienda-interior.jpg', kind: 'render', source: 'New Brochure BENAVIDEZ VILLAGE 2GARCIA.pdf — interior terminado (cocina/living)', alt: 'Render del interior de una vivienda de Benavídez Village, con cocina y living' },
    { target: 'interiores', file: 'dormitorio.jpg', kind: 'render', source: 'New Brochure BENAVIDEZ VILLAGE 2GARCIA.pdf — dormitorio', alt: 'Render de un dormitorio con salida a balcón en Benavídez Village' },
    { target: 'vida-en-el-conjunto', file: 'amenities.jpg', kind: 'render', source: 'New Brochure BENAVIDEZ VILLAGE 2GARCIA.pdf — render con piscina + conjunto', alt: 'Render de las áreas comunes de Benavídez Village, con piscina y parque' },
    { target: 'masterplan', file: 'masterplan.jpg', kind: 'plan', source: 'New Unidades Benavidez Village.pdf — masterplan general', alt: 'Plano de implantación de Benavídez Village con las viviendas y las áreas comunes' },
    // Evolución de obra — fotografías reales recientes (Benavidez_Village_Avance_Obra_Actualizado.zip,
    // carpeta oficial de Drive). La primera es el "Avance actual" principal; el resto, detalles.
    { target: 'estado-obra', file: 'obra-exterior.jpg', kind: 'photo', source: '01_EXTERIOR_VENTANAS_IMG_1582.JPG — exterior con ventanas colocadas', alt: 'Foto real del avance de obra: exterior de las viviendas de Benavídez Village' },
    { target: 'estado-obra', file: 'obra-interior-living.jpg', kind: 'photo', source: '04_INTERIOR_ABERTURA_IMG_1574.JPG — interior con abertura al jardín', alt: 'Foto real del avance de obra: living comedor con salida al jardín' },
    { target: 'estado-obra', file: 'obra-interior-abertura.jpg', kind: 'photo', source: '03_INTERIOR_ABERTURA_IMG_1575.JPG — interior con abertura corrediza', alt: 'Foto real del avance de obra: interior con las aberturas colocadas' },
    { target: 'estado-obra', file: 'obra-interior-terminaciones.jpg', kind: 'photo', source: '05_INTERIOR_AVANCE_IMG_1581.JPG — avance de terminaciones interiores', alt: 'Foto real del avance de obra: interior en etapa de terminaciones' },
  ],
  'pacheco-central': [
    { target: 'hero', file: 'hero.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 3 (vista aérea general)', alt: 'Render de la vista aérea del conjunto Pacheco Central' },
    { target: 'momento-visual', file: 'parque-piscina.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 6 (piscina + parque)', alt: 'Render del parque y la piscina de Pacheco Central' },
    { target: 'proyecto', file: 'verde.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 7 (verde / vida del proyecto)', alt: 'Render de los espacios verdes de Pacheco Central' },
    { target: 'amenities-imagenes', file: 'gimnasio.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 8 (gimnasio)', alt: 'Render del gimnasio de Pacheco Central' },
    { target: 'amenities-imagenes', file: 'sum.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 9 (SUM)', alt: 'Render del SUM de Pacheco Central' },
    { target: 'amenities-imagenes', file: 'coworking.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 10 (coworking)', alt: 'Render del coworking de Pacheco Central' },
    { target: 'tipologias', file: 'interior-principal.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 11 (interior principal)', alt: 'Render del interior de una unidad de Pacheco Central' },
    { target: 'terminaciones', file: 'cocina.jpg', kind: 'render', source: 'pacheco-central-1-simple-brochure.pdf — página 13 (cocina / terminaciones)', alt: 'Render de la cocina de una unidad de Pacheco Central' },
    { target: 'masterplan', file: 'masterplan.jpg', kind: 'plan', source: 'pacheco-central-1-simple-brochure.pdf — página 19 (masterplan)', alt: 'Plano de implantación de Pacheco Central' },
  ],
  'remeros-beach': [
    { target: 'hero', file: 'hero-drone.jpg', kind: 'photo', source: 'Producción propia — drone del masterplan y la laguna' },
    { target: 'momento-visual', file: 'laguna-playa.jpg', kind: 'photo', source: 'Producción propia — laguna / playa' },
    { target: 'sky-residences', file: 'exterior-sky.jpg', kind: 'photo', source: 'Producción propia — exterior de Sky Residences' },
    { target: 'amenities', file: 'amenities.jpg', kind: 'photo', source: 'Producción propia — amenities' },
    { target: 'interiores', file: 'interior-unidad.jpg', kind: 'photo', source: 'Producción propia — interior de la unidad' },
  ],
};

export function developmentAssetPublicPath(slug: string, file: string): string {
  return `/developments/${slug}/${file}`;
}

// Solo los slots cuyo archivo existe, agrupados por destino y en el orden declarado.
export function resolveDevelopmentAssets(slug: string, publicDir = path.join(process.cwd(), 'public')): ResolvedEditorialAssets {
  const resolved: ResolvedEditorialAssets = {};
  for (const slot of DEVELOPMENT_ASSET_SLOTS[slug] || []) {
    const publicPath = developmentAssetPublicPath(slug, slot.file);
    if (!existsSync(path.join(publicDir, publicPath))) continue;
    (resolved[slot.target] ||= []).push({ src: publicPath, kind: slot.kind, ...(slot.alt ? { alt: slot.alt } : {}) });
  }
  return resolved;
}

// Un asset local presentado con la forma de imagen pública que esperan cards y metadata.
export function localAssetToPublicImage(src: string): PublicImage {
  return { id: src, name: '', url: src, thumbnailUrl: src, displayUrl: src, displayThumbnailUrl: src, useVirtualized: false };
}

// Imagen de apertura de un desarrollo (la misma que muestra el hero de su ficha): render oficial
// local si existe → imagen de portada curada de 2Clics → primera imagen pública.
export function resolveDevelopmentHeroImage(slug: string, images: PublicImage[], publicDir?: string): PublicImage | null {
  const heroAsset = resolveDevelopmentAssets(slug, publicDir).hero?.[0];
  if (heroAsset) return localAssetToPublicImage(heroAsset.src);
  const editorial = getDevelopmentEditorialCuration(slug);
  return (editorial ? images[editorial.heroImageIndex] : undefined) || images[0] || null;
}

// Imagen de card (índice /desarrollos y selección del Home): render oficial local si existe →
// `cardImageIndex` curado (pensado para el recorte de card) → primera imagen pública.
export function resolveDevelopmentCardImage(slug: string, images: PublicImage[], publicDir?: string): PublicImage | null {
  const heroAsset = resolveDevelopmentAssets(slug, publicDir).hero?.[0];
  if (heroAsset) return localAssetToPublicImage(heroAsset.src);
  const editorial = getDevelopmentEditorialCuration(slug);
  return (editorial ? images[editorial.cardImageIndex] : undefined) || images[0] || null;
}
