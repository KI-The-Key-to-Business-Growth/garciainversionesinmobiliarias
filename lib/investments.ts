import type { PublicImage } from '@/lib/2clics/types';

// Capa de curaduría editorial para /invertir/[slug] — mismo principio que `lib/desarrollos.ts`.
// La propiedad técnica (206734) es solo el vínculo con 2Clics: imágenes reales y property_app_id
// para el lead. Su tipo/ambientes/precio ("Casa", 1 ambiente, 6 dormitorios, U$D 100.000) no
// describen una participación y nunca se muestran.
//
// FUENTE DEL COPY (2026-10-15): la descripción vigente del registro 206734 en 2Clics, escrita por
// García — 445 N Shore Drive, Normandy Shores, Miami Beach: residencia unifamiliar de obra nueva,
// Tropical Modern, frente al agua con acceso a la bahía sin puentes, comunidad cerrada con
// vigilancia y campo de golf; ~5.500 SF bajo techo (511 m²), 8.405 SF totales (781 m²), lote de
// 11.000 SF (1.022 m²); seis suites, ascensor a las tres plantas, sala de medios, oficina, cocina
// exterior, sauna, estacionamiento cubierto; obra en marcha; participación como socio, condiciones
// y documentación presentadas en privado; sin rentabilidad garantizada. Nada de lo de abajo agrega
// datos que no estén ahí.
//
// PRIVACIDAD: el developer del proyecto no se nombra públicamente. Nada acá copia `meta_data`,
// `info_contact` ni notas internas de 2Clics.

export type InvestmentImageRef = {
  index: number;
  // Ancho natural real (px) del archivo de 2Clics — nunca se renderiza a un ancho mayor.
  naturalWidth: number;
};

export type InvestmentThesisPoint = {
  title: string;
  text: string;
};

export type InvestmentAudienceFit = {
  fits: string[];
  doesNotFit: string[];
};

export type InvestmentImageGroup = {
  title: string;
  text: string;
  note: string;
  images: InvestmentImageRef[];
};

// Condiciones vigentes — separadas del relato editorial. Sin una confirmación pública y fechada,
// todo se muestra como "Consultar".
export type InvestmentCurrentConditions = {
  price: string;
  availability: string;
  minimumInvestment: string;
  estimatedHorizon: string;
  privateTerms: string;
};

export type InvestmentEditorialCuration = {
  // Imagen de la card en /invertir — distinta de la apertura para no repetirla entre páginas.
  indexImage: InvestmentImageRef;
  openingImage: InvestmentImageRef;
  eyebrow: string;
  headline: string;
  location: string;
  intro: string;
  participation: string;
  processChain: string[];
  asset: {
    eyebrow: string;
    title: string;
    image: InvestmentImageRef;
    facts: string[];
  };
  setting: { title: string; text: string };
  construction: InvestmentImageGroup;
  project: InvestmentImageGroup;
  thesis: InvestmentThesisPoint[];
  risks: string[];
  audienceFit: InvestmentAudienceFit;
  conditions: InvestmentCurrentConditions;
};

const EDITORIAL_CURATIONS: Record<string, InvestmentEditorialCuration> = {
  '445-n-shore-drive': {
    // Auditoría de las 12 imágenes vigentes de 206734 (2000×1500, todas con la marca GARCÍA):
    // idx0 fachada al agua con muelle y pileta; idx2 contrafrente con pileta; idx3 fachada de
    // acceso; idx4-6 living/cocina; idx7 escalera; idx8 terraza al agua; idx9 pileta y muelle —
    // todos renders del proyecto. idx10/idx11 fotos aéreas REALES de la obra. Excluida: idx1, una
    // pieza gráfica con texto ("Participar desde el desarrollo...").
    indexImage: { index: 3, naturalWidth: 2000 },
    openingImage: { index: 0, naturalWidth: 2000 },
    eyebrow: 'Oportunidad de inversión · Miami Beach',
    headline: 'Participar en el desarrollo de una residencia frente al agua en Normandy Shores',
    location: 'Normandy Shores · Miami Beach · Florida · Estados Unidos',
    intro:
      'Una oportunidad para participar como socio en el desarrollo de una residencia unifamiliar de obra nueva en Miami Beach. No consiste en comprar la residencia ni una unidad en preventa.',
    participation:
      'La propuesta es diferente de comprar una propiedad terminada. El inversor participa económicamente como socio del proyecto, bajo las condiciones y la documentación correspondientes, y el resultado depende de la evolución del proyecto y de su posterior salida.',
    processChain: ['Tierra', 'Planificación', 'Capital', 'Construcción', 'Comercialización', 'Venta'],
    asset: {
      eyebrow: 'El activo',
      title: '445 N Shore Drive',
      image: { index: 2, naturalWidth: 2000 },
      facts: [
        'Residencia unifamiliar de obra nueva, estilo Tropical Modern',
        'Frente al agua, con acceso a la bahía sin puentes',
        'Aproximadamente 5.500 SF bajo techo (511 m²)',
        '8.405 SF totales (781 m²)',
        'Lote de 11.000 SF (1.022 m²)',
        'Seis suites con vista al agua',
        'Ascensor privado a las tres plantas',
        'Sala de medios, oficina, cocina exterior y sauna',
        'Estacionamiento cubierto',
      ],
    },
    setting: {
      title: 'Normandy Shores',
      text: '445 N Shore Drive se ubica en Normandy Shores, Miami Beach, dentro de una comunidad cerrada con vigilancia y campo de golf, con frente al agua y acceso a la bahía sin puentes.',
    },
    construction: {
      title: 'Estado de la obra',
      text: 'La obra se encuentra en marcha.',
      note: 'Fotografías del avance de obra.',
      images: [
        { index: 10, naturalWidth: 2000 },
        { index: 11, naturalWidth: 2000 },
      ],
    },
    project: {
      title: 'El proyecto',
      text: 'Seis suites con vista al agua distribuidas en tres plantas, con espacios interiores abiertos hacia el exterior.',
      note: 'Imágenes ilustrativas del proyecto.',
      images: [
        { index: 6, naturalWidth: 2000 },
        { index: 8, naturalWidth: 2000 },
        { index: 9, naturalWidth: 2000 },
      ],
    },
    thesis: [
      {
        title: 'Producto',
        text: 'Una residencia unifamiliar de obra nueva en el segmento residencial de lujo de Miami Beach.',
      },
      {
        title: 'Waterfront',
        text: 'Frente al agua con acceso a la bahía sin puentes: una característica objetiva y escasa.',
      },
      {
        title: 'Etapa del proyecto',
        text: 'La obra ya está en marcha; siguen existiendo riesgos de ejecución hasta su finalización.',
      },
      {
        title: 'Salida',
        text: 'El resultado depende de la evolución del proyecto y de su posterior salida.',
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
    audienceFit: {
      fits: [
        'Busca exposición a real estate estadounidense',
        'Puede comprometer capital durante un plazo intermedio',
        'Entiende riesgo de desarrollo',
        'No necesita renta mensual',
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
      price: 'Consultar precio',
      availability: 'Consultar',
      minimumInvestment: 'Consultar condición vigente',
      estimatedHorizon: 'Consultar actualización del proyecto',
      privateTerms:
        'Las condiciones específicas y la documentación se presentan de manera privada a quienes tengan un interés concreto.',
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
