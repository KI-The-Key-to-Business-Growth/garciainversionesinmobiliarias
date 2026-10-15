import {
  formatArea,
  formatCount,
  formatPrice,
  formatPublicDisplayValue,
  propertyHref,
} from '@/lib/2clics/format';
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
//
// `cardImageIndex` (vigesimotercera pasada, FASE 3): la card del índice YA NO depende ciegamente
// de `images[0]` — cada desarrollo declara explícitamente, en su curaduría editorial
// (`DevelopmentEditorialCuration.cardImageIndex`), qué imagen real cumple la función de portada
// del índice. Sin curaduría editorial (desarrollo sin auditar todavía), degrada a `images[0]`
// como ya hacía antes — comportamiento sin cambios para ese caso.
export function toDevelopmentCardSource(
  property: PublicProperty,
  publicName?: string | null,
  cardImageIndex?: number,
): DevelopmentCardSource {
  const image = (cardImageIndex !== undefined ? property.images[cardImageIndex] : undefined) || property.images[0] || null;
  return {
    title: publicName || property.title,
    location: property.location,
    region: property.region,
    image,
  };
}

// ── Capa de curaduría editorial (WEB GARCÍA V2, decimotercera pasada; generalizada en la
// decimoséptima; consolidada en un sistema único en la decimoctava; ampliada con mapa/reasons/
// grupos/card image en la vigesimotercera) ──────────────────────────────────────────────────────
//
// PRINCIPIO: 2Clics sigue siendo la única fuente de verdad del inventario (título, ubicación,
// imágenes, descripción, amenities estructurados). Esta capa NO duplica ni reescribe ese
// contenido para lo que SÍ puede extraerse tal cual — solo declara, por desarrollo, CÓMO
// organizarlo en una narrativa de proyecto: qué imagen real corresponde a cada bloque, qué
// fragmento corresponde a cada bloque, qué bloques existen, en qué orden y con qué layout.
//
// SISTEMA EDITORIAL DEFINITIVO (decimoctava pasada, ampliado en la vigesimotercera): los cinco
// desarrollos con curaduría propia comparten la MISMA infraestructura declarativa
// (`DevelopmentSection`/`DevelopmentSectionLayout`, `CuratedDevelopmentDetailView`) y el mismo
// lenguaje visual (`.project-*` en globals.css) — pero CADA UNO tiene su propio conjunto de
// secciones, decidido únicamente por el material real disponible. Flow House, por ejemplo, no
// tiene ninguna fotografía real utilizable del edificio (las únicas tomas exteriores vienen
// incrustadas en una pieza de brochure con logo y eslogan — ver auditoría más abajo) y por eso NO
// tiene sección "El edificio": no se fuerza una sección sin material real que la sostenga (regla
// C/D del sistema, ver docs/ai/PROPERTY_UX_DECISIONS.md).
//
// DOS ESTRATEGIAS DE TEXTO CONVIVEN A PROPÓSITO (desde la decimoséptima pasada):
// - `firstParagraphLead`/`firstParagraphRest`/`markerBlockItems`: EXTRACCIÓN en runtime contra
//   `sourceProperty.description` real — nunca se guarda una copia acá. Válida cuando la
//   descripción real de 2Clics ya es, tal cual, copy público utilizable (Faena).
// - `curatedText`/`curatedList`: copy editorial ORIGINAL, escrito por curaduría a partir de
//   hechos verificados (2Clics + fuentes oficiales/prensa especializada cuando se auditaron) —
//   nunca una copia textual de la descripción cruda de 2Clics. Necesaria cuando esa descripción
//   es demasiado comercial/desactualizada para extraerse tal cual.
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

export type DevelopmentSectionLayout =
  | 'image-large'
  | 'image-left'
  | 'image-right'
  | 'text-only'
  | 'snapshot'
  // "Por qué considerar" (vigesimotercera pasada, FASE 6) — grilla editorial de 3-4 razones
  // reales y concretas, cada una una oración completa (no fragmentos tipo feature-list). Usa
  // `sourceTextSegment: { type: 'curatedList' }` para el contenido — layout propio solo por el
  // tratamiento visual (grilla de 2 columnas con separador fino, sin viñetas).
  | 'reasons'
  // Estructura de ingreso comercial (vigesimosexta pasada) — ver `DevelopmentDepositStep` y los
  // campos `commercial*` de `DevelopmentSection`. El monto titular SIEMPRE se resuelve en runtime
  // contra `source.price`/`hidePrice` reales (nunca un número guardado en la curaduría) — si
  // 2Clics vuelve a ocultar el precio, el bloque entero desaparece solo, sin mostrar un monto
  // stale. El resto (unidad de referencia, calendario de depósitos) son hechos comerciales
  // aprobados, verificados contra la descripción vigente de 2Clics — nunca inferidos por cálculo.
  | 'commercial-entry';

// Par label/value editorial para el bloque "Project Snapshot" (decimoctava pasada, FASE 3) — NUNCA
// un dato dinámico/comercial (precio, disponibilidad, entrega, expensas). Solo P/S verificados.
export type DevelopmentSnapshotField = { label: string; value: string };

// Paso del calendario de depósitos (vigesimosexta pasada, "Estructura de ingreso" de Domus
// Brickell Center) — porcentaje + hito, verificados textualmente contra la descripción vigente
// de 2Clics (no una interpretación propia). `sum(depositSchedule.map(s => s.percent))` es el
// único lugar donde se calcula el total de la etapa — nunca un número separado que pueda
// desincronizarse del calendario real.
export type DevelopmentDepositStep = { label: string; percent: number };

// Grupo editorial con subtítulo — SOLO para listas donde el material real YA trae esa estructura
// (ej. Flow House: la descripción real organiza sus amenidades en "BIENESTAR"/"FLUJO DE TRABAJO"/
// "EXPERIENCIA"). Nunca se inventan categorías para ordenar una lista plana que no las tenía.
export type DevelopmentSectionGroup = { title: string; items: string[] };

// Mapa de ubicación (vigesimotercera pasada, FASE 8) — reutiliza el mismo patrón ya aprobado y en
// producción de `PropertyMap.tsx` (embed público de Google Maps sin API key, mismo host ya
// habilitado en el CSP del sitio) a través de sus helpers exportados
// (`googleMapsEmbedUrl`/`googleMapsSearchUrl`), sin duplicar esa lógica ni tocar
// `PropertyMap.tsx`/`PropertyDetailView.tsx`. `queryLabel` es el texto de ubicación YA verificado
// por curaduría (el mismo que el snapshot "Ubicación") — se usa como texto visible siempre, y
// como query de búsqueda cuando no hay coordenadas confiables. `lat`/`long` son opcionales: se
// completan por desarrollo SOLO cuando se verificaron como reales (ver auditoría de cada
// desarrollo) — nunca se confía ciegamente en el lat/long crudo de 2Clics (ver
// `hasSaneCoordinates()` en CuratedDevelopmentDetailView.tsx: los 4 desarrollos de Miami traen
// lat:0/long:0 — "Null Island", un placeholder, no una coordenada real — se descarta y se usa el
// texto de ubicación en su lugar).
export type DevelopmentLocationMap = {
  queryLabel: string;
  lat?: number;
  long?: number;
  // Cuando `queryLabel` ya es una dirección exacta confirmada (calle y número, no solo barrio/
  // ciudad) pero no hay lat/long real utilizable — caso de Domus Brickell Center (vigesimocuarta
  // pasada): la nota del mapa pasa de "Ubicación aproximada" (ya usada para los 4 de Miami, que
  // solo tienen texto de barrio) a "Dirección confirmada", porque decir "aproximada" de una
  // dirección exacta sería incorrecto. Default `false`/`undefined` preserva el comportamiento
  // exacto de las 5 fichas anteriores.
  addressIsExact?: boolean;
};

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
  // `aspect-ratio`, ej. '5/3', '3/4') — sin esto se usa el default sistémico del layout (3/2
  // para image-left e image-right por igual, ver globals.css). Usado para preservar la
  // orientación real de una foto ya curada y aprobada (ej. Faena) en vez de forzarla al default.
  imageAspect?: string;
  // Recorte angosto opt-in (vigesimoquinta pasada, fix del bug real de `image-right` — ver
  // globals.css, `.project-block-media--narrow`, 420px fijo) — SOLO cuando una foto específica
  // ya está aprobada con un ancho más angosto que su columna, pegada al lado del contenido (hoy:
  // Faena "Residencias", retrato). Nunca el comportamiento por defecto de un desarrollo nuevo.
  imageNarrow?: boolean;
  // Grupos editoriales opcionales (FASE 10, vigesimotercera pasada) — cuando están presentes,
  // reemplazan la lista plana de `sourceTextSegment` por sub-listas con subtítulo. Ver
  // `DevelopmentSectionGroup`.
  groups?: DevelopmentSectionGroup[];
  // Mapa de ubicación opcional (FASE 8, vigesimotercera pasada) — se agrega dentro de la MISMA
  // sección de ubicación en vez de como bloque separado, para que texto contextual + mapa se
  // perciban como una unidad. Ver `DevelopmentLocationMap`.
  map?: DevelopmentLocationMap;
  // Solo layout 'commercial-entry' (vigesimosexta pasada) — ver `DevelopmentDepositStep`.
  // `commercialHeadlineLead` es el texto ANTES del monto dinámico (ej. "Ingresá a Brickell Center
  // con"); el monto en sí nunca vive acá, se resuelve en runtime (ver arriba). El resto son
  // hechos comerciales aprobados y verificados contra la descripción vigente de 2Clics.
  commercialHeadlineLead?: string;
  commercialReferenceAmount?: number;
  commercialReferenceCurrency?: string;
  commercialSchedule?: DevelopmentDepositStep[];
  commercialBalanceNote?: string;
  // La lista del bloque se arma EN VIVO con los datos de la unidad fuente (ambientes, superficies,
  // precio sin "Desde") — para desarrollos cuyo registro de 2Clics es una unidad de referencia
  // (Pacheco Central). Nunca se guardan esas medidas en la curaduría. `uncoveredLabel` nombra la
  // superficie descubierta de esa unidad (ej. "balcón").
  referenceUnit?: { uncoveredLabel: string };
};

export type DevelopmentEditorialCuration = {
  heroImageIndex: number;
  // Ubicación pública editorial de la apertura — reemplaza la que se arma desde la ubicación de
  // 2Clics cuando esa no alcanza para describir el desarrollo (ej. Faena: "Miami River").
  publicLocation?: string;
  // Imagen de portada del índice /desarrollos (vigesimotercera pasada, FASE 3) — override
  // editorial explícito, independiente de `heroImageIndex` cuando conviene una imagen distinta
  // (ej. Icon Beach/One Hollywood: el hero es el exterior completo de mayor resolución, pero
  // también funciona bien como card; Pacheco Central: `images[0]` es un interior retrato que no
  // recorta bien en el crop 16:9 de la card compacta — se usa la misma imagen horizontal del hero
  // en su lugar). Ver `toDevelopmentCardSource()`.
  cardImageIndex: number;
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
  // Si el precio estructurado real de 2Clics (`source.price`) representa de forma confiable el
  // "desde" del PROYECTO completo — nunca el precio de una unidad puntual (vigesimosegunda
  // pasada, FASE 6). Obligatorio y auditado por desarrollo, igual que `market`: en Faena/Icon
  // Beach/Flow House/One Hollywood el precio estructurado coincide con la cifra "desde" que la
  // propia descripción menciona para el desarrollo entero — `true`. En Pacheco Central el precio
  // estructurado (112.000 U$D) es el de UNA unidad de 2 ambientes puntual dentro de un desarrollo
  // de 260 unidades — mostrarlo como "Desde U$D 112.000" implicaría un piso de precio del
  // proyecto que no está confirmado — `false`, el snapshot omite el campo por completo.
  priceRepresentsProjectRange: boolean;
  // Copy contextual opcional del CTA final (vigesimocuarta pasada, Domus Brickell Center) — cuando
  // no se declara, `CuratedDevelopmentDetailView` usa exactamente la copy genérica ya aprobada
  // ("¿Querés conocer más sobre {nombre}?" / "...condiciones vigentes de {nombre}." /
  // "Consultar disponibilidad") sin cambio de comportamiento para los 5 desarrollos anteriores.
  // Existe para que un desarrollo cuyo producto necesita un encuadre distinto (evaluar un
  // proyecto, no solo "consultar disponibilidad") pueda declararlo sin tocar el componente
  // compartido ni el CTA de los demás.
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaLabel?: string;
  // Copy contextual opcional del modal de consulta (`PropertyInquiryPanel`) — mismo criterio: sin
  // declarar, el modal conserva exactamente su título/mensaje inicial genéricos actuales.
  ctaModalTitle?: string;
  ctaInitialMessage?: string;
  // Tabla de unidades disponibles (Benavídez Village) — una fila por unidad ACTIVA de
  // `curation.propertyIds`, con precio/superficie/orientación leídos en vivo. La cantidad que se
  // muestra es la de unidades que 2Clics devuelve hoy, nunca un número fijo.
  unitsTable?: { title: string };
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

// ── Auditorías ───────────────────────────────────────────────────────────────────────────────────
//
// Faena — fuente 236986 (registro activo; el 187676 quedó fuera de mercado). Re-auditado contra la
// External API (2026-10-15): mismas 14 imágenes en el mismo orden que el registro anterior, mismos
// markers "El edificio"/"Residencias", sin el tag interno [FABIANAGA-456], building_date
// ESTRENAR, y U$D 1.300.000 coincide con "1 Habitación desde" de su tabla de tipologías — la
// curaduría aprobada se mantiene sin cambios. Snapshot verificado contra faena.com/residences/
// miami-river (Rafael Viñoly Architects; Bryan O'Sullivan Studio). El mapa usa el texto de
// ubicación curado como query.
//
// Benavídez Village — 5 unidades activas (UF 11, 12, 15, 16, 20) agrupadas en un solo desarrollo.
// Todo el copy sale de la descripción vigente de 2Clics (idéntica en las 5 unidades): 25 viviendas
// de dos plantas con jardín privado, piscina/SUM/parrillas/seguridad 24 hs, ~5 min de Panamericana,
// entrega estimada primer trimestre de 2027. Precio/superficie/orientación de cada unidad se leen
// en vivo (tabla de unidades). Imágenes: las 20 fotos reales de la unidad de referencia (233702),
// tomadas con el proyecto en obra — todavía no hay material editorial oficial en el repo.
//
// Pacheco Central — 233719 es la unidad de referencia (2 ambientes): sus datos se muestran como
// tales, en vivo, nunca como características del desarrollo. Copy del proyecto sincronizado con la
// descripción vigente de 2Clics (tipologías de 1 a 4 ambientes, coworking/laundry, etapas de
// entrega dic. 2026 / dic. 2029). Coordenadas reales de 2Clics (General Pacheco) usadas en el mapa.
//
// Domus Brickell Center — ver bloque propio más abajo (sin cambios en esta sincronización).
const EDITORIAL_CURATIONS: Record<string, DevelopmentEditorialCuration> = {
  faena: {
    heroImageIndex: 0, // exterior nocturno con marquesina FAENA — portada
    cardImageIndex: 0,
    priceRepresentsProjectRange: true, // 1.300.000 U$D coincide con el mínimo real de la tabla de tipologías
    publicLocation: 'Miami River · Miami · Florida · Estados Unidos',
    introSegment: { type: 'firstParagraphLead' },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Miami River, Brickell' },
          { label: 'Tipologías', value: '1 a 4 dormitorios · River Lofts · Sky Lofts' },
          // `building_date: "ESTRENAR"` en 236986 (re-auditado 2026-10-15).
          { label: 'Estado', value: 'A estrenar' },
          { label: 'Arquitectura', value: 'Rafael Viñoly Architects' },
          { label: 'Interiorismo', value: "Bryan O'Sullivan Studio" },
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
        key: 'ubicacion',
        title: 'Miami River y Brickell',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Faena se ubica sobre el Río Miami, en Brickell, con proximidad a restaurantes, galerías de arte y entretenimiento cerca de Brickell City Centre.',
        },
        imageIndexes: [],
        layout: 'text-only',
        // Sin mapa: no hay todavía una ubicación del desarrollo verificada para publicar como pin
        // (la dirección/coordenadas de 236986 en el CRM no se usan para esto).
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
        imageNarrow: true, // retrato angosto (420px) ya aprobado — mismo tratamiento visual de siempre
      },
      {
        key: 'reasons',
        title: 'Por qué considerar Faena',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Arquitectura de Rafael Viñoly, una de sus últimas obras, con interiorismo de Bryan O’Sullivan Studio.',
            'Ubicación sobre el Río Miami, en Brickell, con marina propia y arte público integrado al proyecto.',
            'Dos torres unidas por un puente elevado con instalaciones de bienestar y espacio de servicios.',
            'Tipologías amplias, de 1 a 4 dormitorios, con River Lofts y Sky Lofts de doble altura.',
          ],
        },
        imageIndexes: [],
        layout: 'reasons',
      },
      {
        key: 'para-quien',
        title: 'Puede ser una alternativa para',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Por su escala y su propuesta artística, Faena puede tener sentido para quienes buscan una residencia de uso propio o segunda vivienda en Miami, con un fuerte componente cultural y arquitectónico.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        // (vigesimoséptima pasada, corregido en la vigesimoctava) — límites reales, sin montos
        // hardcodeados en copy: el precio es dato D (dinámico), ya resuelto en runtime como
        // primer campo del snapshot de arriba (`priceRangeField`, vía `formatDevelopmentPriceRange`
        // contra `source.price` real — `priceRepresentsProjectRange: true` para Faena, auditado en
        // la vigésima pasada: 1.300.000 U$D coincide con el mínimo real de la tabla de
        // tipologías). Este bloque REFERENCIA ese dato ya mostrado, nunca repite el número.
        key: 'puede-no-tener-sentido',
        title: 'Puede no tener sentido si',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Buscás una unidad de entrada más accesible que el precio desde ya indicado arriba, o preferís un perfil residencial más tradicional, sin el componente artístico y cultural que define a Faena.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'garcia-acompanamiento',
        title: 'El rol de García Inversiones',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'En Faena, el trabajo de García Inversiones es entender tu objetivo, explicar el proyecto, ayudarte a evaluar si tiene sentido para lo que buscás, y solicitar y contrastar la información vigente antes de avanzar. García Inversiones no administra el desarrollo ni es parte de él, y no reemplaza el asesoramiento legal o fiscal que un proceso de este tipo requiere.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
    ],
    // idx4: baño real de una residencia (protagonista, 800×600) — idx3: terraza/comedor exterior
    // real de una residencia (600×800). Ninguna de las dos se usa en el resto de la ficha — la
    // otra interior real del set (idx2) queda disponible para una curaduría futura si hiciera
    // falta variar, no se usa acá para no competir con idx4/idx3 recién auditadas.
    interiors: { title: 'Interiores y residencias', imageIndexes: [4, 3] },
  },
  'benavidez-village': {
    // Imágenes de 233702 (fotos reales de obra, máx. 1024px): idx7 exterior de las viviendas con
    // jardín — única toma de fachada horizontal utilizable; idx12 living con ventanal al jardín;
    // idx2 planta baja completa; idx0 cocina; idx10 dormitorio. Excluidas: movimiento de suelo
    // (idx5, idx13), pasillo de obra (idx3), primeros planos de anafe/cajón (idx9, idx15).
    heroImageIndex: 7,
    cardImageIndex: 7,
    priceRepresentsProjectRange: false, // cada unidad tiene su precio — se muestran en la tabla
    introSegment: {
      type: 'curatedText',
      text: 'Un conjunto residencial de 25 viviendas de dos plantas con jardín privado, en Benavídez, Tigre.',
    },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Benavídez, Tigre' },
          { label: 'Viviendas', value: '25' },
          { label: 'Tipología', value: 'Dúplex de 3 ambientes con jardín' },
          // `building_date: "UNDER_CONSTRUCTION"` en las 5 unidades.
          { label: 'Estado', value: 'En construcción' },
          { label: 'Entrega estimada', value: 'Primer trimestre de 2027' },
        ],
      },
      {
        key: 'proyecto',
        title: 'El proyecto',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Benavídez Village reúne 25 viviendas de dos plantas, cada una con jardín privado y cochera. El conjunto suma áreas parquizadas y espacios de uso común con piscina, SUM, parrillas y seguridad 24 hs.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'residencias',
        title: 'Las viviendas',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            '3 ambientes y 2 dormitorios',
            'Living comedor con cocina integrada',
            '1 baño completo y toilette',
            'Jardín privado y cochera',
            'Posibilidad de incorporar pileta propia, con un diferencial sobre el valor final',
          ],
        },
        imageIndexes: [12],
        layout: 'image-right',
      },
      {
        key: 'ubicacion',
        title: 'Benavídez y la ubicación',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Benavídez Village se ubica en Benavídez, Tigre, aproximadamente a 5 minutos de la Panamericana, próximo a servicios y puntos de interés.',
        },
        imageIndexes: [],
        layout: 'text-only',
        map: { queryLabel: 'Benavídez, Tigre, Argentina', lat: -34.4171266, long: -58.6954548 },
      },
      {
        key: 'reasons',
        title: 'Por qué considerar Benavídez Village',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Viviendas de dos plantas con jardín privado y cochera, en un conjunto de escala reducida.',
            'Espacios comunes con piscina, SUM, parrillas y seguridad 24 hs.',
            'Ubicación a aproximadamente 5 minutos de la Panamericana.',
          ],
        },
        imageIndexes: [],
        layout: 'reasons',
      },
      {
        key: 'para-quien',
        title: 'Puede ser una alternativa para',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Puede ser una alternativa para quienes buscan una casa con jardín en zona norte, dentro de un conjunto pequeño con espacios comunes, y pueden esperar a la entrega del proyecto.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'puede-no-tener-sentido',
        title: 'Puede no tener sentido si',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Necesitás mudarte de inmediato —el proyecto todavía está en obra— o buscás una vivienda en una zona céntrica.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'garcia-acompanamiento',
        title: 'El rol de García Inversiones',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'En Benavídez Village, el trabajo de García Inversiones es entender tu objetivo, explicar el proyecto, ayudarte a evaluar si tiene sentido para lo que buscás, y solicitar y contrastar la información vigente antes de avanzar. García Inversiones no administra el desarrollo ni es parte de él, y no reemplaza el asesoramiento legal o fiscal que un proceso de este tipo requiere.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
    ],
    // Dos imágenes y no tres: con fotos de 1024px, la celda alta de la grilla de 3 las agranda de
    // más y se ven borrosas.
    interiors: { title: 'Interiores y residencias', imageIndexes: [0, 10] },
    unitsTable: { title: 'Unidades disponibles' },
  },
  'pacheco-central': {
    heroImageIndex: 4, // balcón/parrilla con vista al parque — única imagen horizontal, conecta con "parque central"
    cardImageIndex: 4, // antes la card usaba images[0] (living retrato, no recorta bien en 16:9) — ver auditoría arriba
    priceRepresentsProjectRange: false, // 112.000 U$D es el precio de una unidad puntual, no del desarrollo — ver auditoría arriba
    introSegment: {
      type: 'curatedText',
      text: 'Un desarrollo residencial en General Pacheco, organizado en torno a un parque central con espejo de agua.',
    },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'General Pacheco, Tigre' },
          { label: 'Unidades', value: '260' },
          { label: 'Módulos', value: '8' },
          { label: 'Tipologías', value: '1 a 4 ambientes · planta y dúplex' },
          { label: 'Entrega estimada', value: 'Etapa 1: dic. 2026 · Etapa 2: dic. 2029' },
          { label: 'Cocheras', value: '272' },
        ],
      },
      {
        key: 'momento-visual',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [0], // living + cocina integrada
        layout: 'image-large',
      },
      {
        key: 'proyecto',
        title: 'El proyecto',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Pacheco Central es un desarrollo residencial de 260 unidades, distribuidas en 8 módulos organizados en torno a un parque central con espejo de agua. Ofrece unidades de 1, 2, 3 y 4 ambientes, en una planta y dúplex, con expansiones propias como balcón, terraza o jardín.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'ubicacion',
        title: 'General Pacheco y la ubicación',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'General Pacheco se ubica a 4 km de la Panamericana (Ruta 9) y a 100 metros de la Ruta 197, la vía principal del casco urbano. El entorno combina barrios residenciales como Santa Bárbara y El Talar de Pacheco con polos cercanos como Pacheco Golf y el Shopping Euskal.',
        },
        imageIndexes: [],
        layout: 'text-only',
        map: { queryLabel: 'General Pacheco, Tigre, Argentina', lat: -34.4536035, long: -58.6276873 },
      },
      {
        key: 'amenities',
        title: 'Amenities',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Parque central con espejo de agua',
            'Pileta semiolímpica con solarium',
            'SUM con parrilla',
            'Gimnasio',
            'Coworking',
            'Laundry',
            'Espacio para bicicletas',
            'Seguridad 24 hs',
          ],
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        // Medidas y precio de la unidad publicada en 2Clics (233719), leídos en vivo — el precio
        // es de esta unidad (contado), nunca un "desde" del proyecto. La financiación se informa
        // en la fuente; acá no se resume ni se recalcula.
        key: 'unidad-referencia',
        title: 'Unidad de referencia',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Departamento de 2 ambientes con balcón. Las medidas y el precio corresponden a esta unidad, no al conjunto del desarrollo. La unidad cuenta con opciones de financiación vigentes: consultá las condiciones actualizadas.',
        },
        imageIndexes: [2], // dormitorio con ventanal a parque/césped
        layout: 'image-right',
        referenceUnit: { uncoveredLabel: 'balcón' },
      },
      {
        key: 'reasons',
        title: 'Por qué considerar Pacheco Central',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Parque central con espejo de agua como eje del desarrollo.',
            '260 unidades distribuidas en 8 módulos, con 272 cocheras.',
            'Amenities completos: pileta semiolímpica, SUM con parrilla, gimnasio y coworking.',
            'A 4 km de la Panamericana, con buena conexión hacia CABA y el corredor Bancalari.',
          ],
        },
        imageIndexes: [],
        layout: 'reasons',
      },
      {
        key: 'para-quien',
        title: 'Puede ser una alternativa para',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Puede ser una alternativa para quienes buscan una vivienda con amenities y espacios verdes en General Pacheco, con buena conectividad hacia CABA.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        // (vigesimoséptima pasada, corregido en la vigesimoctava) — se retiró la mención a
        // "tipología distinta a 2 ambientes": esa era disponibilidad/inventario de UNA unidad
        // source (233719) tratada como límite del desarrollo completo — exactamente el error que
        // ya se evita en el resto de la ficha (ver auditoría de la vigesimosegunda pasada: nunca
        // asumir que Pacheco Central entero es 2 ambientes/46m² por el único registro cargado).
        // Queda solo el criterio geográfico, un hecho estable y verificado.
        key: 'puede-no-tener-sentido',
        title: 'Puede no tener sentido si',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Buscás vivir en CABA o en una zona céntrica —General Pacheco es un entorno suburbano.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'garcia-acompanamiento',
        title: 'El rol de García Inversiones',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'En Pacheco Central, el trabajo de García Inversiones es entender tu objetivo, explicar el proyecto, ayudarte a evaluar si tiene sentido para lo que buscás, y solicitar y contrastar la información vigente antes de avanzar. García Inversiones no administra el desarrollo ni es parte de él, y no reemplaza el asesoramiento legal o fiscal que un proceso de este tipo requiere.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
    ],
    // idx1 (living, ángulo con biblioteca/escalera), idx3 (baño) e idx5 (dormitorio con 2 camas) —
    // las 3 interiores reales restantes, sin usar en el resto de la ficha. Todas son interiores de
    // residencia (nunca espacios comunes), por eso el título completo "Interiores y residencias".
    interiors: { title: 'Interiores y residencias', imageIndexes: [1, 3, 5] },
  },
  // ── Domus Brickell Center (vigesimocuarta pasada) ──────────────────────────────────────────
  // sourcePropertyId 236682 CONFIRMADO explícitamente por García (nunca 236646 — un segundo
  // registro real del mismo proyecto, cargado el mismo día, que no se usa ni se modifica). El
  // registro 236682 tiene `hidePrice: true` — respetado en toda la ficha: ningún monto estructurado
  // ni mencionado en la descripción cruda (157.500 / 160.000 / 525.000 U$D) se publica en ningún
  // lugar. "579 flats" / "35 pisos" / tipologías / características de residencias / amenities /
  // management / arquitectura / interiorismo están confirmados por documentación validada de
  // García (no por la descripción comercial cruda de 2Clics, que trae un tono de preventa/
  // financiación y datos de agente — se usa solo como fuente estructurada secundaria, nunca como
  // copy). "Developer" no se muestra (mismo criterio que las 5 fichas anteriores); Management se
  // menciona solo en copy editorial contextual ("Cómo funciona el modelo"), nunca como atributo
  // destacado de snapshot.
  //
  // AUDITORÍA DE IMÁGENES: las 17 imágenes reales de 236682 son renders conceptuales oficiales de
  // marca "domus" (marcados "ARTIST CONCEPTUAL RENDERING" — el edificio está en construcción, sin
  // fotografía real posible todavía). Ninguna es una toma exterior limpia del edificio — por eso
  // el hero/card usan la mejor imagen disponible (rooftop pool con skyline), no una fachada. Varias
  // (idx6, idx11) muestran el skyline real de Miami (torres Chase, SLS, JPMorgan) a través de la
  // ventana, confirmando que el material corresponde genuinamente a Brickell/Miami. Son renders de
  // marca "domus" en general (no hay forma de distinguir visualmente Center de Park en el material
  // recibido) — vienen asociados al registro 236682 específico, nunca al 236646 ni a ningún otro.
  // Sin imagen de ubicación/contexto urbano real disponible — la sección de ubicación no lleva
  // imagen (mismo criterio que Faena/Flow House, que tampoco la tienen).
  'domus-brickell-center': {
    heroImageIndex: 2, // rooftop pool con vista a océano/skyline — imagen más representativa disponible (sin exterior de edificio real todavía, en construcción)
    cardImageIndex: 2,
    priceRepresentsProjectRange: false, // hidePrice true en el registro fuente — el gate ya lo respeta, pero se deja explícito y conservador, mismo criterio que Pacheco Central
    introSegment: {
      type: 'curatedText',
      text: 'Un desarrollo en Brickell, Miami, que combina residencias terminadas y amobladas con una estructura profesional de hospitality.',
    },
    sections: [
      {
        key: 'snapshot',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'snapshot',
        snapshotFields: [
          { label: 'Ubicación', value: 'Brickell, Miami' },
          { label: 'Unidades', value: '579 flats' },
          { label: 'Pisos', value: '35' },
          { label: 'Tipologías', value: 'Studio · 1 y 2 dormitorios' },
          { label: 'Estado', value: 'En construcción' },
          { label: 'Arquitectura', value: 'MC+G Architecture' },
          { label: 'Interiorismo', value: 'Urban Robot Associates' },
        ],
      },
      {
        // "Estructura de ingreso" (vigesimosexta pasada) — comunicación comercial aprobada por
        // García junto con Fabiana, verificada textualmente contra la descripción VIGENTE del
        // registro 236682 (re-auditado en vivo, no snapshot viejo): "Ingresá a Brickell Center con
        // USD 157.500 / Este importe representa el 30% de una unidad de USD 525.000, distribuido
        // según el calendario de depósitos del proyecto... / 10% al firmar el contrato / 5% a los
        // 90 días / 5% a los 120 días / 10% al año / Total durante esta etapa: 30%". El monto
        // titular (157.500) NUNCA se guarda acá — se resuelve en runtime contra `source.price`/
        // `hidePrice` reales (hoy: hidePrice=false, price=157500 U$D) para que el bloque
        // desaparezca solo si 2Clics vuelve a ocultar el precio, sin mostrar un número stale. La
        // unidad de referencia (525.000) y el calendario SÍ son curados: no existe un campo
        // estructurado separado en 2Clics para ellos, solo aparecen en la descripción — pero están
        // confirmados ahí, textuales, no inferidos por cálculo.
        key: 'commercial-entry',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [],
        layout: 'commercial-entry',
        commercialHeadlineLead: 'Ingresá a Brickell Center con',
        commercialReferenceAmount: 525000,
        commercialReferenceCurrency: 'U$D',
        commercialSchedule: [
          { label: 'Al firmar el contrato', percent: 10 },
          { label: 'A los 90 días', percent: 5 },
          { label: 'A los 120 días', percent: 5 },
          { label: 'Al año', percent: 10 },
        ],
        commercialBalanceNote: 'Consultanos por condiciones vigentes y saldo restante.',
      },
      {
        key: 'momento-visual',
        sourceTextSegment: { type: 'none' },
        imageIndexes: [14], // rooftop bar al atardecer — render de marca, ambiente real sin texto comercial
        layout: 'image-large',
      },
      {
        key: 'ubicacion',
        title: 'En el corazón de Brickell',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Domus Brickell Center se ubica en 1034 SW 2nd Avenue, en Brickell, el distrito financiero y residencial de Miami. El entorno combina oficinas corporativas, restaurantes y vida urbana, con buena conectividad hacia el resto de la ciudad.',
        },
        imageIndexes: [],
        layout: 'text-only',
        // Sin lat/long real en el registro fuente (236682 los trae null) — se usa la dirección
        // exacta confirmada como query, con la nota "Dirección confirmada" en vez de "Ubicación
        // aproximada" (ver `addressIsExact` en DevelopmentLocationMap).
        map: { queryLabel: '1034 SW 2nd Avenue, Miami, FL 33130', addressIsExact: true },
      },
      {
        key: 'que-es-domus',
        title: 'Qué es DOMUS',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'DOMUS combina real estate, hospitality y operación profesional en un mismo edificio. El concepto se resume en FLATS — Flexible Apartments for Temporary Stays —, residencias pensadas para combinar la funcionalidad de una vivienda con los servicios y la estructura de un desarrollo con lógica de hospitality.',
        },
        imageIndexes: [0], // living/cocina con la marca "domus" visible en pantalla — render de marca, sin texto comercial
        layout: 'image-left',
      },
      {
        key: 'como-funciona',
        title: 'Cómo funciona el modelo',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'La unidad es propiedad de quien la compra. Sobre esa base, DOMUS incorpora una lógica de hospitality: existe una estructura profesional de management — con North Management participando de la operación del edificio — y herramientas pensadas tanto para propietarios como para huéspedes. Los términos específicos de uso, gestión y participación en el programa de hospitality dependen del acuerdo de management vigente en cada caso — eso se revisa en el proceso de evaluación, no se resume acá como una regla única.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'el-proyecto',
        title: 'El proyecto',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Domus Brickell Center es un edificio de 579 flats distribuidos en 35 pisos, en Brickell, Miami. El proyecto incluye tipologías de studio, 1 y 2 dormitorios, concebidas para entregarse terminadas y amobladas, con balcón privado, cocina equipada con electrodomésticos premium, mesadas de piedra, lavarropas y secarropas, y filtración de agua UV. Hoy se encuentra en construcción.',
        },
        imageIndexes: [11], // dormitorio esquina con skyline real de Brickell (torres SLS/JPMorgan) — confirma ubicación real
        layout: 'image-right',
      },
      {
        key: 'amenities-hospitality',
        title: 'Amenities y hospitality',
        // Grupos reales (FASE 10 del sistema, ya usado en Flow House) — categorías confirmadas por
        // la documentación validada de García, no inventadas.
        sourceTextSegment: { type: 'none' },
        groups: [
          {
            title: 'Rooftop',
            items: ['Rooftop pool', 'Sky deck', 'Cabanas y daybeds', 'Hot tub', 'Rooftop yoga deck', 'Rooftop bar'],
          },
          {
            title: 'Wellness',
            items: ['Gimnasio interior/exterior', 'Treatment rooms interiores/exteriores', 'Steam room'],
          },
          {
            title: 'Trabajo',
            items: ['Coworking', 'Conference room'],
          },
          {
            title: 'Hospitality y servicios',
            items: [
              'Domus Lobby Lounge con concepto F&B',
              'Garden lounge',
              'Lobby ambassadors / recepción 24 hs',
              'Valet parking 24 hs',
              'Quality control manager',
              'Housekeeping on call',
            ],
          },
        ],
        imageIndexes: [15], // lounge/restaurante en planta baja con la marca "domus" — render de marca
        layout: 'image-left',
      },
      {
        key: 'residencias',
        title: 'Residencias',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Domus Brickell Center ofrece tipologías de studio, 1 dormitorio y 2 dormitorios — el proyecto completo no es una única unidad. La imagen de esta sección corresponde a un ejemplo de tipología studio, no representa el total del proyecto ni sus otras tipologías.',
        },
        imageIndexes: [10], // living+cocina integrada de una unidad studio — único plano claramente identificable como tal
        layout: 'image-right',
      },
      {
        key: 'brickell-park',
        title: 'Domus Brickell Park, un antecedente construido',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'El concepto DOMUS ya tiene una expresión construida y operativa: Domus Brickell Park, un edificio de 171 flats en 12 pisos. Su existencia muestra que la propuesta de real estate con hospitality de Domus ya fue llevada a la práctica. Brickell Center es un proyecto distinto, con su propia escala, su propia etapa de obra y sus propias condiciones — la existencia y operación de Brickell Park no implica iguales resultados económicos para Brickell Center.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'reasons',
        title: 'Por qué considerar Domus Brickell Center',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Ubicación en Brickell, uno de los distritos financieros y residenciales de mayor crecimiento de Miami.',
            'Concepto que combina real estate y hospitality, con unidades entregadas terminadas y amobladas.',
            'Estructura profesional de operación, con North Management participando de la gestión del edificio.',
            '579 flats en 35 pisos, con tipologías de studio a 2 dormitorios y amenities orientados a bienestar, trabajo y vida social.',
          ],
        },
        imageIndexes: [],
        layout: 'reasons',
      },
      {
        key: 'para-quien',
        title: 'Puede ser una alternativa para',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'Puede tener sentido para quienes buscan exposición inmobiliaria en Miami a través de una propiedad concebida para uso personal y estadías temporarias, prefieren una estructura profesional de operación antes que gestionar la propiedad por su cuenta, y están dispuestos a evaluar un proyecto todavía en construcción.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'puede-no-tener-sentido',
        title: 'Puede no tener sentido si',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Buscás renta garantizada o un resultado económico asegurado.',
            'Necesitás liquidez inmediata o no podés sostener un horizonte de obra.',
            'Preferís no asumir el riesgo propio de un proyecto en preventa/construcción.',
            'Necesitás controlar la operación día a día sin delegarla a una estructura de management.',
            'Necesitás cifras definitivas de rentabilidad antes de revisar la documentación contractual real.',
          ],
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'que-conviene-evaluar',
        title: 'Antes de avanzar, hay preguntas que conviene responder',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Tu objetivo de compra: uso personal, uso mixto o exposición inmobiliaria.',
            'El horizonte de inversión y la etapa actual del proyecto (en construcción).',
            'La estructura de pagos y los costos asociados.',
            'Las reglas de uso y de operación del programa de hospitality.',
            'El rol de North Management en la gestión del edificio.',
            'El proceso para comprador extranjero y la documentación necesaria.',
          ],
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        // Actualizado en la vigesimosexta pasada: ya no dice "Precio: consultar" (contradiría el
        // bloque "Estructura de ingreso" de más arriba, que sí muestra un monto). El monto de
        // entrada vive en ese bloque, con su contexto completo — acá solo queda lo que sigue
        // siendo genuinamente "a consultar" (disponibilidad y el resto de las condiciones/saldo).
        key: 'informacion-comercial',
        title: 'Información comercial',
        sourceTextSegment: {
          type: 'curatedList',
          items: [
            'Disponibilidad: consultar información vigente.',
            'Condiciones comerciales: consultar condiciones vigentes y saldo restante.',
          ],
        },
        imageIndexes: [],
        layout: 'text-only',
      },
      {
        key: 'garcia-acompanamiento',
        title: 'El rol de García Inversiones',
        sourceTextSegment: {
          type: 'curatedText',
          text: 'En Domus Brickell Center, el trabajo de García Inversiones es entender tu objetivo, explicar cómo funciona el proyecto y su modelo, ayudarte a evaluar si tiene sentido para lo que buscás, y solicitar y contrastar la información vigente antes de avanzar. García Inversiones no administra Domus ni es parte del desarrollo, y no reemplaza el asesoramiento legal o fiscal que un proceso de este tipo requiere.',
        },
        imageIndexes: [],
        layout: 'text-only',
      },
    ],
    // idx4 (dormitorio), idx6 (dormitorio con skyline real de Brickell de noche), idx7 (baño),
    // idx9 (segundo dormitorio con vista a la bahía) — 4 interiores reales de residencia, ninguna
    // usada en otro bloque de la ficha.
    interiors: { title: 'Interiores y residencias', imageIndexes: [4, 6, 7, 9] },
    ctaTitle: '¿Querés evaluar Domus Brickell Center?',
    ctaSubtitle: 'Consultanos para conocer información vigente del proyecto y analizar si puede tener sentido para tu objetivo.',
    ctaLabel: 'Evaluar este desarrollo',
    ctaModalTitle: 'Evaluar Domus Brickell Center',
    ctaInitialMessage: 'Quiero recibir información actualizada y evaluar si Domus Brickell Center puede tener sentido para mi objetivo.',
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
// - Con curaduría editorial 100% propia (Icon Beach, Flow House, One Hollywood, Pacheco Central:
//   solo `curatedText`/`curatedList`/`none`, sin ningún segmento que lea la descripción cruda): la
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
// AUDITORÍA (vigésima pasada, re-confirmado en la vigesimotercera): 2Clics no expone ningún campo
// de rango (min/max) para un property_app_id — el schema real de `/api/property/{id}` solo trae
// un único `price` numérico + `currency` + `hidePrice`. En los 4 desarrollos de Miami, ese único
// `price` coincide con la cifra "desde"/"from" más baja mencionada en la propia descripción real
// de cada uno — por eso se representa como "Desde {currency} {price}" y nunca como un rango con un
// máximo que 2Clics no entrega. Un mismo precio "desde" que además aparece suelto en un fragmento
// de brochure incrustado en el texto libre (ej. Icon Beach, un "$850,000" dentro de una página de
// plantas en inglés) NO se usa para nada — no se arma un parser sobre ese texto, se ignora esa
// mención y se confía únicamente en el campo estructurado. Pacheco Central es el primer caso real
// donde ese único `price` es el de una unidad puntual, no del proyecto — ver
// `priceRepresentsProjectRange`.
//
// Si `hidePrice` es true o no hay un precio numérico válido, se omite el campo por completo —
// nunca "Consultar precio" acá (eso es un patrón de PropertyDetailView, no de esta landing).
export function formatDevelopmentPriceRange(
  price: number | null | undefined,
  currency: string | null | undefined,
  hidePrice: boolean | null | undefined,
): string | null {
  const amount = formatCurrencyAmount(price, currency, hidePrice);
  return amount ? `Desde ${amount}` : null;
}

// Monto formateado sin prefijo "Desde" (vigesimosexta pasada) — para contextos donde el número no
// representa un "desde" de proyecto sino un importe específico (ej. el monto de entrada de la
// estructura comercial de Domus Brickell Center). Mismo gate que `formatDevelopmentPriceRange`:
// `hidePrice`/sin precio válido → `null`, nunca un placeholder.
export function formatCurrencyAmount(
  price: number | null | undefined,
  currency: string | null | undefined,
  hidePrice: boolean | null | undefined,
): string | null {
  if (hidePrice) return null;
  if (price === null || price === undefined || !Number.isFinite(price) || price <= 0) return null;
  if (!currency) return null;
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(price);
  return `${currency} ${formatted}`;
}

// Suma del calendario de depósitos (vigesimosexta pasada) — único lugar donde se calcula el total
// de la etapa, para que nunca se desincronice de los pasos reales del calendario.
export function sumDepositSchedule(schedule: DevelopmentDepositStep[]): number {
  return schedule.reduce((sum, step) => sum + step.percent, 0);
}

function withSuffix(value: string, suffix: string): string {
  return value ? `${value} ${suffix}` : '';
}

export function resolveReferenceUnitFacts(unit: PublicProperty | null, uncoveredLabel: string): string[] {
  if (!unit) return [];
  const price = formatCurrencyAmount(unit.price, unit.currency, unit.hidePrice);
  return [
    formatCount(unit.amountRoom, 'ambiente', 'ambientes'),
    withSuffix(formatArea(unit.totalArea), 'totales'),
    withSuffix(formatArea(unit.coveredArea), 'cubiertos'),
    withSuffix(formatArea(unit.uncoveredArea), `de ${uncoveredLabel}`),
    price ? `Precio de esta unidad: ${price}` : '',
  ].filter(Boolean);
}

export type DevelopmentUnitRow = {
  propertyId: number;
  label: string;
  totalArea: string;
  orientation: string;
  price: string;
  href: string;
};

// `units` llega en el orden de `curation.propertyIds` y ya filtrado a lo que 2Clics devuelve como
// activo — una unidad dada de baja desaparece sola de la tabla y del conteo.
export function resolveDevelopmentUnitRows(curation: DevelopmentCuration, units: PublicProperty[]): DevelopmentUnitRow[] {
  return units
    .filter((unit): unit is PublicProperty & { propertyId: number } => unit.propertyId !== null)
    .map((unit) => ({
      propertyId: unit.propertyId,
      label: curation.unitLabels?.[unit.propertyId] || '',
      totalArea: formatArea(unit.totalArea),
      orientation: formatPublicDisplayValue(unit.metadata.orientation),
      price: formatPrice(unit.price, unit.currency, unit.hidePrice),
      href: propertyHref(unit),
    }));
}
