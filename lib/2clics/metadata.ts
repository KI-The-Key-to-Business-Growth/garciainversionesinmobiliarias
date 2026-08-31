import { sanitizeVideoUrl } from '@/lib/security/ssrf';
import type {
  PublicMetadata,
  PublicMetadataDiagnostics,
  TwoclicsMetadata,
} from '@/lib/2clics/types';

const META_KEY_ALIASES: Record<keyof PublicMetadata, string[]> = {
  title: ['title', 'titulo'],
  description: ['description_plain_text', 'description', 'descripcion'],
  rooms: ['amount_room', 'rooms', 'ambientes'],
  bedrooms: ['amount_bedroom', 'bedrooms', 'dormitorios'],
  bathrooms: ['bathrooms', 'bathroom', 'banos', 'bano', 'amount_bathrooms', 'amount_bath'],
  toilettes: ['toilette', 'toilettes', 'amount_toilettes'],
  garages: ['garage', 'garages', 'parking', 'parking_spaces', 'cocheras', 'cochera', 'amount_garage'],
  garageType: ['garage_type', 'parking_type', 'tipo_cochera', 'tipo_de_cochera'],
  expenses: ['expenses', 'expense', 'expensas', 'common_expenses'],
  expensesCurrency: ['expenses_currency', 'expense_currency', 'moneda_expensas'],
  floor: ['floor', 'piso'],
  unit: ['unit', 'unidad', 'unit_number', 'dept_number'],
  disposition: ['disposition', 'disposicion'],
  orientation: ['orientation', 'orientacion'],
  coveredArea: ['covered_area', 'superficie_cubierta'],
  semiCoveredArea: ['semicovered_area', 'semi_covered_area', 'semiCoveredArea', 'superficie_semicubierta'],
  totalArea: ['total_area', 'homo_area', 'superficie_total'],
  landArea: ['land_area', 'terrain_area', 'lot_area', 'superficie_terreno', 'terreno'],
  balcony: ['balcony', 'balcon'],
  balconyArea: ['balcony_area', 'superficie_balcon'],
  condition: ['condition', 'condition_status', 'estado_propiedad', 'estado'],
  antiquity: ['antiquity', 'age', 'antiguedad', 'building_date_number'],
  constructionDate: ['construction_date', 'constructionDate', 'fecha_construccion'],
  deliveryDate: ['delivery_date', 'deliveryDate', 'fecha_entrega', 'fecha_de_entrega'],
  minPrice: ['min_price', 'minimum_price', 'precio_minimo'],
  maxPrice: ['max_price', 'maximum_price', 'precio_maximo'],
  minArea: ['min_area', 'minimum_area', 'superficie_minima'],
  maxArea: ['max_area', 'maximum_area', 'superficie_maxima'],
  videoUrl: ['video', 'video_url', 'prop_video_url', 'youtube', 'youtube_url'],
  tourUrl: ['tour', 'tour_url', 'virtual_tour', 'matterport', '360'],
};

// WEB GARCÍA V2 (Desarrollos, décima pasada) — saneamiento estrecho de un token interno de
// CRM/broker confirmado contra datos reales de 2Clics: la descripción pública de la propiedad
// 187676 trae literalmente "[FABIANAGA-456]" como prefijo (verificado byte a byte contra la
// respuesta real — no es una suposición). Ese identificador es interno de García/CRM y no debe
// llegar nunca al usuario. Patrón DELIBERADAMENTE ESTRECHO: solo corchetes conteniendo
// "FABIANAGA-" + uno o más dígitos — nunca "todo lo que esté entre []" (eso borraría texto
// legítimo con corchetes, ej. aclaraciones editoriales). Si en el futuro aparece una variante
// confirmada del mismo identificador interno (mismo formato "PREFIJO-número"), agregar acá con
// evidencia real, no por sospecha.
const INTERNAL_DESCRIPTION_TAG_PATTERN = /\[FABIANAGA-\d+\]/g;

// Exportada para test directo (input/output) y para que cualquier otro punto de la capa pública
// que alguna vez necesite sanear texto libre de 2Clics reutilice la misma regla en vez de
// reimplementarla. Quita el/los token(s) confirmados y normaliza el espacio en blanco que queda
// (el prefijo real trae un salto de línea en blanco después del tag) sin tocar el resto del texto.
export function stripInternalDescriptionTags(value: string): string {
  return value
    .replace(INTERNAL_DESCRIPTION_TAG_PATTERN, '')
    .replace(/^\s+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

const INTERNAL_KEY_FRAGMENTS = [
  'private_note',
  'partner_note',
  'info_contact',
  'internal',
  'admin',
  'owner',
  'propietario',
  'commission',
  'comision',
  'confidential',
  'password',
  'token',
  'secret',
];

function normalizeKey(key: unknown): string {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isInternalKey(key: string): boolean {
  return INTERNAL_KEY_FRAGMENTS.some((fragment) => key.includes(normalizeKey(fragment)));
}

function findPublicTarget(key: string): keyof PublicMetadata | null {
  for (const [target, aliases] of Object.entries(META_KEY_ALIASES)) {
    if (aliases.some((alias) => normalizeKey(alias) === key)) {
      return target as keyof PublicMetadata;
    }
  }
  return null;
}

// Bug real confirmado 2026-08-26: el endpoint de DETALLE (`GET /api/property/{id}`, usado por la
// ficha) devuelve `metaKey` = nombre semántico (ej. "amount_bath") y `metaId` = id numérico
// interno. El endpoint de LISTADO/catálogo (`POST /api/property`, usado por las cards) devuelve
// exactamente al revés: `metaKey` = id numérico y `metaId` = nombre semántico. Probado contra la
// API real con la misma propiedad por ambos endpoints. Sin este fix, cualquier campo derivado de
// `meta_data` (baños, cocheras, orientación, antigüedad, título editorial, etc.) queda vacío en
// las cards del catálogo aunque el dato exista — el código históricamente solo miraba `metaKey`,
// lo cual coincide con el endpoint de detalle (por eso la ficha siempre funcionó) pero nunca con
// el de listado. Se prueban ambos campos contra la whitelist/blocklist y se usa el que realmente
// tenga forma de clave semántica — funciona sin importar de qué endpoint vino la propiedad.
function looksLikeSemanticKey(normalized: string): boolean {
  return normalized === 'building_date' || Boolean(findPublicTarget(normalized)) || isInternalKey(normalized);
}

function looksNumericId(normalized: string): boolean {
  return /^\d+$/.test(normalized);
}

function resolveMetaRawKey(item: TwoclicsMetadata): string {
  const rawMetaKey = item.metaKey || '';
  const rawMetaId = item.metaId || '';
  const byMetaKey = normalizeKey(rawMetaKey);
  const byMetaId = normalizeKey(rawMetaId);

  // 1) Señal fuerte: el campo matchea una clave conocida (pública o interna).
  if (looksLikeSemanticKey(byMetaKey)) return rawMetaKey;
  if (looksLikeSemanticKey(byMetaId)) return rawMetaId;

  // 2) Campo genuinamente no soportado por la whitelist/blocklist (pasa igual, ninguno de los dos
  // endpoints tiene por qué limitarse a los campos que ya conocemos) — señal estructural: en
  // ambos endpoints reales el id interno es siempre puramente numérico y el nombre semántico no,
  // así que se prefiere el campo no-numérico. Generaliza correctamente sin necesitar agregar cada
  // campo nuevo a las listas de arriba solo para que la detección de endpoint funcione.
  if (rawMetaId && !looksNumericId(byMetaId) && looksNumericId(byMetaKey)) return rawMetaId;
  return rawMetaKey;
}

function shouldOverrideMetadata(
  target: keyof PublicMetadata,
  rawKey: string,
  metadata: PublicMetadata,
): boolean {
  if (target === 'description') {
    return normalizeKey(rawKey) === 'description_plain_text' || !metadata.description;
  }
  if (target === 'antiquity') {
    return !metadata.antiquity;
  }
  return !metadata[target];
}

function cleanBuildingDateValue(value: string): string {
  const normalized = normalizeKey(value).replace(/\s+/g, '_');
  const labels: Record<string, string> = {
    estrenar: 'A estrenar',
    under_construction: 'En construcción',
  };
  return labels[normalized] || '';
}

function cleanMetaValue(target: string, value: string, rawKey: string): string {
  if (target === 'videoUrl' || target === 'tourUrl') return sanitizeVideoUrl(value);
  if (target === 'antiquity' && normalizeKey(rawKey) === 'building_date_number') {
    return /^\d+$/.test(value.trim()) ? `${value.trim()} años` : value.trim();
  }
  // Único punto de entrada de `description` a la capa pública (ver adaptPublicProperty/
  // adaptPublicDevelopment en lib/2clics/adapters.ts, ambos leen `metadata.description`) — sanear
  // acá cubre /propiedades/[id], /desarrollos y /desarrollos/[slug] a la vez, sin tocar la
  // respuesta cruda de 2Clics ni duplicar la regla en cada página.
  if (target === 'description') return stripInternalDescriptionTags(value.trim());
  return value.trim();
}

export function parsePublicMetadata(meta: TwoclicsMetadata[] | undefined): PublicMetadata {
  return parseMetadata(meta).metadata;
}

export function inspectPublicMetadata(meta: TwoclicsMetadata[] | undefined): PublicMetadataDiagnostics {
  return parseMetadata(meta).diagnostics;
}

function parseMetadata(meta: TwoclicsMetadata[] | undefined): {
  metadata: PublicMetadata;
  diagnostics: PublicMetadataDiagnostics;
} {
  const metadata: PublicMetadata = {};
  const diagnostics: PublicMetadataDiagnostics = {
    known: {},
    internalKeysPresent: [],
    unknownPublicKeys: [],
  };

  for (const item of Array.isArray(meta) ? meta : []) {
    const rawKey = resolveMetaRawKey(item);
    const key = normalizeKey(rawKey);
    const value = String(item.metaValue || '').trim();
    if (!key || !value) continue;

    if (key === 'building_date') {
      const condition = cleanBuildingDateValue(value);
      if (condition && !metadata.condition) {
        metadata.condition = condition;
        diagnostics.known.condition = condition;
      }
      continue;
    }

    if (isInternalKey(key)) {
      diagnostics.internalKeysPresent.push(rawKey);
      continue;
    }

    const target = findPublicTarget(key);
    if (!target) {
      diagnostics.unknownPublicKeys.push(rawKey);
      continue;
    }

    if (!shouldOverrideMetadata(target, rawKey, metadata)) continue;

    const cleanValue = cleanMetaValue(target, value, rawKey);
    if (!cleanValue) continue;
    metadata[target] = cleanValue;
    diagnostics.known[target] = cleanValue;
  }

  return { metadata, diagnostics };
}
