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
  // Además fuera del catálogo maestro /propiedades (y de "relacionadas" en las fichas). Solo para
  // registros técnicos cuyo framing de propiedad sería engañoso (oportunidades de inversión).
  excludeFromMasterCatalog?: boolean;
};

// Lista central — agregar acá cualquier propiedad que García quiera clasificar editorialmente,
// sin importar si además aparece en DEVELOPMENTS/INVESTMENT_OPPORTUNITIES más abajo (esas listas
// agregan metadata de presentación — slug, nombre editorial, unidades — para SU landing propia;
// esta lista central es la única fuente de verdad de si esa propiedad sale del catálogo estándar).
// SINCRONIZACIÓN CON 2CLICS (2026-10-15, handoff final V2) — inventario real: 23 registros
// activos. Los registros fuera de mercado (Faena viejo 187676, Flow House, Icon Beach, One
// Hollywood, PALMA, El Yacht, Remeros viejo, etc.) NO se listan acá: quedan fuera porque 2Clics ya
// no los devuelve como activos (ver `isPublicPropertyStatus` en lib/2clics/format.ts). Esta lista
// solo declara la clasificación editorial de registros ACTIVOS.
export const CURATED_PROPERTIES: CuratedPropertyEntry[] = [
  // Faena Residences Miami — registro activo vigente (reemplaza al 187676, fuera de mercado).
  { propertyId: 236986, humanRef: 'GAR-236986', classification: 'desarrollo', excludeFromStandardCatalog: true },
  // Benavídez Village — 5 unidades activas agrupadas en UN solo desarrollo público.
  { propertyId: 233708, humanRef: 'GAR-233708', classification: 'desarrollo', excludeFromStandardCatalog: true },
  { propertyId: 237474, humanRef: 'GAR-237474', classification: 'desarrollo', excludeFromStandardCatalog: true },
  { propertyId: 237472, humanRef: 'GAR-237472', classification: 'desarrollo', excludeFromStandardCatalog: true },
  { propertyId: 233702, humanRef: 'GAR-233702', classification: 'desarrollo', excludeFromStandardCatalog: true },
  { propertyId: 233707, humanRef: 'GAR-233707', classification: 'desarrollo', excludeFromStandardCatalog: true },
  // Pacheco Central — único registro de la cartera vinculado al proyecto.
  { propertyId: 233719, humanRef: 'GAR-233719', classification: 'desarrollo', excludeFromStandardCatalog: true },
  // Domus Brickell Center — 236682 confirmado por García (nunca 236646).
  { propertyId: 236682, humanRef: 'GAR-236682', classification: 'desarrollo', excludeFromStandardCatalog: true },
  // 236646 — duplicado de Domus fuera de mercado. Exclusión defensiva: en la vigesimosexta pasada
  // el endpoint de listado lo siguió devolviendo después de que el detalle ya daba 404. Nunca usar
  // como fuente de ningún desarrollo.
  {
    propertyId: 236646,
    humanRef: 'FAB-236646',
    classification: 'duplicado-fuera-de-mercado',
    excludeFromStandardCatalog: true,
    excludeFromMasterCatalog: true,
  },
  // 445 N Shore Drive — oportunidad de participación, vive solo en /invertir.
  {
    propertyId: 206734,
    humanRef: 'FAB-206734',
    classification: 'proyecto-especial',
    excludeFromStandardCatalog: true,
    excludeFromMasterCatalog: true,
  },
];

const EXCLUDED_PROPERTY_IDS = new Set(
  CURATED_PROPERTIES.filter((entry) => entry.excludeFromStandardCatalog).map((entry) => entry.propertyId),
);

const MASTER_CATALOG_EXCLUDED_IDS = new Set(
  CURATED_PROPERTIES.filter((entry) => entry.excludeFromMasterCatalog).map((entry) => entry.propertyId),
);

export function isExcludedFromStandardCatalog(propertyId: number | null | undefined): boolean {
  return propertyId !== null && propertyId !== undefined && EXCLUDED_PROPERTY_IDS.has(propertyId);
}

// /comprar, /alquilar y la Home: fuera todo lo curado como desarrollo/inversión.
export function getExcludedPropertyIds(): number[] {
  return Array.from(EXCLUDED_PROPERTY_IDS);
}

// /propiedades (catálogo maestro) y "relacionadas": solo fuera lo que no es una propiedad.
export function getMasterCatalogExcludedPropertyIds(): number[] {
  return Array.from(MASTER_CATALOG_EXCLUDED_IDS);
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
  // Nombre editorial INTERNO de referencia (administrativo, tipo `humanRef`) — nunca se muestra
  // públicamente. Se mantiene porque no aporta duplicar el inventario sacándolo.
  name: string;
  // Nombre público CONFIRMADO por curaduría (decimosexta pasada) — cuando existe, tiene prioridad
  // sobre `sourceProperty.title`. Necesario porque, a diferencia de Faena (donde el `title` real
  // de 2Clics ya era el nombre público correcto, "Faena Residences Miami"), el resto de estos
  // registros trae títulos de aviso genéricos/deficientes ("Oportunidad Unica En Hollywood...",
  // o peor, con una promesa de rentabilidad incrustada: "...Renta Garantizada 6 %") — mostrar eso
  // como H1 público sería presentar un dato deficiente de 2Clics como si fuera verdad editorial,
  // algo explícitamente prohibido. `publicName` es el nombre real del proyecto, confirmado por
  // García (captura de CRM) y verificado contra el saludo real de la propia descripción de 2Clics
  // (ej. "¡Bienvenido a ICON BEACH", "ONE HOLLYWOOD", "¡Bienvenido a Flow House Miami
  // Worldcenter!") — nunca inventado. `null` = todavía sin nombre público confirmado (ver 187694
  // más abajo) o el `title` real de 2Clics ya es válido como nombre público (Faena) — en ambos
  // casos el consumidor decide el fallback correcto, nunca acá.
  publicName: string | null;
  sourcePropertyId: number;
  humanRef: string;
  // Todas las unidades reales que se muestran en "Propiedades disponibles". Hoy puede ser un
  // único id (sourcePropertyId repetido) — diseñado para crecer sin cambiar la forma:
  // propertyIds: [233708, 237474, ...]
  propertyIds: number[];
  // Mercado editorial del proyecto (decimonovena pasada) — driver del selector US/AR de
  // `/desarrollos`. Explícito por curaduría, NUNCA inferido buscando palabras en el título/
  // ubicación cruda de 2Clics (esos campos pueden ser deficientes o cambiar). Obligatorio: cada
  // desarrollo nuevo declara su mercado a mano, así el selector nunca "adivina" ni deja un
  // proyecto sin clasificar en ningún lado.
  market: 'US' | 'AR';
  // Identificador público de cada unidad (ej. "UF 16") — dato permanente de la unidad, declarado
  // por curaduría. Precio, superficie y orientación de cada unidad se leen en vivo de 2Clics.
  unitLabels?: Record<number, string>;
};

// La ficha de Faena es el patrón visual/estructural de referencia (apertura editorial, imágenes,
// secciones de contenido, CTA final único) — NUNCA la fuente de copy de los demás desarrollos.
// Cada desarrollo nuevo entra hoy SIN curaduría editorial propia en `lib/desarrollos.ts`
// (`getDevelopmentEditorialCuration` devuelve `null` para sus slugs) — `CuratedDevelopmentDetailView`
// ya tiene un fallback que degrada con gracia a apertura + CTA usando solo campos reales y
// verificables (imagen real, nombre público confirmado, ubicación real, primer fragmento real de
// la descripción) sin inventar secciones ni completar contenido por inferencia. La curaduría
// editorial completa (imágenes por bloque, "El edificio"/amenities, etc.) se hace desarrollo por
// desarrollo en una pasada futura — no automáticamente acá.
export const DEVELOPMENTS: DevelopmentCuration[] = [
  {
    slug: 'faena',
    name: 'Proyecto Faena',
    // El título vigente de 236986 en 2Clics ya es el nombre público ("Faena Residences Miami").
    publicName: null,
    sourcePropertyId: 236986,
    humanRef: 'GAR-236986',
    propertyIds: [236986],
    market: 'US',
  },
  {
    slug: 'benavidez-village',
    name: 'Benavídez Village',
    publicName: 'Benavídez Village',
    // 233702 es la unidad de referencia para imágenes/descripción del proyecto (las 5 unidades
    // comparten el mismo texto). `propertyIds` en orden de UF.
    sourcePropertyId: 233702,
    humanRef: 'GAR-233702',
    propertyIds: [233708, 237474, 237472, 233702, 233707],
    market: 'AR',
    unitLabels: {
      233708: 'UF 11',
      237474: 'UF 12',
      237472: 'UF 15',
      233702: 'UF 16',
      233707: 'UF 20',
    },
  },
  {
    slug: 'pacheco-central',
    name: 'Pacheco Central',
    // El título de 2Clics describe la unidad de referencia, no el desarrollo.
    publicName: 'Pacheco Central',
    sourcePropertyId: 233719,
    humanRef: 'GAR-233719',
    propertyIds: [233719],
    market: 'AR',
  },
  {
    slug: 'domus-brickell-center',
    name: 'Domus Brickell Center',
    // Nombre público confirmado explícitamente por García — no se infiere del título crudo de
    // 2Clics (el registro 236682 tiene su propio título, pero el nombre público confirmado es
    // este, verbatim).
    publicName: 'Domus Brickell Center',
    // CONFIRMADO explícitamente por García (no asumido ni inferido). Existe un segundo registro
    // real del mismo proyecto, 236646 ("Domus Flats Brickell Center"), cargado el mismo día en
    // 2Clics — NUNCA se usa como sourcePropertyId ni se modifica. Ver auditoría completa en
    // docs/ai/PROJECT_STATE.md ("Domus Brickell Center").
    sourcePropertyId: 236682,
    humanRef: 'GAR-236682',
    propertyIds: [236682],
    market: 'US',
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

// Driver del selector US/AR de `/desarrollos` (decimonovena pasada) — filtra por el campo
// explícito `market` de la curaduría, nunca por texto de título/ubicación. Un desarrollo AR
// agregado a `DEVELOPMENTS` con `market: 'AR'` aparece acá automáticamente, sin tocar esta
// función ni la página.
export function getDevelopmentsByMarket(market: 'US' | 'AR'): DevelopmentCuration[] {
  return DEVELOPMENTS.filter((entry) => entry.market === market);
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
    // 206734 es el vínculo técnico en 2Clics (tipo "Casa", campos de propiedad que no describen
    // una participación). La oportunidad vigente es 445 N Shore Drive (Normandy Shores, Miami
    // Beach) — reemplazó a la de Coconut Grove en el CRM (octubre 2026).
    slug: '445-n-shore-drive',
    name: '445 N Shore Drive · Normandy Shores',
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

// La URL /propiedades/[id] del registro técnico de una oportunidad redirige a su landing.
export function getInvestmentOpportunityByPropertyId(
  propertyId: number | null | undefined,
): InvestmentOpportunityCuration | null {
  if (propertyId === null || propertyId === undefined) return null;
  return (
    INVESTMENT_OPPORTUNITIES.find((entry) => entry.active && entry.propertyIds.includes(propertyId)) || null
  );
}
