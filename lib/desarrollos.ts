import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicImage, PublicProperty } from '@/lib/2clics/types';

// Helpers de presentación para /desarrollos — separados de app/desarrollos/page.tsx porque un
// archivo `page.tsx` de Next.js solo puede tener exports con nombres reservados (`metadata`,
// `default`, `generateStaticParams`, etc.); cualquier otro named export rompe el typegen de rutas.
// Reutilizados también por CuratedDevelopmentDetailView.tsx (landing de Faena).

export type CuratedEntry = { curation: DevelopmentCuration; sourceProperty: PublicProperty };

// ── Capa de curaduría editorial (WEB GARCÍA V2, decimotercera pasada) ──────────────────────────
//
// PRINCIPIO: 2Clics sigue siendo la única fuente de verdad del inventario (título, ubicación,
// imágenes, descripción). Esta capa NO duplica ni reescribe ese contenido — solo declara, por
// desarrollo, CÓMO organizarlo en una narrativa de proyecto: qué imagen real corresponde a cada
// bloque, qué fragmento REAL de la descripción corresponde a cada bloque, qué bloques existen, en
// qué orden y con qué layout. Nunca se guarda una copia del texto de la descripción acá — cada
// `SourceTextSegment` es una instrucción de EXTRACCIÓN que se resuelve en runtime contra
// `sourceProperty.description` (ya sanitizado por `adaptPublicProperty`/`parsePublicMetadata`).
//
// Esto reemplaza el enfoque de la duodécima pasada (dividir la descripción completa por saltos de
// línea y alternarla mecánicamente con fotos elegidas por espaciado) — mecánico pero sin relación
// real entre cada imagen y el texto que la acompañaba. Acá cada bloque tiene un tema real
// verificado a mano (imagen + fragmento) en vez de una alternancia automática.
//
// Un desarrollo SIN entrada en `EDITORIAL_CURATIONS` no rompe: `getDevelopmentEditorialCuration`
// devuelve `null` y la landing degrada con gracia a apertura + CTA de cierre, sin secciones
// editoriales inventadas. Deliberadamente NO hay un parser genérico que intente adivinar
// "headings" en la descripción de cualquier desarrollo futuro — cada desarrollo con landing rica
// tiene su propia curaduría explícita, igual que Faena acá abajo.

export type SourceTextSegment =
  // Primera oración del primer párrafo real de la descripción (delimitado por la propia fuente
  // con línea en blanco) — pensado para la apertura.
  | { type: 'firstParagraphLead' }
  // Continuación del primer párrafo real, después de esa primera oración — pensado para un bloque
  // "El proyecto" que no repita la misma frase que ya se mostró en la apertura.
  | { type: 'firstParagraphRest' }
  // Líneas reales entre dos markers literales que la propia fuente ya trae dentro de un mismo
  // párrafo (ej. una lista de amenities en texto libre, con "El edificio" y "Residencias" como
  // subtítulos de línea propia). `endMarker: null` = hasta el final del párrafo que contiene
  // `blockMarker`.
  | { type: 'markerBlockItems'; blockMarker: string; endMarker: string | null }
  | { type: 'none' };

export type DevelopmentSectionLayout = 'image-large' | 'image-left' | 'image-right' | 'text-only';

export type DevelopmentSection = {
  key: string;
  // Título editorial del bloque. Cuando coincide con un marker real (ej. "El edificio",
  // "Residencias"), es literalmente la palabra que ya existe en la fuente — no texto inventado.
  title?: string;
  sourceTextSegment: SourceTextSegment;
  // Índices dentro de `sourceProperty.images` (orden real que entrega 2Clics) — nunca URLs ni
  // copias de la imagen.
  imageIndexes: number[];
  layout: DevelopmentSectionLayout;
};

export type DevelopmentEditorialCuration = {
  heroImageIndex: number;
  introSegment: SourceTextSegment;
  sections: DevelopmentSection[];
};

// Faena (187676) — curaduría verificada a mano contra las 14 imágenes reales y la descripción
// real vigente (auditoría decimotercera pasada, ver docs/ai/PROPERTY_UX_DECISIONS.md):
// - índices 8, 9, 10, 12 son páginas de brochure con copy en inglés compuesto dentro del propio
//   archivo de imagen (no fotografía/render limpio) — excluidos de la curaduría.
// - índices 0/13 son el mismo render (portada exterior) y 6/7 son el mismo render (puente
//   elevado) y 1/11 son el mismo render (frente simétrico) — cada par cuenta como una sola imagen
//   útil, se usa un solo índice de cada par.
// - índices 2, 3, 4 (webp servidos con extensión .jpeg) son interiores reales de residencias.
const EDITORIAL_CURATIONS: Record<string, DevelopmentEditorialCuration> = {
  faena: {
    heroImageIndex: 0, // exterior nocturno con marquesina FAENA — portada
    introSegment: { type: 'firstParagraphLead' },
    sections: [
      {
        key: 'momento-visual',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [5], // pileta infinita en la azotea con vista a la bahía de Miami
        layout: 'image-large',
      },
      {
        key: 'proyecto',
        title: 'El proyecto',
        sourceTextSegment: { type: 'firstParagraphRest' },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'edificio',
        title: 'El edificio',
        sourceTextSegment: { type: 'markerBlockItems', blockMarker: 'El edificio', endMarker: 'Residencias' },
        imageIndexes: [6], // puente elevado entre las dos torres — el propio texto lo describe
        layout: 'image-left',
      },
      {
        key: 'residencias',
        title: 'Residencias',
        sourceTextSegment: { type: 'markerBlockItems', blockMarker: 'Residencias', endMarker: null },
        imageIndexes: [2], // living interior real de una residencia
        layout: 'image-right',
      },
    ],
  },
};

export function getDevelopmentEditorialCuration(slug: string): DevelopmentEditorialCuration | null {
  return EDITORIAL_CURATIONS[slug] || null;
}

function realParagraphs(description: string): string[] {
  return description
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function splitFirstSentence(paragraph: string): { lead: string; rest: string } {
  const match = paragraph.match(/^(.+?[.!?])\s+([\s\S]*)$/);
  if (!match) return { lead: paragraph, rest: '' };
  return { lead: match[1].trim(), rest: match[2].trim() };
}

function resolveMarkerBlockItems(description: string, blockMarker: string, endMarker: string | null): string[] {
  for (const block of realParagraphs(description)) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const startIndex = lines.findIndex((line) => line === blockMarker);
    if (startIndex === -1) continue;
    const endIndex = endMarker
      ? lines.findIndex((line, i) => i > startIndex && line === endMarker)
      : -1;
    return endIndex === -1 ? lines.slice(startIndex + 1) : lines.slice(startIndex + 1, endIndex);
  }
  return [];
}

// Resuelve un `SourceTextSegment` contra la descripción REAL en runtime — nunca contra una copia
// guardada acá. Devuelve `string` para segmentos de párrafo, `string[]` para listas de items
// extraídas entre markers, o `''` para `{ type: 'none' }`.
export function resolveSourceTextSegment(description: string, segment: SourceTextSegment): string | string[] {
  if (!description) return segment.type === 'markerBlockItems' ? [] : '';
  switch (segment.type) {
    case 'firstParagraphLead':
      return splitFirstSentence(realParagraphs(description)[0] || '').lead;
    case 'firstParagraphRest':
      return splitFirstSentence(realParagraphs(description)[0] || '').rest;
    case 'markerBlockItems':
      return resolveMarkerBlockItems(description, segment.blockMarker, segment.endMarker);
    case 'none':
    default:
      return '';
  }
}

// Resuelve índices reales de `sourceProperty.images` a las imágenes correspondientes — nunca
// genera ni sustituye por otra si el índice no existe (degrada a array vacío).
export function resolveSectionImages(images: PublicImage[], imageIndexes: number[]): PublicImage[] {
  return imageIndexes.map((index) => images[index]).filter((image): image is PublicImage => Boolean(image));
}
