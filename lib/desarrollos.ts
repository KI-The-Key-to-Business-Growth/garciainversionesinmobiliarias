import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicImage, PublicLocation, PublicProperty, TwoclicsAmenity, TwoclicsRegion } from '@/lib/2clics/types';

// Helpers de presentación para /desarrollos — separados de app/desarrollos/page.tsx porque un
// archivo `page.tsx` de Next.js solo puede tener exports con nombres reservados (`metadata`,
// `default`, `generateStaticParams`, etc.); cualquier otro named export rompe el typegen de rutas.
// Reutilizados también por CuratedDevelopmentDetailView.tsx (fichas de desarrollo) y
// CuratedDevelopmentCard.tsx.

// Vínculo técnico MÍNIMO con el registro real de 2Clics para la card del índice — NO
// `PublicProperty` completo (decimosexta pasada, ver comentario extenso en
// CuratedDevelopmentCard.tsx: cualquier página con un Client Component en el árbol —
// Header/Footer/WhatsAppFloat, en TODAS— serializa las props completas de cada Server Component
// en el payload RSC/"ver código fuente", aunque el JSX nunca las pinte).
export type DevelopmentCardSource = {
  title: string;
  location: PublicLocation;
  region: TwoclicsRegion;
  image: PublicImage | null;
};

export type CuratedEntry = { curation: DevelopmentCuration; source: DevelopmentCardSource };

// Reduce un `PublicProperty` completo al vínculo mínimo que necesita la card del índice — único
// punto donde `app/desarrollos/page.tsx` toca el objeto completo, para no repetir esta reducción
// en cada consumidor. `publicName` (si existe) reemplaza `property.title` ANTES de que el título
// crudo de 2Clics se convierta en prop de ningún componente — no alcanza con que el componente
// "prefiera" `publicName` al renderizar: el título crudo de 2Clics puede traer un claim no
// publicable (ver docs/ai/PROPERTY_UX_DECISIONS.md, "Renta Garantizada 6%" en el título real de
// Flow House) y, aunque el JSX nunca lo pinte, sigue viajando en el payload RSC si llega a ser
// parte de las props — hay que evitar que llegue a serlo.
export function toDevelopmentCardSource(property: PublicProperty, publicName?: string | null): DevelopmentCardSource {
  return {
    title: publicName || property.title,
    location: property.location,
    region: property.region,
    image: property.images[0] || null,
  };
}

// ── Capa de curaduría editorial (WEB GARCÍA V2, decimotercera pasada; generalizada en la
// decimoséptima; consolidada en un sistema único en la decimoctava) ────────────────────────────
//
// PRINCIPIO: 2Clics sigue siendo la única fuente de verdad del inventario (título, ubicación,
// imágenes, descripción, amenities estructurados). Esta capa NO duplica ni reescribe ese
// contenido para lo que SÍ puede extraerse tal cual — solo declara, por desarrollo, CÓMO
// organizarlo en una narrativa de proyecto: qué imagen real corresponde a cada bloque, qué
// fragmento corresponde a cada bloque, qué bloques existen, en qué orden y con qué layout.
//
// SISTEMA EDITORIAL DEFINITIVO (decimoctava pasada): los cuatro desarrollos con curaduría propia
// (Faena, Icon Beach, Flow House Miami Worldcenter, One Hollywood) comparten la MISMA
// infraestructura declarativa (`DevelopmentSection`/`DevelopmentSectionLayout`,
// `CuratedDevelopmentDetailView`) y el mismo lenguaje visual (`.project-*` en globals.css) — pero
// CADA UNO tiene su propio conjunto de secciones, decidido únicamente por el material real
// disponible. Flow House, por ejemplo, no tiene ninguna fotografía real utilizable del edificio
// (las únicas tomas exteriores vienen incrustadas en una pieza de brochure con logo y eslogan —
// ver auditoría más abajo) y por eso NO tiene sección "El edificio": no se fuerza una sección sin
// material real que la sostenga (regla C/D del sistema, ver docs/ai/PROPERTY_UX_DECISIONS.md).
//
// DOS ESTRATEGIAS DE TEXTO CONVIVEN A PROPÓSITO (desde la decimoséptima pasada):
// - `firstParagraphLead`/`firstParagraphRest`/`markerBlockItems`: EXTRACCIÓN en runtime contra
//   `sourceProperty.description` real — nunca se guarda una copia acá. Válida cuando la
//   descripción real de 2Clics ya es, tal cual, copy público utilizable (Faena).
// - `curatedText`/`curatedList`: copy editorial ORIGINAL, escrito por curaduría a partir de
//   hechos verificados (2Clics + fuentes oficiales/prensa especializada cuando se auditaron) —
//   nunca una copia textual de la descripción cruda de 2Clics. Necesaria cuando esa descripción
//   es demasiado comercial/desactualizada para extraerse tal cual (Icon Beach, Flow House, One
//   Hollywood: precios viejos, cronograma de depósitos, datos de agente, y en Flow House una
//   promesa de renta garantizada — todo mezclado con el contenido real aprovechable).
//   El HECHO detrás de cada texto está verificado; la REDACCIÓN es nueva, nunca copiada.
//
// Un desarrollo SIN entrada en `EDITORIAL_CURATIONS` no rompe: `getDevelopmentEditorialCuration`
// devuelve `null` y la landing degrada con gracia a apertura + CTA de cierre, sin secciones
// editoriales inventadas. Deliberadamente NO hay un parser genérico que intente adivinar
// "headings" en la descripción de cualquier desarrollo futuro — cada desarrollo con landing rica
// tiene su propia curaduría explícita.

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
  // Copy editorial ORIGINAL (párrafo), curado a mano — ver nota arriba. `text` vive acá, no en
  // ningún otro lado, y nunca se genera a partir de la descripción cruda de 2Clics en runtime.
  | { type: 'curatedText'; text: string }
  // Lista editorial ORIGINAL curada a mano (mismo criterio que `curatedText`, pero para bloques
  // tipo "El edificio"/"Residencias" con varios ítems cortos en vez de un párrafo).
  | { type: 'curatedList'; items: string[] }
  | { type: 'none' };

export type DevelopmentSectionLayout = 'image-large' | 'image-left' | 'image-right' | 'text-only' | 'snapshot';

// Par label/value editorial para el bloque "Project Snapshot" (decimoctava pasada, FASE 3) — NUNCA
// un dato dinámico/comercial (precio, disponibilidad, entrega, expensas). Solo P/S verificados.
export type DevelopmentSnapshotField = { label: string; value: string };

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
  // Solo layout 'snapshot' — ver `DevelopmentSnapshotField`. Se muestran únicamente los campos
  // que existan; nunca se completa con placeholders ni "Consultar" para lo que falta.
  snapshotFields?: DevelopmentSnapshotField[];
  // Override opcional del aspect-ratio real de la imagen de este bloque específico (valor CSS
  // `aspect-ratio`, ej. '5/3', '3/4') — sin esto se usa el default sistémico del layout
  // (image-left → 3/2, image-right → 4/5, ver globals.css). Usado para preservar la orientación
  // real de una foto ya curada y aprobada (ej. Faena) en vez de forzarla al default nuevo.
  imageAspect?: string;
};

export type DevelopmentEditorialCuration = {
  heroImageIndex: number;
  introSegment: SourceTextSegment;
  sections: DevelopmentSection[];
  // Sección de amenities editorial — OPT-IN explícito por desarrollo, nunca automática. Solo
  // tiene sentido activarla cuando hay 2+ amenities reales ESTRUCTURADOS de 2Clics
  // (`sourceProperty.amenities`, ya filtrados por `filterEditorialAmenities`) que APORTEN algo no
  // cubierto ya por otra sección curada (ver nota de la decimoctava pasada más abajo: Faena, Flow
  // House y One Hollywood deliberadamente no la usan, cada uno por su propio motivo).
  amenities?: {
    title?: string;
    imageIndex?: number;
    layout: 'image-left' | 'image-right';
  };
  // "Interiores y residencias" / "Interiores" (FASE 4, vigésima pasada) — bloque visual opcional,
  // SIEMPRE el último antes del CTA (después de "Amenities" cuando ese bloque también está
  // activo — mismo criterio de posición: opt-in explícito, nunca automático). `title` es
  // "Interiores y residencias" cuando TODAS las imágenes elegidas son interiores de una unidad
  // real verificable, o "Interiores" cuando alguna imagen es un espacio compartido/común (nunca
  // se llama "residencias" a lo que no puede verificarse como tal). 1 a 4 `imageIndexes`, cada uno
  // auditado individualmente — sin imágenes de brochure, sin eslóganes, sin repetir una imagen ya
  // usada arriba salvo que no exista alternativa real (ver auditoría por desarrollo más abajo).
  interiors?: {
    title: string;
    imageIndexes: number[];
  };
};

// Amenities estructuradas de 2Clics que NO aportan al relato editorial de NINGÚN desarrollo,
// porque son idénticas en toda la cartera curada (auditoría decimoctava pasada: "Permite
// mascotas" aparece igual en Faena/Icon Beach/Flow House/One Hollywood — cuatro edificios, cuatro
// developers distintos, mismo tag). Lee como una casilla de política genérica del CRM, no como un
// dato arquitectónico o de experiencia que distinga a un desarrollo de otro — se filtra siempre,
// antes de contar o mostrar amenities, en cualquier desarrollo.
const NON_EDITORIAL_AMENITY_NAMES = new Set(['Permite mascotas']);

export function filterEditorialAmenities(amenities: TwoclicsAmenity[]): TwoclicsAmenity[] {
  return amenities.filter((amenity) => Boolean(amenity.name) && !NON_EDITORIAL_AMENITY_NAMES.has(amenity.name as string));
}

// ── Auditorías (decimoctava pasada) ─────────────────────────────────────────────────────────────
//
// Faena (187676) — sin cambios de contenido/imágenes respecto a la decimotercera pasada (ya
// aprobado). Se le agregó únicamente el bloque "Project Snapshot" (FASE 3) con datos verificados
// contra faena.com/residences/miami-river y faenaresidencesmiami.com (developer: Fortune
// International Group + KAR Properties, en asociación con Alan Faena — el propio Alan Faena firma
// la descripción real de 2Clics; arquitectura: Rafael Viñoly Architects; interiorismo: Bryan
// O'Sullivan Studio; paisajismo: Sasaki Studio). Cantidad de unidades/pisos NO se confirmó en
// ningún sitio oficial consultado (ninguno de los dos publica esos números) — se omiten, no se
// completan por inferencia. `imageAspect` de "El edificio"/"Residencias" fijado explícitamente a
// los ratios reales ya aprobados (5/3 y 3/4) para no alterar el crop de imágenes ya validadas.
//
// Icon Beach (187677) — auditoría completa de imágenes en la decimoséptima pasada, revisada de
// nuevo esta pasada:
// - índice 14 (usado hasta ahora en "El edificio") es una COMPOSICIÓN gráfica tipo brochure: el
//   render de la torre aparece recortado dentro de un marco rectangular superpuesto sobre una
//   textura de fondo de olas/espuma a pantalla completa — no es una foto/render arquitectónico
//   limpio, es una pieza de marketing. Reemplazado por el índice 2 (exterior real: la torre vista
//   desde una galería/pérgola ajardinada de acceso, sin marcos ni textos superpuestos, 1520px).
// - índice 15 sigue excluido (eslogan comercial grande incrustado: "UNDERSTATED LUXURY,
//   EFFORTLESS STYLE...").
// - índice 16 sigue sin usarse como imagen (brochure de texto), pero sus datos reales siguen
//   alimentando el copy de "Hollywood Beach y la ubicación".
// - "Permite mascotas" se retira de la sección de Amenities (ver `NON_EDITORIAL_AMENITY_NAMES`) —
//   quedan Sauna y Piscina, todavía ≥2, la sección se mantiene.
// - BUG DE RENDER CORREGIDO esta pasada (no era un problema de datos): el bloque "Hollywood Beach
//   y la ubicación" declaraba `curatedText` (un párrafo) con `layout: 'image-right'`, pero
//   `CuratedDevelopmentDetailView` solo renderizaba `items` (listas) en ese layout — el párrafo
//   nunca llegaba a pintarse, dejando el heading "huérfano" (título + imagen, sin texto debajo).
//   Corregido en el componente, no acá — este dato ya estaba bien curado desde la decimoséptima
//   pasada.
//
// Flow House Miami Worldcenter (187681) — SIN curaduría editorial hasta esta pasada. Auditoría
// completa de 21 imágenes:
// - índice 1 es un plano aéreo con el ISOTIPO "flow" escrito directamente en el mosaico de la
//   pileta — pieza de marca, no foto editorial. Excluido.
// - índices 16 a 20 son páginas completas de un brochure (collage con logo "flow HOUSE", líneas
//   doradas decorativas, y el texto íntegro de la ficha comercial, incluida la promesa "Programa
//   de renta garantizada... 6% de retorno neto anual" IMPRESA en los píxeles de la imagen).
//   Excluidos sin excepción — la única foto de torre exterior real del set (una vista pequeña
//   dentro del índice 16) está incrustada en ese collage y no existe como archivo independiente
//   limpio; no hay ninguna imagen de exterior de torre utilizable en todo el set.
// - índices 2/3, 5/6, 10/11 y 14/15 son pares de casi-duplicados (mismo ambiente, ángulo
//   distinto) — se usa un solo índice de cada par.
// - índice 7 tiene el texto "FLOW HOUSE" impreso dos veces en un cartel dentro del propio
//   ambiente — evitado, hay alternativas sin texto de marca visible.
// - CONSECUENCIA EDITORIAL: sin ninguna foto de exterior de torre ni de una residencia
//   individual utilizables, la ficha de Flow House NO tiene secciones "El edificio" ni
//   "Residencias" con imagen — se cuenta la historia real disponible, que es la de sus espacios
//   de bienestar/trabajo/comunidad (consistente con el propio posicionamiento del proyecto:
//   "bienestar, alfabetización empresarial y conectividad social"). "Residencias" sí aparece,
//   pero como bloque de texto/lista sin imagen (`layout: 'text-only'`), con las características
//   reales de las unidades que sí trae la descripción de 2Clics.
// - Developer verificado (Hoodline, nota de prensa real fechada 2026-04, y resident.com):
//   Flow (fundada por Adam Neumann) en asociación con Merrimac Ventures. Ninguna fuente oficial
//   consultada nombra arquitecto — se omite. Interiorismo/mobiliario SÍ está en la propia
//   descripción real de 2Clics ("Diseñadas, creadas y amuebladas para la vida por Cola Blanca y
//   Flow Furnishings") — dato de primera mano, se usa.
// - PROHIBICIÓN EXPLÍCITA DE LA TAREA: el título real de 2Clics de este registro contiene "Renta
//   6 % Anual" y la descripción completa el reclamo de "renta garantizada" — no aparece en
//   ninguna capa pública (nombre público, texto curado, imágenes elegidas, alt, metadata).
//
// One Hollywood (187682) — SIN curaduría editorial hasta esta pasada. Auditoría completa de 13
// imágenes: todas utilizables, sin texto de marketing incrustado (dos tienen el propio logo/
// nombre del edificio en la fachada o en una pantalla — señalética real del edificio, no un
// eslogan comercial, mismo criterio ya aplicado a la marquesina de Faena). índice 11 es una foto
// aérea real (no render) de Downtown Hollywood/ArtsPark at Young Circle — confirma visualmente la
// ubicación real ("centro de Hollywood" en la descripción de 2Clics). índice 12 es un
// casi-duplicado del índice 2 (misma torre, con un marco de color superpuesto) — se usa el 2.
// Developer verificado independientemente en onehollywoodresidences.us, onehollywoodresidences.com
// y una nota de South Florida Business & Wealth: Star Developers Group. Arquitectura (BC
// Architects) corroborada por dos fuentes, con confianza media (ambas asociadas al propio
// desarrollo, no prensa independiente) — se incluye con esa salvedad documentada en el reporte.
// Interiorismo NO se publica: dos fuentes dan nombres distintos y contradictorios ("Domus Aurea
// Interiors" vs. "Adriana Hoyos Design Studio") sin una fuente oficial que dirima — se omite en
// vez de elegir una al azar. Dirección exacta también en conflicto entre fuentes (1817 Taylor St.
// vs. 1939 Hollywood Blvd.) — se omite cualquier número de calle, igual que se resolvió para Icon
// Beach en la pasada anterior.
// ── Vigésima pasada — Developer fuera de la presentación pública + rango de precio + "Interiores"
// ────────────────────────────────────────────────────────────────────────────────────────────────
// - "Developer" se retiró del snapshot de los 4 desarrollos (seguía siendo un dato correcto y
//   verificado, pero dejó de presentarse públicamente por decisión editorial explícita de esta
//   pasada — no por un problema de fuente). Arquitectura/interiorismo/paisajismo se mantienen: son
//   créditos de diseño con valor editorial propio, no datos institucionales sobre quién financia
//   el proyecto.
// - "Rango de precio" se agregó al snapshot de los 4 — ver `formatDevelopmentPriceRange()` más
//   abajo para la fuente exacta y por qué se representa como "Desde X" y no como un rango con
//   mínimo y máximo.
// - "Interiores"/"Interiores y residencias" se agregó como bloque opt-in nuevo (`interiors`,
//   mismo patrón que `amenities`, SIEMPRE el último antes del CTA) — ver el comentario de cada
//   desarrollo, arriba de su curaduría, para el detalle de qué imagen se eligió y por qué.
const EDITORIAL_CURATIONS: Record<string, DevelopmentEditorialCuration> = {
  faena: {
    heroImageIndex: 0, // exterior nocturno con marquesina FAENA — portada
    introSegment: { type: 'firstParagraphLead' },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Miami River, Brickell' },
          { label: 'Arquitectura', value: 'Rafael Viñoly Architects' },
          { label: 'Interiorismo', value: "Bryan O'Sullivan Studio" },
          { label: 'Tipologías', value: '1 a 4 dormitorios · River Lofts · Sky Lofts' },
        ],
      },
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
        imageAspect: '5/3', // ratio real ya aprobado — no se toca el crop existente
      },
      {
        key: 'residencias',
        title: 'Residencias',
        sourceTextSegment: { type: 'markerBlockItems', blockMarker: 'Residencias', endMarker: null },
        imageIndexes: [2], // living interior real de una residencia
        layout: 'image-right',
        imageAspect: '3/4', // ratio real ya aprobado — no se toca el crop existente
      },
    ],
    // idx4: baño real de una residencia (protagonista, 800×600) — idx3: terraza/comedor exterior
    // real de una residencia (600×800). Ninguna de las dos se usa en el resto de la ficha — la
    // otra interior real del set (idx2) queda disponible para una curaduría futura si hiciera
    // falta variar, no se usa acá para no competir con idx4/idx3 recién auditadas.
    interiors: { title: 'Interiores y residencias', imageIndexes: [4, 3] },
  },
  'icon-beach': {
    heroImageIndex: 5, // torre + pileta + océano en un mismo plano — la toma de mayor resolución (1520px)
    introSegment: {
      type: 'curatedText',
      text: 'Una torre residencial frente al mar en Hollywood Beach, entre Miami y Fort Lauderdale, con vistas al Océano Atlántico y al Intracoastal Waterway.',
    },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Hollywood Beach, Florida' },
          { label: 'Unidades', value: '350' },
          { label: 'Pisos', value: '38' },
          { label: 'Tipologías', value: '1 a 3 dormitorios' },
          { label: 'Arquitectura', value: 'CFE Architects' },
        ],
      },
      {
        key: 'momento-visual',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [0], // porte-cochère de acceso
        layout: 'image-large',
      },
      {
        key: 'proyecto',
        title: 'El proyecto',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Icon Beach ocupa un terreno frente al mar en Hollywood Beach, con vistas al Atlántico y al Intracoastal Waterway. El interiorismo está a cargo de Meyer Davis y el paisajismo de Witkin Hults + Partners.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'ubicacion',
        title: 'Hollywood Beach y la ubicación',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Hollywood Beach está ubicada entre Miami y Fort Lauderdale, sobre una franja costera conocida por su boardwalk de casi cuatro kilómetros junto al Atlántico. La zona combina playa, marinas y clubes náuticos con acceso a campos de golf, restaurantes y comercios en las cercanías de Aventura y Bal Harbour.',
        },
        imageIndexes: [13], // plano aéreo real del proyecto — muestra el frente de agua directo
        layout: 'image-right',
      },
      {
        key: 'edificio',
        title: 'El edificio',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Porte-cochère de acceso y lobby con recepción',
            'Marina propia',
            'Beach club de uso exclusivo para residentes',
            'Frente directo al Intracoastal Waterway',
            'Estacionamiento asignado por unidad, con servicio de valet',
          ],
        },
        imageIndexes: [2], // exterior real — torre vista desde la galería/pérgola ajardinada de acceso
        layout: 'image-left',
      },
      {
        key: 'residencias',
        title: 'Residencias',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Residencias de 1 a 3 dormitorios',
            'Ventanales de piso a techo',
            'Balcones privados',
            'Cocinas totalmente equipadas',
            'Interiorismo a cargo de Meyer Davis',
          ],
        },
        imageIndexes: [7], // living interior real, con vista
        layout: 'image-right',
      },
    ],
    amenities: {
      imageIndex: 11, // pileta a nivel de suelo, toma distinta a la de apertura
      layout: 'image-left',
    },
    // idx6 ("GATHERING LOUNGE" según su propio pie de imagen) se descartó para este bloque — es un
    // espacio común, no una residencia, y el título del bloque exige poder afirmar que lo es.
    // idx8 (baño real, con vista a un dormitorio a través de la puerta — pie de imagen "BATHROOM")
    // es la única interior de unidad SIN USAR en el resto de la ficha (idx7 ya está en
    // "Residencias") — un solo image, sin rellenar con espacios comunes.
    interiors: { title: 'Interiores', imageIndexes: [8] },
  },
  'flow-house-miami-worldcenter': {
    heroImageIndex: 0, // pileta y patio con pabellón — única toma de exterior limpia del set
    introSegment: {
      type: 'curatedText',
      text: 'Una torre residencial en Miami Worldcenter pensada en torno al bienestar, el trabajo y la vida en comunidad.',
    },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Miami Worldcenter, Downtown Miami' },
          { label: 'Unidades', value: '466' },
          { label: 'Pisos', value: '41' },
          { label: 'Tipologías', value: 'Estudio a 2 dormitorios' },
          { label: 'Interiorismo', value: 'Cola Blanca · Flow Furnishings' },
        ],
      },
      {
        key: 'proyecto',
        title: 'El proyecto',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Flow House ocupa una manzana de Miami Worldcenter, el distrito de uso mixto en desarrollo en el centro de Miami. El edificio organiza más de 4.280 metros cuadrados de amenidades en tres ejes — bienestar, espacios de trabajo y vida social — pensados como una extensión de cada residencia.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'residencias',
        title: 'Residencias',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Residencias completamente amuebladas',
            'Cocinas gourmet disponibles',
            'Balcones privados con vistas en algunas unidades',
            'Lavadora y secadora en la unidad',
            'Edificio que admite mascotas',
          ],
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'bienestar',
        title: 'Vida en Flow House',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Spa, sauna y baño de vapor',
            'Piscina lap de 126 pies',
            'Estudio de Pilates y sala de meditación',
            'Gimnasio Premier Fitness y CrossFit',
            'Espacios de coworking y salas de reunión',
            'Club social, cafetería y zona de picnic',
          ],
        },
        imageIndexes: [4], // estudio de pilates/reformer, ambiente real sin texto de marca
        layout: 'image-left',
      },
      {
        key: 'momento-visual',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [10], // lounge social con bar, ambiente real
        layout: 'image-large',
      },
    ],
    // Sin ninguna fotografía de una residencia individual en las 21 imágenes reales del set (ver
    // auditoría completa más arriba) — "Interiores" acá son espacios compartidos reales del
    // edificio, nunca residencias, por eso el título es "Interiores" (nunca "...y residencias").
    // idx2: estudio de pilates/reformer (distinto del idx4 ya usado en "Vida en Flow House").
    // idx13: barra social. idx8: nicho de café bajo arco. Ninguna se usa en otro bloque de la
    // ficha; todas sin eslogan ni texto de marca visible.
    interiors: { title: 'Interiores', imageIndexes: [2, 13, 8] },
  },
  'one-hollywood': {
    heroImageIndex: 2, // exterior completo de la torre — mayor resolución y composición más limpia
    introSegment: {
      type: 'curatedText',
      text: 'Una torre residencial en el centro de Hollywood, Florida, a pasos de ArtsPark at Young Circle.',
    },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Downtown Hollywood, Florida' },
          { label: 'Unidades', value: '248' },
          { label: 'Pisos', value: '23' },
          { label: 'Tipologías', value: 'Estudio a 3 dormitorios' },
          { label: 'Arquitectura', value: 'BC Architects' },
        ],
      },
      {
        key: 'momento-visual',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [1], // balcón con vista al golf course y al agua
        layout: 'image-large',
      },
      {
        key: 'proyecto',
        title: 'El proyecto',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'One Hollywood se ubica en el centro de Hollywood, junto a ArtsPark at Young Circle, con acceso directo a los comercios y restaurantes del downtown. El edificio combina 2 espacios comerciales en planta baja con residencias desde estudios hasta 3 dormitorios.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'ubicacion',
        title: 'Downtown Hollywood y la ubicación',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'El centro de Hollywood se organiza alrededor de Young Circle, con su parque y anfiteatro al aire libre, rodeado de comercios, restaurantes y galerías. La zona está a pocos minutos de Hollywood Beach y con buena conexión hacia Aventura y Fort Lauderdale.',
        },
        imageIndexes: [11], // foto aérea real de Downtown Hollywood / Young Circle
        layout: 'image-right',
      },
      {
        key: 'edificio',
        title: 'El edificio',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Porte-cochère de acceso con servicio de valet',
            'Lobby de doble altura con recepción y conserjería',
            'Vestuario de paquetes inteligente',
            'Espacios de coworking y centro de negocios',
            'Almacenamiento de bicicletas',
            'Cargadores para vehículos eléctricos',
          ],
        },
        imageIndexes: [0], // porte-cochère de acceso, fachada con nombre del edificio
        layout: 'image-left',
      },
      {
        key: 'residencias',
        title: 'Residencias',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Tecnología de gestión del hogar inteligente',
            'Ventanales de piso a techo',
            'Balcones con barandillas de cristal',
            'Cocinas de estilo europeo con encimeras de cuarzo',
            'Baños con pisos de porcelanato importado',
          ],
        },
        imageIndexes: [3], // cocina real, sin texto de marca
        layout: 'image-right',
      },
    ],
    // idx6: baño real de una residencia, sin captions/marca, la única interior de unidad SIN usar
    // en el resto de la ficha (idx3, cocina, ya está en "Residencias"). No hay dormitorio/living
    // fotografiado en el set de 13 imágenes — un solo image, sin rellenar con vistas de amenities
    // comunes (rooftop lounge) para no diluir "Interiores" con espacios que no son residencias.
    interiors: { title: 'Interiores', imageIndexes: [6] },
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

// Resuelve un `SourceTextSegment` en runtime — nunca contra una copia de la descripción guardada
// acá. `curatedText`/`curatedList` no dependen de `description` en absoluto (su contenido vive en
// la propia curaduría, ver comentario del tipo) — se resuelven primero, antes de cualquier chequeo
// de `description`, para que funcionen aunque la página haya reducido `description` a `''` (ver
// `resolveSafeDescription` más abajo).
export function resolveSourceTextSegment(description: string, segment: SourceTextSegment): string | string[] {
  switch (segment.type) {
    case 'curatedText':
      return segment.text;
    case 'curatedList':
      return segment.items;
    case 'firstParagraphLead':
      return description ? splitFirstSentence(realParagraphs(description)[0] || '').lead : '';
    case 'firstParagraphRest':
      return description ? splitFirstSentence(realParagraphs(description)[0] || '').rest : '';
    case 'markerBlockItems':
      return description ? resolveMarkerBlockItems(description, segment.blockMarker, segment.endMarker) : [];
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

function segmentNeedsRawDescription(segment: SourceTextSegment): boolean {
  return segment.type === 'firstParagraphLead' || segment.type === 'firstParagraphRest' || segment.type === 'markerBlockItems';
}

// Índices de párrafo REALMENTE necesarios para resolver los segmentos de una curaduría —
// `firstParagraphLead`/`firstParagraphRest` siempre necesitan el párrafo 0; `markerBlockItems`
// necesita el párrafo que contiene su `blockMarker` literal (nunca el resto de la descripción).
function paragraphIndexesNeededByEditorial(description: string, editorial: DevelopmentEditorialCuration): number[] {
  const paragraphs = realParagraphs(description);
  const needed = new Set<number>();
  const segments = [editorial.introSegment, ...editorial.sections.map((section) => section.sourceTextSegment)];
  for (const segment of segments) {
    if (segment.type === 'firstParagraphLead' || segment.type === 'firstParagraphRest') {
      needed.add(0);
    } else if (segment.type === 'markerBlockItems') {
      const index = paragraphs.findIndex((paragraph) =>
        paragraph
          .split('\n')
          .map((line) => line.trim())
          .includes(segment.blockMarker),
      );
      if (index !== -1) needed.add(index);
    }
  }
  return Array.from(needed).sort((a, b) => a - b);
}

// Reduce la descripción real al fragmento seguro de mostrar ANTES de que se convierta en prop de
// ningún componente (decimosexta pasada, refinado en la decimoséptima y decimoctava) — mismo
// motivo que `toDevelopmentCardSource`: aunque el componente nunca renderiza más que el fragmento
// curado, pasarle la descripción comercial cruda completa (precios, cronograma de señas, datos de
// agente, o — en desarrollos auditados — promesas de rentabilidad) la deja viajando en el payload
// RSC y en la metadata SEO/OpenGraph, visible aunque el JSX nunca la pinte.
//
// - Con curaduría editorial que SÍ extrae de la descripción real (Faena: `firstParagraphLead`/
//   `firstParagraphRest`/`markerBlockItems`): CORREGIDO en la decimoctava pasada — antes se
//   devolvía la descripción cruda COMPLETA con el argumento de que "ya se usa el texto íntegro,
//   aprobado". Eso era incorrecto: la extracción real de Faena solo usa el párrafo 0 (intro) y el
//   párrafo con el marker "El edificio"/"Residencias" — el resto de la descripción real de Faena
//   trae una tabla completa de precios por tipología y el cronograma de depósitos ("DEPOSITOS Y
//   FECHAS: 20% firma... 20% at groundbreaking..."), que NUNCA se renderiza pero SÍ viajaba
//   igual en el payload RSC servido al navegador. Ahora se devuelven únicamente los párrafos
//   realmente necesarios para resolver los segmentos declarados — nunca los demás.
// - Con curaduría editorial 100% propia (Icon Beach, Flow House, One Hollywood: solo
//   `curatedText`/`curatedList`/`none`, sin ningún segmento que lea la descripción cruda): la
//   descripción cruda NUNCA se pasa como prop — se usa en cambio el propio intro curado como
//   resumen seguro.
// - Sin curaduría editorial (desarrollos todavía sin auditar): se reduce a la primera oración real.
export function resolveSafeDescription(description: string, editorial: DevelopmentEditorialCuration | null): string {
  if (!editorial) {
    const lead = resolveSourceTextSegment(description, { type: 'firstParagraphLead' });
    return typeof lead === 'string' ? lead : '';
  }
  const needsRaw =
    segmentNeedsRawDescription(editorial.introSegment) ||
    editorial.sections.some((section) => segmentNeedsRawDescription(section.sourceTextSegment));
  if (needsRaw) {
    const paragraphs = realParagraphs(description);
    const neededIndexes = paragraphIndexesNeededByEditorial(description, editorial);
    return neededIndexes.map((index) => paragraphs[index]).join('\n\n');
  }
  const intro = resolveSourceTextSegment(description, editorial.introSegment);
  return typeof intro === 'string' ? intro : '';
}

// "Rango de precio" del snapshot (vigésima pasada, FASE 3) — SIEMPRE calculado en runtime contra
// el campo estructurado `price`/`currency`/`hidePrice` real de 2Clics, NUNCA hardcodeado acá.
//
// AUDITORÍA (vigésima pasada): 2Clics no expone ningún campo de rango (min/max) para un
// property_app_id — el schema real de `/api/property/{id}` solo trae un único `price` numérico +
// `currency` + `hidePrice`. En los 4 desarrollos curados, ese único `price` coincide con la cifra
// "desde"/"from" más baja mencionada en la propia descripción real de cada uno (verificado
// desarrollo por desarrollo — Icon Beach, Flow House y One Hollywood con match exacto; Faena con
// el mínimo real de su tabla de tipologías) — por eso se representa como "Desde {currency} {price}"
// y nunca como un rango con un máximo que 2Clics no entrega. Un mismo precio "desde" que además
// aparece suelto en un fragmento de brochure incrustado en el texto libre (ej. Icon Beach, un
// "$850,000" dentro de una página de plantas en inglés) NO se usa para nada — no se arma un parser
// sobre ese texto, se ignora esa mención y se confía únicamente en el campo estructurado.
//
// Si `hidePrice` es true o no hay un precio numérico válido, se omite el campo por completo —
// nunca "Consultar precio" acá (eso es un patrón de PropertyDetailView, no de esta landing).
export function formatDevelopmentPriceRange(
  price: number | null | undefined,
  currency: string | null | undefined,
  hidePrice: boolean | null | undefined,
): string | null {
  if (hidePrice) return null;
  if (price === null || price === undefined || !Number.isFinite(price) || price <= 0) return null;
  if (!currency) return null;
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(price);
  return `Desde ${currency} ${formatted}`;
}
