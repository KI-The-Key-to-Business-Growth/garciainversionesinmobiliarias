import React from 'react';
import Image from 'next/image';
import PropertyInquiryPanel from '@/components/properties/PropertyInquiryPanel';
import { getInvestmentEditorialCuration, resolveInvestmentImage } from '@/lib/investments';
import type { InvestmentOpportunityCuration } from '@/lib/site-curation';
import type { PublicImage, TwoclicsRegion } from '@/lib/2clics/types';

// Vínculo técnico MÍNIMO con el registro real de 2Clics — deliberadamente NO es `PublicProperty`
// completo. Next.js serializa cualquier prop que cruce hacia un Client Component (acá,
// PropertyInquiryPanel) en el payload RSC que llega al navegador — visible en el HTML/"view
// source" aunque nunca se pinte como texto. Si este componente recibiera el `PublicProperty`
// completo (título "Casa en venta en Miami", dirección placeholder, descripción con promesas de
// rentabilidad), esos datos terminarían en el payload igual, aunque el JSX nunca los muestre. Solo
// se pasan `propertyId`/`region` (para el lead) e `images` (para la curaduría visual).
type InvestmentSourceLink = {
  propertyId: number | null;
  region: TwoclicsRegion;
  images: PublicImage[];
};

type InvestmentOpportunityDetailViewProps = {
  opportunity: InvestmentOpportunityCuration;
  source: InvestmentSourceLink;
};

// Landing de oportunidad de inversión (/invertir/[slug]). Reescrita por completo en la
// decimocuarta pasada (la versión anterior reutilizaba el layout de ficha inmobiliaria mostrando
// datos placeholder del registro técnico como si fueran las características de la inversión).
// Reordenada y compactada en la decimoquinta: "Los dos proyectos" se movió justo después de "Qué
// es esta oportunidad" (antes que Coconut Grove) para dejar inequívoco lo antes posible que son
// dos residencias distintas — cada bloque ahora se etiqueta "Residencia 1 de 2"/"Residencia 2 de
// 2" además de su propia dirección, imagen y lista de datos (nunca mezclados entre sí). La línea
// de estilo arquitectónico (Caribbean Colonial/contemporáneo) se retiró de ambos proyectos: la
// única fuente disponible para atribuirla son dos imágenes con el domicilio impreso, y la usuaria
// señaló que esto contradice una ficha estratégica externa que esta sesión no puede auditar — ver
// el comentario en `lib/investments.ts`.
//
// Esta oportunidad NO es la compra de la casa placeholder del registro técnico — es una
// participación económica en el desarrollo de dos residencias waterfront en Coconut Grove, Miami.
// `source` (206734) se usa EXCLUSIVAMENTE como vínculo técnico: imágenes reales (auditadas y
// curadas, ver lib/investments.ts) y `propertyId` para `PropertyInquiryPanel` (property_app_id,
// POST /api/lead/message) — nunca título, tipo, superficie, precio ni dormitorios/baños del
// registro, y nunca su `description` (contiene promesas de rentabilidad no aptas para copy
// público). Todo el contenido editorial visible viene de la curaduría explícita en
// `lib/investments.ts`, con la misma arquitectura/ritmo/clases visuales que
// CuratedDevelopmentDetailView.tsx (Faena) — reutilizadas, no modificadas: `.project-open`,
// `.project-editorial-text`, `.project-block`, `.project-cta-final`. Los modificadores
// `--compact`/`--tight` (ver app/globals.css) son EXCLUSIVOS de esta vista — Faena sigue usando
// las clases base sin modificador, sin cambios de tamaño.
export default function InvestmentOpportunityDetailView({
  opportunity,
  source,
}: InvestmentOpportunityDetailViewProps) {
  // Ubicación pública curada, NO derivada de `sourceProperty.location` — el registro placeholder
  // 206734 trae `neighborhood: "Miami"` (sin "Coconut Grove"), consistente con el resto de sus
  // datos genéricos/placeholder. La ubicación real de la oportunidad se declara acá.
  const location = 'Coconut Grove · Miami · Florida · Estados Unidos';
  const curation = getInvestmentEditorialCuration(opportunity.slug);

  if (!curation) {
    // Sin curaduría editorial explícita para este slug: no se inventa una landing — degrada a un
    // bloque mínimo con el mismo mecanismo de consulta, nunca a la ficha de propiedad.
    return (
      <div className="development-detail">
        <section className="project-open project-open--compact">
          <div className="container project-open-grid">
            <div className="project-open-copy">
              <p className="eyebrow">Oportunidad de inversión · Miami</p>
              <h1>{opportunity.name}</h1>
              {location ? <p className="project-open-location">{location}</p> : null}
            </div>
          </div>
        </section>
        <section className="section-sm project-cta-final">
          <div className="container">
            <div className="cta-band">
              <div>
                <h2>¿Querés analizar si esta oportunidad encaja con tu objetivo?</h2>
                <p>Coordiná una conversación con García para conocer las condiciones vigentes.</p>
              </div>
              <PropertyInquiryPanel
                propertyId={source.propertyId}
                propertyTitle={opportunity.name}
                propertyRegion={source.region}
                label="Conocer la oportunidad"
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const openingImage = resolveInvestmentImage(source.images, curation.openingImage);
  const { conditions } = curation;

  return (
    <div className="development-detail">
      {/* Apertura — sin CTA. Variante compacta de `.project-open` (Faena usa la versión sin
          modificador, sin tocarla) — imagen menos alta, menos padding vertical. */}
      <section className="project-open project-open--compact">
        <div className="container project-open-grid">
          {openingImage ? (
            <div className="project-open-media">
              <Image
                src={openingImage.displayUrl}
                alt=""
                fill
                priority
                sizes={`(max-width: 900px) 100vw, ${Math.min(curation.openingImage.naturalWidth, 520)}px`}
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          ) : null}
          <div className="project-open-copy">
            <p className="eyebrow">Oportunidad de inversión · Miami</p>
            <h1>Participar en el desarrollo de residencias waterfront en Coconut Grove</h1>
            <p className="project-open-location">{location}</p>
            <p className="project-open-text">{curation.intro}</p>
          </div>
        </div>
      </section>

      {/* Qué es esta oportunidad */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Participar en la creación de valor inmobiliario</h2>
          <p>
            La propuesta es diferente de comprar una residencia terminada. El capital participa en
            una etapa del desarrollo de las residencias — el inversor no opera ni gestiona la obra
            de manera cotidiana — que posteriormente se comercializan y venden.
          </p>
          <ol className="invest-process-chain">
            {curation.processChain.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* Los dos proyectos — movidos arriba en la página (decimoquinta pasada) para dejar
          inequívoco, cuanto antes, que son dos residencias distintas. */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Los dos proyectos de Coconut Grove</h2>
          <p>
            La oportunidad está vinculada a dos residencias waterfront diferentes, concebidas como
            productos independientes sobre terrenos contiguos en S. Bayshore Drive.
          </p>
        </div>
      </section>

      {curation.projects.map((project, index) => {
        const image = resolveInvestmentImage(source.images, project.image);
        const modifier = index % 2 === 0 ? 'left' : 'right';
        return (
          <section key={project.key} className={`project-block project-block--${modifier}`}>
            <div className="container project-block-grid">
              {image ? (
                <div className="project-block-media">
                  <Image
                    src={image.displayUrl}
                    alt=""
                    fill
                    sizes={`(max-width: 900px) 100vw, ${Math.min(project.image.naturalWidth, 560)}px`}
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                  />
                </div>
              ) : null}
              <div className="project-block-content">
                <p className="eyebrow">
                  Residencia {index + 1} de {curation.projects.length}
                </p>
                <h2>{project.address}</h2>
                <ul className="project-block-list">
                  {project.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}

      {/* Coconut Grove y microubicación */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Coconut Grove y el valor de una microubicación</h2>
          {curation.coconutGrove.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>De la tierra a la venta</h2>
          <p>{curation.howItWorksIntro}</p>
          <ol className="invest-process-steps invest-process-steps--compact">
            {curation.process.map((step) => (
              <li key={step.number}>
                <span className="invest-process-steps-number">{step.number}</span>
                <span className="invest-process-steps-title">{step.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tesis de inversión */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner invest-editorial-text-inner--wide">
          <h2>Qué estamos analizando detrás de la oportunidad</h2>
          <div className="invest-thesis-grid">
            {curation.thesis.map((point) => (
              <div key={point.title} className="invest-thesis-item">
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Riesgos y horizonte — jerarquía propia, fondo navy */}
      <section className="invest-risks">
        <div className="container invest-editorial-text-inner--wide">
          <h2>Potencial y riesgo forman parte de la misma decisión</h2>
          <ul className="invest-risks-list">
            {curation.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
          <p className="invest-risks-note">Una proyección no equivale a un resultado.</p>
        </div>
      </section>

      {/* Developer */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Quién desarrolla</h2>
          <p>
            <strong>{curation.developer.name}</strong> — {curation.developer.description}
          </p>
          <p>Fundadores: {curation.developer.founders.join(' · ')}</p>
        </div>
      </section>

      {/* Para quién puede tener sentido — encabezados con tono de análisis, no de veredicto de
          aptitud financiera. */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner invest-editorial-text-inner--wide">
          <h2>Para quién puede tener sentido</h2>
          <div className="invest-audience-grid">
            <div>
              <h3>Puede tener sentido analizarla para alguien que:</h3>
              <ul className="invest-audience-list">
                {curation.audienceFit.fits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Probablemente convenga considerar otro tipo de alternativa para alguien que:</h3>
              <ul className="invest-audience-list">
                {curation.audienceFit.doesNotFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Condiciones vigentes — siempre "Consultar" mientras no exista confirmación pública fechada */}
      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Condiciones vigentes</h2>
          <dl className="twoclics-spec-list twoclics-spec-list--compact">
            <div>
              <dt>Disponibilidad</dt>
              <dd>{conditions.availability}</dd>
            </div>
            <div>
              <dt>Inversión mínima</dt>
              <dd>{conditions.minimumInvestment}</dd>
            </div>
            <div>
              <dt>Horizonte estimado</dt>
              <dd>{conditions.estimatedHorizon}</dd>
            </div>
            {conditions.lastUpdated ? (
              <div>
                <dt>Última actualización</dt>
                <dd>{conditions.lastUpdated}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {/* Cierre — única instancia de CTA en toda la landing. */}
      <section className="section-sm project-cta-final">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Querés analizar si esta oportunidad encaja con tu objetivo?</h2>
              <p>
                Coordiná una conversación con García para conocer las condiciones vigentes,
                entender la estructura y evaluar si tiene sentido para tu estrategia patrimonial.
              </p>
            </div>
            <PropertyInquiryPanel
              propertyId={source.propertyId}
              propertyTitle={opportunity.name}
              propertyRegion={source.region}
              label="Conocer la oportunidad"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
