import type { PublicImage } from '@/lib/2clics/types';

// Capa de curaduría editorial para /invertir/[slug] — mismo principio que `lib/desarrollos.ts`
// para /desarrollos, pero con una diferencia estructural importante: en Faena, la descripción
// real de 2Clics ERA copy público utilizable (se podía extraer por markers). Acá NO — la
// propiedad técnica asociada (206734) es un registro placeholder de 2Clics: título "Casa en venta
// en Miami", tipo "Casa", 1000 m2, 1 dormitorio, U$D 100.000, y una descripción libre que incluye
// promesas de rentabilidad ("retorno estimado... superior al 15% anual") — nada de eso es apto
// para copy público (ver docs/ai/PROPERTY_UX_DECISIONS.md, auditoría decimocuarta pasada). Por
// eso todo el contenido editorial de este archivo es curaduría explícita, no extracción en
// runtime de `sourceProperty.description` — la propiedad 206734 se usa exclusivamente como
// vínculo técnico (property_app_id, imágenes reales, integración de leads vía
// PropertyInquiryPanel), nunca como fuente de texto público.
//
// PRIVACIDAD: nada acá debajo debe copiar `meta_data`/`info_contact`/notas internas de 2Clics ni
// clasificaciones de gobernanza interna (ej. "VALIDADO", "INFORMADO POR X", "CLAIM DEL
// DEVELOPER") — esas viven en la conversación/documentación interna, nunca en código de frontend.

export type InvestmentImageRef = {
  index: number;
  // Ancho natural real (px) auditado a mano contra el archivo real de 2Clics — nunca se renderiza
  // esta imagen a un ancho CSS mayor a este valor (mismo criterio que Faena, ver
  // docs/ai/PROPERTY_UX_DECISIONS.md).
  naturalWidth: number;
};

export type InvestmentProjectSpec = {
  key: string;
  address: string;
  image: InvestmentImageRef;
  // Datos publicables tal como fueron confirmados — nunca precios de salida, nunca inventados.
  facts: string[];
};

export type InvestmentProcessStep = {
  number: string;
  title: string;
};

export type InvestmentThesisPoint = {
  title: string;
  text: string;
};

export type InvestmentAudienceFit = {
  fits: string[];
  doesNotFit: string[];
};

export type InvestmentDeveloper = {
  name: string;
  description: string;
  founders: string[];
};

// Condiciones vigentes — DELIBERADAMENTE dinámico y separado del relato editorial fijo. Ningún
// bloque narrativo de la landing debe hardcodear montos/plazos/porcentajes/fechas — todo eso vive
// acá, listo para actualizarse sin tocar el componente. Hoy no existe una confirmación pública
// vigente y fechada de estos valores, así que se muestran mensajes de "Consultar" en vez de
// inventar una fecha o un número. `status`/`projectStage`/`capitalRemaining`/`projectedReturn*`/
// `cta` quedan declarados en el tipo (estructura lista para cuando haya datos confirmados) pero
// esta pasada NO los renderiza — solo se muestran `availability`/`minimumInvestment`/
// `estimatedHorizon`/`lastUpdated` (si existe).
export type InvestmentCurrentConditions = {
  status: string;
  availability: string;
  minimumInvestment: string;
  estimatedHorizon: string;
  projectStage: string;
  // null = sin confirmación pública fechada — nunca se muestra una fecha inventada.
  lastUpdated: string | null;
  capitalRemaining: string | null;
  projectedReturn: string | null;
  projectedReturnLabel: string | null;
  // Si en el futuro se muestra `projectedReturn`, este campo es obligatorio y debe aclarar que es
  // una proyección del developer, nunca un resultado histórico/garantizado por García.
  projectedReturnSource: string | null;
  cta: string;
};

export type InvestmentEditorialCuration = {
  // Imagen de la card protagonista en /invertir — distinta de `openingImage` (que es la foto de
  // obra real de la apertura de la landing) para no repetir la misma imagen entre ambas páginas.
  indexImage: InvestmentImageRef;
  // Imagen de apertura/"momento visual" — foto real limpia, sin texto promocional incrustado.
  openingImage: InvestmentImageRef;
  intro: string;
  processChain: string[];
  coconutGrove: string[];
  projects: InvestmentProjectSpec[];
  howItWorksIntro: string;
  process: InvestmentProcessStep[];
  thesis: InvestmentThesisPoint[];
  risks: string[];
  developer: InvestmentDeveloper;
  audienceFit: InvestmentAudienceFit;
  conditions: InvestmentCurrentConditions;
};

const EDITORIAL_CURATIONS: Record<string, InvestmentEditorialCuration> = {
  'proyecto-especial-miami': {
    // Auditoría de imágenes (decimocuarta pasada, re-auditada en la decimoquinta, 18 imágenes
    // reales de 206734 en 2Clics, sin cambios entre pasadas): exteriores/pileta/waterfront limpios
    // (idx 6, 7) confirmados por dirección contra sus gemelas con el domicilio impreso (idx
    // 16→1710, idx 17→1716); fotos de obra reales sin texto (idx 13, 14, 15); el resto se
    // descartó por: copy promocional incrustado en el archivo ("100% RENTA PASIVA", "ALTA RENTA",
    // "INVERSIÓN MÍNIMA USD 100.000" — idx 1, 2, 3), o por pertenecer a una dirección distinta
    // impresa en la propia imagen ("1000 89 St, Surfside" idx 4; "5345 SW 84th St" idx 9; "445 N
    // Shore, Miami Beach" idx 10), o por no poder atribuirse con certeza a ninguna de las dos
    // direcciones (edificio multi-unidad con balcones, idx 8/12 — no coincide con ninguna casa
    // unifamiliar de 6-7 dormitorios descripta), o por no mostrar waterfront/no coincidir con
    // ninguna descripción real (idx 11, estilo genérico/stock).
    //
    // ESTILO ARQUITECTÓNICO — DELIBERADAMENTE OMITIDO (decimoquinta pasada): la única fuente
    // disponible para atribuir "Caribbean Colonial" vs. "contemporáneo" a cada dirección son estas
    // mismas dos imágenes con el domicilio impreso (idx 16/17) — re-auditadas de nuevo esta
    // pasada, mismo resultado que la anterior. La usuaria señaló que esto contradice una ficha
    // estratégica/handoff de Olivia Harper Homes a la que esta sesión no tiene acceso directo, así
    // que no hay forma de confirmar cuál de las dos fuentes es correcta sin verla. Regla explícita
    // del pedido: "es preferible publicar menos información antes que publicar una atribución
    // dudosa" — se sacó la línea de estilo arquitectónico de ambos proyectos hasta que se pueda
    // confirmar contra esa fuente. El resto de los datos (superficies, ambientes, amenities) no
    // está en disputa — viene del mismo pedido original de García, sin contradicción señalada.
    indexImage: { index: 7, naturalWidth: 1520 },
    openingImage: { index: 15, naturalWidth: 980 },
    intro:
      'Una oportunidad para participar económicamente en el desarrollo de residencias de lujo que serán construidas y posteriormente comercializadas, en lugar de comprar una propiedad terminada.',
    processChain: ['Tierra', 'Planificación', 'Capital', 'Construcción', 'Comercialización', 'Venta'],
    coconutGrove: [
      'La tesis de esta oportunidad no es "Miami" como mercado genérico, sino la combinación puntual de una microubicación, un producto y un momento de desarrollo específicos.',
      'Coconut Grove combina acceso real a la costa —frente de agua, dock privado, salida directa a Biscayne Bay— con una escasez física de terrenos con esas características, en un submercado orientado a un comprador final de alto patrimonio.',
      'Esa combinación, y no una expectativa genérica de que "todo sube", es lo que sostiene el análisis de esta oportunidad.',
    ],
    projects: [
      {
        key: '1710-bayshore',
        address: '1710 S. Bayshore Drive',
        image: { index: 6, naturalWidth: 1520 },
        facts: [
          'Aproximadamente 6.500 SF interiores climatizados',
          'Aproximadamente 8.000 SF totales',
          '6 dormitorios',
          '6 baños',
          '2 powder rooms',
          'Waterfront',
          'Dock privado',
          'Gimnasio',
          'Media room',
          'Outdoor living',
        ],
      },
      {
        key: '1716-bayshore',
        address: '1716 S. Bayshore Drive',
        image: { index: 7, naturalWidth: 1520 },
        facts: [
          'Aproximadamente 7.500 SF interiores climatizados',
          'Aproximadamente 9.000 SF totales',
          'Terreno aproximado de 19.000 SF',
          '100 pies de waterfront',
          '7 dormitorios',
          '7 baños',
          'Dock privado',
          'Piscina',
          'Summer kitchen',
          'Media room',
        ],
      },
    ],
    howItWorksIntro:
      'El inversor participa de forma pasiva en esta etapa del proyecto — la ejecución (diseño, permisos, obra y comercialización) queda a cargo del developer.',
    process: [
      { number: '01', title: 'Identificación y adquisición' },
      { number: '02', title: 'Arquitectura, ingeniería y permisos' },
      { number: '03', title: 'Participación de capital' },
      { number: '04', title: 'Construcción' },
      { number: '05', title: 'Comercialización' },
      { number: '06', title: 'Venta y resultado del proyecto' },
    ],
    thesis: [
      {
        title: 'Producto',
        text: 'Residencias diseñadas para un comprador específico del mercado residencial de lujo.',
      },
      {
        title: 'Waterfront',
        text: 'Acceso al agua como característica objetiva, escasa y funcional.',
      },
      {
        title: 'Etapa del proyecto',
        text: 'El capital participa después de determinadas etapas previas, aunque continúan existiendo riesgos de ejecución.',
      },
      {
        title: 'Salida',
        text: 'El resultado económico depende principalmente de la construcción y posterior venta de las residencias.',
      },
    ],
    risks: [
      'Riesgo de desarrollo',
      'Riesgo de obra',
      'Sobrecostos',
      'Tiempos',
      'Mercado',
      'Financiamiento',
      'Precio final de venta',
      'Falta de liquidez',
      'Retorno no garantizado',
    ],
    developer: {
      name: 'Olivia Harper Homes',
      description:
        'Developer boutique de Miami orientado al desarrollo de residencias unifamiliares de lujo y ultra-lujo.',
      founders: ['John Schamy', 'Jack Echterling'],
    },
    audienceFit: {
      fits: [
        'Busca exposición a real estate estadounidense',
        'Puede comprometer capital durante un plazo intermedio',
        'Entiende riesgo de desarrollo',
        'No necesita renta mensual',
        'Prefiere participación pasiva',
        'Busca diversificación respecto de una propiedad terminada',
      ],
      doesNotFit: [
        'Necesita liquidez inmediata',
        'Busca renta mensual',
        'Necesita capital o rentabilidad garantizados',
        'Quiere utilizar personalmente el inmueble',
        'Tiene baja tolerancia al riesgo',
      ],
    },
    conditions: {
      status: 'active',
      availability: 'Consultar',
      minimumInvestment: 'Consultar condición vigente',
      estimatedHorizon: 'Consultar actualización del proyecto',
      projectStage: 'Consultar actualización del proyecto',
      lastUpdated: null,
      capitalRemaining: null,
      projectedReturn: null,
      projectedReturnLabel: null,
      projectedReturnSource: null,
      cta: 'Consultar',
    },
  },
};

export function getInvestmentEditorialCuration(slug: string): InvestmentEditorialCuration | null {
  return EDITORIAL_CURATIONS[slug] || null;
}

export function resolveInvestmentImage(images: PublicImage[], ref: InvestmentImageRef | undefined): PublicImage | null {
  if (!ref) return null;
  return images[ref.index] || null;
}
