import React from 'react';
import Image from 'next/image';
import PropertyInquiryPanel from '@/components/properties/PropertyInquiryPanel';
import PropertyCard from '@/components/properties/PropertyCard';
import { formatPublicLocation } from '@/lib/2clics/format';
import { getDevelopmentEditorialCuration, resolveSectionImages, resolveSourceTextSegment } from '@/lib/desarrollos';
import type { DevelopmentSection } from '@/lib/desarrollos';
import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicImage, PublicProperty } from '@/lib/2clics/types';

type CuratedDevelopmentDetailViewProps = {
  curation: DevelopmentCuration;
  sourceProperty: PublicProperty;
  units: PublicProperty[];
};

// Landing EDITORIAL de desarrollo (WEB GARCÍA V2 — decimotercera pasada). Reescrita sobre la
// duodécima pasada: alternar mecánicamente imagen/fragmento de texto (por espaciado, sin relación
// temática real entre ambos) seguía sin sentirse una presentación de proyecto — y varias imágenes
// reales de Faena, al mostrarse a un ancho mayor a su resolución nativa, se veían borrosas (ver
// auditoría en docs/ai/PROPERTY_UX_DECISIONS.md). Este componente ahora es puramente un
// RENDERIZADOR: la curaduría real (qué imagen, qué fragmento, qué layout) vive en
// `lib/desarrollos.ts` (`getDevelopmentEditorialCuration`) — acá solo se resuelve esa curaduría
// contra los datos reales de `sourceProperty` y se pinta. 2Clics sigue siendo la única fuente de
// verdad: cada fragmento de texto se extrae en runtime de `sourceProperty.description` (ya
// sanitizado), cada imagen es una de `sourceProperty.images` — nada se copia ni se inventa acá.
export default function CuratedDevelopmentDetailView({
  curation,
  sourceProperty,
  units,
}: CuratedDevelopmentDetailViewProps) {
  const displayName = sourceProperty.title || curation.name;
  const location = formatPublicLocation(sourceProperty.location, sourceProperty.region);
  const description = sourceProperty.description || '';
  const editorial = getDevelopmentEditorialCuration(curation.slug);

  // Sin curaduría editorial declarada para este desarrollo: degrada con gracia a apertura + CTA
  // de cierre, sin inventar secciones ni intentar adivinar bloques de una descripción no curada.
  const heroImage = editorial ? sourceProperty.images[editorial.heroImageIndex] : sourceProperty.images[0];
  const introSegment = editorial ? editorial.introSegment : ({ type: 'firstParagraphLead' } as const);
  const introText = resolveSourceTextSegment(description, introSegment);

  const hasIndependentUnits = units.length > 1;

  return (
    <div className="development-detail">
      {/* Apertura — imagen real + presentación. Sin CTA acá (una sola instancia fuerte de
          consulta, al final) y sin mención de amenities sueltos (ver docs/ai/PROPERTY_UX_DECISIONS.md). */}
      <section className="project-open">
        <div className="container project-open-grid">
          {heroImage ? (
            <div className="project-open-media">
              <Image
                src={heroImage.displayUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 100vw, 600px"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          ) : null}
          <div className="project-open-copy">
            <p className="eyebrow">Desarrollo</p>
            <h1>{displayName}</h1>
            {location ? <p className="project-open-location">{location}</p> : null}
            {typeof introText === 'string' && introText ? <p className="project-open-text">{introText}</p> : null}
          </div>
        </div>
      </section>

      {editorial ? editorial.sections.map((section) => renderSection(section, sourceProperty, description)) : null}

      {hasIndependentUnits ? (
        <section className="twoclics-related-section project-units">
          <div className="container">
            <div className="twoclics-section-heading twoclics-section-heading--compact">
              <h2>Propiedades disponibles</h2>
            </div>
            <div className="twoclics-grid">
              {units.map((unit) => (
                <PropertyCard key={unit.propertyId || unit.title} property={unit} variant="overlay-catalog" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Cierre — única instancia de CTA en toda la landing. Reutiliza el mismo mecanismo de
          consulta específica que PropertyDetailView.tsx (PropertyInquiryPanel → /api/lead/message
          con property_app_id), nunca /contacto. */}
      <section className="section-sm project-cta-final">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Querés conocer más sobre {displayName}?</h2>
              <p>Coordiná una conversación con García para recibir información actualizada del desarrollo.</p>
            </div>
            <PropertyInquiryPanel
              propertyId={sourceProperty.propertyId}
              propertyTitle={displayName}
              propertyRegion={sourceProperty.region}
              label="Consultar desarrollo"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function renderSection(section: DevelopmentSection, sourceProperty: PublicProperty, description: string) {
  const images: PublicImage[] = resolveSectionImages(sourceProperty.images, section.imageIndexes);
  const segment = resolveSourceTextSegment(description, section.sourceTextSegment);
  const items = Array.isArray(segment) ? segment : [];
  const text = typeof segment === 'string' ? segment : '';
  const hasImage = images.length > 0;

  if (section.layout === 'image-large') {
    if (!hasImage) return null;
    return (
      <section key={section.key} className="project-momento">
        <div className="project-momento-frame">
          <Image
            src={images[0].displayUrl}
            alt=""
            fill
            sizes="(max-width: 1200px) 100vw, 1160px"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
      </section>
    );
  }

  if (section.layout === 'text-only') {
    if (!text) return null;
    return (
      <section key={section.key} className="project-editorial-text">
        <div className="container project-editorial-text-inner">
          {section.title ? <h2>{section.title}</h2> : null}
          <p>{text}</p>
        </div>
      </section>
    );
  }

  // image-left / image-right
  if (!items.length && !hasImage) return null;
  const modifier = section.layout === 'image-left' ? 'left' : 'right';
  return (
    <section key={section.key} className={`project-block project-block--${modifier}`}>
      <div className="container project-block-grid">
        {hasImage ? (
          <div className="project-block-media">
            <Image
              src={images[0].displayUrl}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 560px"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        ) : null}
        <div className="project-block-content">
          {section.title ? <h2>{section.title}</h2> : null}
          {items.length ? (
            <ul className="project-block-list">
              {items.map((item, index) => (
                <li key={`${section.key}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
