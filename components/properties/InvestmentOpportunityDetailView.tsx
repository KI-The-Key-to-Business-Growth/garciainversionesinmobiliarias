import React from 'react';
import Image from 'next/image';
import PropertyInquiryPanel from '@/components/properties/PropertyInquiryPanel';
import { getInvestmentEditorialCuration, resolveInvestmentImage } from '@/lib/investments';
import type { InvestmentImageGroup } from '@/lib/investments';
import type { InvestmentOpportunityCuration } from '@/lib/site-curation';
import type { PublicImage, TwoclicsRegion } from '@/lib/2clics/types';

// Vínculo técnico MÍNIMO con el registro de 2Clics — deliberadamente NO es `PublicProperty`: lo que
// cruza hacia un Client Component (PropertyInquiryPanel) viaja en el payload RSC aunque no se
// pinte. Solo `propertyId`/`region` (para el lead) e `images` (curaduría visual).
type InvestmentSourceLink = {
  propertyId: number | null;
  region: TwoclicsRegion;
  images: PublicImage[];
};

type InvestmentOpportunityDetailViewProps = {
  opportunity: InvestmentOpportunityCuration;
  source: InvestmentSourceLink;
};

function ImageGroupSection({ group, images }: { group: InvestmentImageGroup; images: PublicImage[] }) {
  const resolved = group.images
    .map((ref) => resolveInvestmentImage(images, ref))
    .filter((image): image is PublicImage => Boolean(image));
  if (!resolved.length) return null;
  return (
    <section className="project-interiors">
      <div className="container">
        <div className="project-interiors-heading">
          <h2>{group.title}</h2>
          <p>{group.text}</p>
        </div>
        <div
          className={`project-interiors-grid project-interiors-grid--${resolved.length} project-interiors-grid--landscape`}
        >
          {resolved.map((image, index) => (
            <div className="project-interiors-media" key={image.id || index}>
              <Image
                src={image.displayUrl}
                alt=""
                fill
                sizes="(max-width: 780px) 100vw, (max-width: 1080px) 50vw, 620px"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          ))}
        </div>
        <p className="project-interiors-note">{group.note}</p>
      </div>
    </section>
  );
}

// Landing de oportunidad de inversión (/invertir/[slug]). No es una ficha de propiedad: todo el
// contenido visible viene de la curaduría explícita en `lib/investments.ts`; del registro técnico
// solo se usan imágenes y el id para el lead. Reutiliza las clases visuales de los desarrollos
// (`.project-open`, `.project-editorial-text`, `.project-block`, `.project-interiors`).
export default function InvestmentOpportunityDetailView({
  opportunity,
  source,
}: InvestmentOpportunityDetailViewProps) {
  const curation = getInvestmentEditorialCuration(opportunity.slug);

  if (!curation) {
    // Sin curaduría explícita no se inventa una landing — solo el mecanismo de consulta.
    return (
      <div className="development-detail">
        <section className="project-open project-open--compact">
          <div className="container project-open-grid">
            <div className="project-open-copy">
              <p className="eyebrow">Oportunidad de inversión</p>
              <h1>{opportunity.name}</h1>
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
  const assetImage = resolveInvestmentImage(source.images, curation.asset.image);
  const { conditions } = curation;

  return (
    <div className="development-detail">
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
            <p className="eyebrow">{curation.eyebrow}</p>
            <h1>{curation.headline}</h1>
            <p className="project-open-location">{curation.location}</p>
            <p className="project-open-text">{curation.intro}</p>
          </div>
        </div>
      </section>

      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Participar en la creación de valor inmobiliario</h2>
          <p>{curation.participation}</p>
          <ol className="invest-process-chain">
            {curation.processChain.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="project-block project-block--left">
        <div className="container project-block-grid">
          {assetImage ? (
            <div className="project-block-media">
              <Image
                src={assetImage.displayUrl}
                alt=""
                fill
                sizes={`(max-width: 900px) 100vw, ${Math.min(curation.asset.image.naturalWidth, 560)}px`}
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          ) : null}
          <div className="project-block-content">
            <p className="eyebrow">{curation.asset.eyebrow}</p>
            <h2>{curation.asset.title}</h2>
            <ul className="project-block-list">
              {curation.asset.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>{curation.setting.title}</h2>
          <p>{curation.setting.text}</p>
        </div>
      </section>

      <ImageGroupSection group={curation.construction} images={source.images} />
      <ImageGroupSection group={curation.project} images={source.images} />

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

      <section className="project-editorial-text project-editorial-text--tight">
        <div className="container project-editorial-text-inner">
          <h2>Condiciones vigentes</h2>
          <dl className="twoclics-spec-list twoclics-spec-list--compact">
            <div>
              <dt>Precio</dt>
              <dd>{conditions.price}</dd>
            </div>
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
          </dl>
          <p>{conditions.privateTerms}</p>
        </div>
      </section>

      <section className="section-sm project-cta-final">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Querés analizar si esta oportunidad encaja con tu objetivo?</h2>
              <p>
                Coordiná una conversación con García para conocer cómo funciona la participación,
                las condiciones vigentes y si tiene sentido para tu estrategia patrimonial.
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
