import 'server-only';

// Curaduría editorial en código — WEB GARCÍA V2.
//
// Esta capa NO es una base de datos de propiedades: no guarda título, precio, imágenes,
// descripción, ubicación, moneda ni características. Todo eso sigue viniendo de 2Clics
// (lib/2clics/*) en tiempo real. Acá solo viven RELACIONES — qué propertyId pertenece a qué
// clasificación editorial, y si esa clasificación lo saca del catálogo estándar — para que la web
// pueda decidir navegación/presentación sin duplicar el inventario en Supabase ni en ningún otro
// lado. Ver docs/ai/WEB_GARCIA_V2.md.
//
// REGLA DE CURADURÍA (actualizada — segunda pasada V2): por defecto, toda propiedad pública sigue
// perteneciendo automáticamente a Comprar (VENTA) o Alquilar (ALQUILER_PERMANENTE) según su
// operationType real. Las propiedades que García clasifique expresamente (desarrollo, proyecto
// especial, oportunidad de inversión, u otra categoría futura) PUEDEN además quedar excluidas del
// catálogo estándar de Comprar/Alquilar — eso lo decide `excludeFromStandardCatalog`, por item, acá
// abajo. La exclusión NUNCA aplica al catálogo maestro `/propiedades` (esa sigue siendo la fuente
// técnica/canónica completa) ni a "Oportunidades seleccionadas" del Home — solo a `/comprar` y
// `/alquilar`.

export type CurationClassification = 'desarrollo' | 'proyecto-especial' | 'oportunidad-inversion' | string;

export type CuratedPropertyEntry = {
  propertyId: number;
  // Referencia humana (folder/COD de 2Clics) — solo para que quien edite este archivo confirme a
  // simple vista de qué propiedad se trata. No se usa en ninguna consulta a la API.
  humanRef: string;
  classification: CurationClassification;
  excludeFromStandardCatalog: boolean;
};

// Lista central — agregar acá cualquier propiedad que García quiera clasificar editorialmente,
// sin importar si además aparece en DEVELOPMENTS/INVESTMENT_OPPORTUNITIES más abajo (esas listas
// agregan metadata de presentación — slug, nombre editorial, unidades — para SU landing propia;
// esta lista central es la única fuente de verdad de si esa propiedad sale del catálogo estándar).
export const CURATED_PROPERTIES: CuratedPropertyEntry[] = [
  { propertyId: 187676, humanRef: 'FAB-187676', classification: 'desarrollo', excludeFromStandardCatalog: true },
  {
    propertyId: 206734,
    humanRef: 'FAB-206734',
    classification: 'proyecto-especial',
    excludeFromStandardCatalog: true,
  },
];

const EXCLUDED_PROPERTY_IDS = new Set(
  CURATED_PROPERTIES.filter((entry) => entry.excludeFromStandardCatalog).map((entry) => entry.propertyId),
);

export function isExcludedFromStandardCatalog(propertyId: number | null | undefined): boolean {
  return propertyId !== null && propertyId !== undefined && EXCLUDED_PROPERTY_IDS.has(propertyId);
}

export function getExcludedPropertyIds(): number[] {
  return Array.from(EXCLUDED_PROPERTY_IDS);
}

export function getCurationForPropertyId(propertyId: number | null | undefined): CuratedPropertyEntry | null {
  if (propertyId === null || propertyId === undefined) return null;
  return CURATED_PROPERTIES.find((entry) => entry.propertyId === propertyId) || null;
}

// DESARROLLOS (/desarrollos, /desarrollos/[slug]) — agrupaciones curatoriales de propertyIds
// normales. Deliberadamente NO usa el módulo pago `/api/development` de 2Clics (ver
// docs/ai/WEB_GARCIA_V2.md). Cada propertyId sigue siendo una propiedad real e independiente en
// 2Clics — esto solo declara que un grupo de propertyIds pertenece al mismo proyecto editorial.
export type DevelopmentCuration = {
  slug: string;
  name: string;
  sourcePropertyId: number;
  humanRef: string;
  // Todas las unidades reales que se muestran en "Propiedades disponibles". Hoy puede ser un
  // único id (sourcePropertyId repetido) — diseñado para crecer sin cambiar la forma:
  // propertyIds: [187676, 123456, ...]
  propertyIds: number[];
};

export const DEVELOPMENTS: DevelopmentCuration[] = [
  {
    slug: 'faena',
    name: 'Proyecto Faena',
    sourcePropertyId: 187676,
    humanRef: 'FAB-187676',
    propertyIds: [187676],
  },
];

export function getDevelopmentBySlug(slug: string): DevelopmentCuration | null {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return null;
  return DEVELOPMENTS.find((entry) => entry.slug === normalized) || null;
}

export function getAllDevelopmentSlugs(): string[] {
  return DEVELOPMENTS.map((entry) => entry.slug);
}

// INVERTIR (/invertir, /invertir/[slug]) — alternativas/estructuras de inversión REALES que
// García tiene efectivamente disponibles hoy. Cada entrada es una oportunidad puntual, con nombre
// editorial neutral/provisional (nunca un término jurídico/comercial no confirmado como "fondo",
// "coinversión", "inversión fraccionada", "franquicia", "crowdfunding", "vehículo" o "renta
// garantizada" — eso requiere documentación oficial de García que todavía no existe). Vacío = no
// mostrar nada inventado.
//
// PRIVACIDAD/COMUNICACIÓN PÚBLICA (tercera pasada, corrección explícita): esta lista NUNCA debe
// contener nombres de personas externas ni referencias a acuerdos internos (quién trabaja el
// proyecto con quién, si un socio está confirmado, etc.) ni frases sobre que "la estructura
// todavía no está confirmada" — todo eso es conocimiento interno, documentado en
// `docs/ai/WEB_GARCIA_V2.md`, y NUNCA copy público. Si en el futuro hace falta un texto editorial
// público adicional al de la propiedad real, `note` es el lugar — pero debe ser una descripción
// neutral de la OPORTUNIDAD, jamás de acuerdos o personas internas.
export type InvestmentOpportunityCuration = {
  slug: string;
  // Nombre editorial neutral/provisional — no es una categoría legal/comercial confirmada.
  name: string;
  sourcePropertyId: number;
  humanRef: string;
  propertyIds: number[];
  // Categoría editorial libre (extensible) — no una clasificación legal. Ej.: 'proyecto-especial'.
  category: CurationClassification;
  // Orden de aparición en /invertir (ascendente). Ítems futuros pueden insertarse sin reordenar
  // los existentes usando huecos (10, 20, 30...).
  order: number;
  // false = configurada pero no se muestra todavía (nunca se borra el registro para "pausarla").
  active: boolean;
  // Nota editorial pública OPCIONAL — solo si hay algo confirmado y neutral que agregar más allá
  // de los datos reales de la propiedad. Nunca nombres de personas ni estado de acuerdos internos.
  note?: string;
};

export const INVESTMENT_OPPORTUNITIES: InvestmentOpportunityCuration[] = [
  {
    slug: 'proyecto-especial-miami',
    name: 'Proyecto especial Miami',
    sourcePropertyId: 206734,
    humanRef: 'FAB-206734',
    propertyIds: [206734],
    category: 'proyecto-especial',
    order: 10,
    active: true,
  },
];

export function getInvestmentOpportunityBySlug(slug: string): InvestmentOpportunityCuration | null {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return null;
  return INVESTMENT_OPPORTUNITIES.find((entry) => entry.slug === normalized) || null;
}

// Únicamente activas, en orden — /invertir nunca debe mostrar una oportunidad pausada ni en
// desorden arbitrario.
export function getActiveInvestmentOpportunities(): InvestmentOpportunityCuration[] {
  return INVESTMENT_OPPORTUNITIES.filter((entry) => entry.active).sort((a, b) => a.order - b.order);
}
