import React from 'react';
import Link from 'next/link';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyDescription from '@/components/properties/PropertyDescription';
import PropertyGallery from '@/components/properties/PropertyGallery';
import { formatArea, formatPublicLocation, propertyHref } from '@/lib/2clics/format';
import type { InvestmentOpportunityCuration } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

type InvestmentOpportunityDetailViewProps = {
  opportunity: InvestmentOpportunityCuration;
  sourceProperty: PublicProperty;
  units: PublicProperty[];
};

// Landing de una oportunidad de inversión (/invertir/[slug], WEB GARCÍA V2 tercera pasada) —
// distinta de la ficha inmobiliaria canónica (`/propiedades/[id]`), que sigue siendo la fuente
// completa de datos de la propiedad. `opportunity.note` (si existe) es el único contenido
// editorial que no viene de 2Clics — nunca nombres de personas ni referencias a acuerdos internos
// (eso es conocimiento interno, ver docs/ai/WEB_GARCIA_V2.md, nunca copy público). No se define
// ninguna figura legal/comercial no confirmada (fondo, coinversión, etc.) en ningún texto acá.
export default function InvestmentOpportunityDetailView({
  opportunity,
  sourceProperty,
  units,
}: InvestmentOpportunityDetailViewProps) {
  const location = formatPublicLocation(sourceProperty.location, sourceProperty.region);
  const typeName = sourceProperty.propertyType?.name || '';
  const totalArea = formatArea(sourceProperty.totalArea);
  const ficheHref = propertyHref(sourceProperty);

  const highlights = [
    typeName ? { label: 'Tipo', value: typeName } : null,
    location ? { label: 'Ubicación', value: location } : null,
    totalArea ? { label: 'Superficie total', value: totalArea } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  return (
    <>
      {/* A. Hero editorial */}
      <section className="twoclics-detail-hero">
        <div className="container twoclics-detail-hero-inner">
          <div>
            <p className="eyebrow">Oportunidad de inversión</p>
            <h1>{opportunity.name}</h1>
            {location ? <p className="twoclics-detail-location">{location}</p> : null}
          </div>
        </div>
      </section>

      <section className="twoclics-detail-section">
        <div className="container twoclics-detail-layout twoclics-detail-layout--single">
          <main className="twoclics-detail-main">
            {/* B. Introducción */}
            <section className="twoclics-detail-panel">
              <h2>Sobre esta oportunidad</h2>
              <p className="twoclics-rich-text">
                García está trabajando activamente esta oportunidad. A continuación compartimos la
                información pública disponible sobre el activo asociado.
              </p>
              {opportunity.note ? <p className="twoclics-rich-text">{opportunity.note}</p> : null}
            </section>

            {/* D. Datos principales confirmados */}
            {highlights.length ? (
              <section className="twoclics-detail-panel">
                <h2>Datos principales</h2>
                <dl className="twoclics-spec-list twoclics-spec-list--compact">
                  {highlights.map((entry) => (
                    <div key={entry.label}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {/* C. Información pública disponible del activo */}
            {sourceProperty.description ? (
              <section className="twoclics-detail-panel">
                <h2>Descripción</h2>
                <PropertyDescription text={sourceProperty.description} />
              </section>
            ) : null}

            {/* E. Galería */}
            <PropertyGallery images={sourceProperty.images} title={opportunity.name} />

            {/* F. CTA — ver ficha */}
            <div className="section-cta">
              <Link className="btn btn-outline" href={ficheHref}>
                Ver ficha de la propiedad
              </Link>
            </div>
          </main>
        </div>
      </section>

      <section className="twoclics-related-section">
        <div className="container">
          <div className="twoclics-section-heading twoclics-section-heading--compact">
            <h2>Propiedad relacionada</h2>
          </div>
          <div className="twoclics-grid">
            {units.map((unit) => (
              <PropertyCard key={unit.propertyId || unit.title} property={unit} variant="overlay-catalog" />
            ))}
          </div>
        </div>
      </section>

      {/* G. CTA humano */}
      <section className="section-sm">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Querés consultar esta oportunidad?</h2>
              <p>Coordiná una conversación con García para conocer más detalles.</p>
            </div>
            <a
              className="btn btn-primary"
              href="https://wa.me/5491167240353"
              target="_blank"
              rel="noopener"
              data-whatsapp-location="invertir"
            >
              Consultar esta oportunidad
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
