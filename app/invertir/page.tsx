import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { getActiveInvestmentOpportunities } from '@/lib/site-curation';
import { getInvestmentEditorialCuration, resolveInvestmentImage } from '@/lib/investments';
import type { InvestmentOpportunityCuration } from '@/lib/site-curation';
import type { PublicImage } from '@/lib/2clics/types';

export const metadata: Metadata = {
  title: 'Invertir | García Inversiones Inmobiliarias',
  description: 'Invertir empieza por entender qué estás buscando — formas de participar en real estate que García tiene efectivamente disponibles hoy.',
  alternates: { canonical: '/invertir' },
};

// B. Formas de participar — tres alternativas reales, cada una con 2-3 puntos concretos (no un
// párrafo genérico). Los mismos tres nombres se reutilizan como columnas de la tabla comparativa.
const WAYS_TO_PARTICIPATE = [
  {
    label: 'Propiedad terminada',
    points: [
      'Se adquiere un inmueble determinado.',
      'Puede utilizarse, alquilarse o venderse posteriormente.',
      'El inversor tiene control directo sobre ese activo.',
    ],
  },
  {
    label: 'Unidad dentro de un desarrollo',
    points: [
      'Se adquiere una propiedad/unidad dentro de un proyecto que atraviesa etapas de desarrollo o construcción.',
      'Sigue existiendo una adquisición inmobiliaria directa.',
      'Las condiciones dependen del proyecto y momento de entrada.',
    ],
  },
  {
    label: 'Participación en un proyecto',
    points: [
      'El capital participa económicamente del desarrollo.',
      'No necesariamente se compra la propiedad terminada.',
      'El resultado depende de variables como ejecución, costos, financiación, tiempo y posterior comercialización/venta.',
    ],
  },
];

// C. Qué cambia entre una alternativa y otra — misma comparación en formato tabla editorial, sin
// chrome corporativo. Las columnas siguen el mismo orden/nombres que WAYS_TO_PARTICIPATE.
const COMPARISON_ROWS = [
  {
    factor: 'Qué se adquiere / dónde participa el capital',
    values: [
      'Un inmueble determinado',
      'Una unidad dentro de un proyecto en desarrollo',
      'Una participación económica en el desarrollo',
    ],
  },
  {
    factor: 'Cómo puede generarse valor',
    values: [
      'Uso, renta o valorización del activo',
      'Valorización de la unidad durante y después de la obra',
      'Resultado de la ejecución y venta del desarrollo',
    ],
  },
  {
    factor: 'Horizonte',
    values: [
      'Variable, según el objetivo del propietario',
      'Ligado al cronograma de obra y entrega',
      'Ligado a las etapas del proyecto hasta su venta',
    ],
  },
  {
    factor: 'Liquidez',
    values: ['Depende del mercado de reventa', 'Limitada hasta la escritura', 'Limitada hasta el cierre del proyecto'],
  },
  {
    factor: 'Riesgos principales',
    values: [
      'Mercado, mantenimiento, vacancia',
      'Obra, cronograma, mercado al momento de entrega',
      'Desarrollo, obra, financiación, mercado, venta final',
    ],
  },
  {
    factor: 'Nivel de participación / control',
    values: [
      'Control directo sobre el activo',
      'Control sobre la unidad adquirida',
      'Participación económica, sin operar el desarrollo',
    ],
  },
];

// D. Cómo analiza García una inversión — antes "No todas las inversiones son iguales" (4 puntos);
// ampliado a 6 factores concretos, con un mensaje de cierre conceptual.
const HOW_GARCIA_ANALYZES = [
  { label: 'Objetivo', text: 'Qué busca la persona: crecimiento patrimonial, renta, diversificación o resguardo.' },
  {
    label: 'Capital y exposición',
    text: 'Cuánto capital puede destinarse y qué nivel de exposición resulta razonable dentro de su patrimonio.',
  },
  {
    label: 'Horizonte y necesidad de liquidez',
    text: 'Cuánto tiempo puede permanecer comprometido el capital y qué disponibilidad necesita la persona.',
  },
  {
    label: 'Mercado, microubicación y producto',
    text: 'Buenos Aires o Miami, la microubicación específica y el producto en cuestión.',
  },
  {
    label: 'Riesgo y variables de ejecución',
    text: 'Qué puede afectar el resultado — desarrollo, obra, financiación, mercado — y en qué medida.',
  },
  { label: 'Estrategia de salida', text: 'Cómo y cuándo se espera recuperar o materializar el capital invertido.' },
];

type OpportunityEntry = {
  opportunity: InvestmentOpportunityCuration;
  image: PublicImage | null;
  eyebrow: string;
  intro: string;
};

async function loadOpportunities(): Promise<OpportunityEntry[]> {
  const results = await Promise.all(
    getActiveInvestmentOpportunities().map(async (opportunity) => {
      const curation = getInvestmentEditorialCuration(opportunity.slug);
      if (!curation) return null;
      const result = await getPublicPropertyById(opportunity.sourcePropertyId);
      if (!result.property) return null;
      return {
        opportunity,
        image: resolveInvestmentImage(result.property.images, curation.indexImage),
        eyebrow: curation.eyebrow,
        intro: curation.intro,
      };
    }),
  );
  return results.filter((entry): entry is OpportunityEntry => entry !== null);
}

// WEB GARCÍA V2 (Invertir, decimoquinta pasada) — refuerzo educativo sobre la reescritura de la
// decimocuarta: la landing explicaba las alternativas con muy poco desarrollo (una frase por
// concepto) y la card de la oportunidad tenía la misma huella que la apertura completa de una
// landing propia (`.project-open`), demasiado protagonismo para una card dentro de un índice.
// Ahora: intro educativa → tres formas de participar (con puntos concretos, no una frase) → tabla
// comparativa editorial → cómo analiza García (6 factores) → card de oportunidad compacta
// (`.invest-opportunity-*`, propia, no acoplada a `.project-open`) → cierre.
export default async function InvertirPage() {
  const entries = await loadOpportunities();

  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <h1>Invertir empieza por entender qué estás buscando.</h1>
            <p>
              No todas las oportunidades inmobiliarias generan valor de la misma manera. Analizamos
              objetivo, horizonte, liquidez, riesgo y características de cada alternativa antes de
              recomendarla.
            </p>
          </div>
        </section>

        {/* A. Intro educativa */}
        <section className="project-editorial-text project-editorial-text--tight">
          <div className="container project-editorial-text-inner">
            <h2>Invertir en real estate no significa siempre comprar una propiedad.</h2>
            <p>
              Existen distintas formas de obtener exposición al real estate. Algunas implican
              adquirir un inmueble terminado; otras, comprar dentro de un proyecto en desarrollo; y
              otras permiten participar económicamente en la creación de valor del propio
              desarrollo. Cada alternativa cambia el horizonte, la liquidez, los riesgos y la forma
              en que podría generarse el resultado.
            </p>
          </div>
        </section>

        {/* B. Formas de participar */}
        <section className="project-editorial-text project-editorial-text--tight">
          <div className="container project-editorial-text-inner invest-editorial-text-inner--wide">
            <h2>Formas de participar en real estate</h2>
            <div className="invest-thesis-grid invest-thesis-grid--three">
              {WAYS_TO_PARTICIPATE.map((item) => (
                <div key={item.label} className="invest-thesis-item">
                  <h3>{item.label}</h3>
                  <ul className="invest-audience-list">
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* C. Qué cambia entre una alternativa y otra */}
        <section className="project-editorial-text project-editorial-text--tight">
          <div className="container project-editorial-text-inner invest-editorial-text-inner--wide">
            <h2>Qué cambia entre una alternativa y otra</h2>
            <div className="invest-compare-wrap">
              <table className="invest-compare-table">
                <thead>
                  <tr>
                    <th scope="col"></th>
                    {WAYS_TO_PARTICIPATE.map((way) => (
                      <th scope="col" key={way.label}>
                        {way.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.factor}>
                      <th scope="row">{row.factor}</th>
                      {row.values.map((value, i) => (
                        <td key={`${row.factor}-${i}`}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* D. Cómo analiza García una inversión */}
        <section className="project-editorial-text project-editorial-text--tight">
          <div className="container project-editorial-text-inner invest-editorial-text-inner--wide">
            <h2>Cómo analiza García una inversión</h2>
            <div className="invest-thesis-grid">
              {HOW_GARCIA_ANALYZES.map((item) => (
                <div key={item.label} className="invest-thesis-item">
                  <h3>{item.label}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <p className="invest-analysis-note">
              No buscamos encajar a todos los clientes en una misma inversión. Primero entendemos
              qué necesita la persona y después analizamos qué alternativas tienen sentido.
            </p>
          </div>
        </section>

        {/* E. Oportunidades activas — card compacta, escala de catálogo, no de landing propia */}
        {entries.length ? (
          <section className="invest-opportunity-section">
            <div className="container">
              {entries.map(({ opportunity, image, eyebrow, intro }) => (
                <article className="invest-opportunity-card" key={opportunity.slug}>
                  {image ? (
                    <div className="invest-opportunity-media">
                      <Image
                        src={image.displayUrl}
                        alt=""
                        fill
                        sizes="(max-width: 780px) 100vw, 420px"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                      />
                    </div>
                  ) : null}
                  <div className="invest-opportunity-copy">
                    <p className="eyebrow">{eyebrow}</p>
                    <h2>{opportunity.name}</h2>
                    <p>{intro}</p>
                    <Link className="btn btn-primary" href={`/invertir/${opportunity.slug}`}>
                      Conocer la oportunidad
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* F. Cierre */}
        <section className="section-sm project-cta-final">
          <div className="container">
            <div className="cta-band">
              <div>
                <h2>Antes de mirar una oportunidad, miramos a la persona.</h2>
                <p>
                  Una inversión puede ser interesante y, al mismo tiempo, no ser adecuada para
                  determinado objetivo. Nuestro trabajo es entender esa diferencia antes de avanzar.
                </p>
              </div>
              <Link className="btn btn-primary" href="/contacto">
                Hablar sobre tu objetivo
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
