import React from 'react';
import Link from 'next/link';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyDescription from '@/components/properties/PropertyDescription';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertyMap from '@/components/properties/PropertyMap';
import { formatArea, formatLocation, formatPublicLocation } from '@/lib/2clics/format';
import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

type CuratedDevelopmentDetailViewProps = {
  curation: DevelopmentCuration;
  sourceProperty: PublicProperty;
  units: PublicProperty[];
};

const UNITS_ANCHOR = 'propiedades-disponibles';

// Landing de PROYECTO (WEB GARCÍA V2, tercera pasada) — no una ficha de propiedad reciclada.
// Todo el contenido (fotos/descripción/ubicación/amenities/video/superficies) sale de
// `sourceProperty`, una propiedad real de 2Clics — el único dato editorial que no viene de la
// API es `curation.name`. No se inventa developer, forma de pago, etapa ni disponibilidad: si
// 2Clics no trae ese dato, esta vista tampoco lo muestra. Cada unidad de "Propiedades
// disponibles" linkea a su ficha canónica `/propiedades/[id]` — esta landing nunca la reproduce.
export default function CuratedDevelopmentDetailView({
  curation,
  sourceProperty,
  units,
}: CuratedDevelopmentDetailViewProps) {
  const location = formatPublicLocation(sourceProperty.location, sourceProperty.region);
  const mapLocation = formatLocation(sourceProperty.location);
  const videoUrl = sourceProperty.metadata.videoUrl || '';
  const typeName = sourceProperty.propertyType?.name || '';
  const totalArea = formatArea(sourceProperty.totalArea);

  // Solo datos confirmados — nunca developer/etapa/forma de pago inventados.
  const highlights = [
    typeName ? { label: 'Tipo', value: typeName } : null,
    totalArea ? { label: 'Superficie total', value: totalArea } : null,
    units.length ? { label: 'Unidades disponibles', value: String(units.length) } : null,
  ].filter((entry): entry is { label: string; value: string } => entry !== null);

  return (
    <>
      {/* A. Hero de proyecto */}
      <section className="twoclics-detail-hero">
        <div className="container twoclics-detail-hero-inner">
          <div>
            <p className="eyebrow">Proyecto</p>
            <h1>{curation.name}</h1>
            {location ? <p className="twoclics-detail-location">{location}</p> : null}
            {units.length ? (
              <Link className="btn btn-primary project-hero-cta" href={`#${UNITS_ANCHOR}`}>
                Ver propiedades disponibles
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="twoclics-detail-section">
        <div className="container twoclics-detail-layout twoclics-detail-layout--single">
          <main className="twoclics-detail-main">
            {/* B. Sobre el proyecto */}
            {sourceProperty.description ? (
              <section className="twoclics-detail-panel">
                <h2>Sobre el proyecto</h2>
                <PropertyDescription text={sourceProperty.description} />
              </section>
            ) : null}

            {/* C. Datos confirmados */}
            {highlights.length ? (
              <section className="twoclics-detail-panel">
                <h2>Datos del proyecto</h2>
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

            {/* D. Galería */}
            <PropertyGallery images={sourceProperty.images} title={curation.name} />

            {/* E. Amenities */}
            {sourceProperty.amenities.length ? (
              <section className="twoclics-detail-panel">
                <h2>Amenities y servicios</h2>
                <ul className="twoclics-chip-list twoclics-chip-list--compact">
                  {sourceProperty.amenities.map((amenity) =>
                    amenity.name ? <li key={`${amenity.amenitieId || amenity.name}`}>{amenity.name}</li> : null,
                  )}
                </ul>
              </section>
            ) : null}

            {videoUrl ? (
              <section className="twoclics-detail-panel">
                <h2>Video</h2>
                <a className="btn btn-outline" href={videoUrl} target="_blank" rel="noopener">
                  Ver video
                </a>
              </section>
            ) : null}

            <PropertyMap
              title={curation.name}
              lat={sourceProperty.lat}
              long={sourceProperty.long}
              address={sourceProperty.address}
              number={sourceProperty.number}
              location={sourceProperty.location}
              locationText={mapLocation}
            />
          </main>
        </div>
      </section>

      {/* F. Propiedades disponibles */}
      <section className="twoclics-related-section" id={UNITS_ANCHOR}>
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

      {/* G. CTA final */}
      <section className="section-sm">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Querés conocer más sobre {curation.name}?</h2>
              <p>Coordiná una conversación con García para recibir información actualizada del proyecto.</p>
            </div>
            <a
              className="btn btn-primary"
              href="https://wa.me/5491167240353"
              target="_blank"
              rel="noopener"
              data-whatsapp-location="desarrollo"
            >
              Hablar con un asesor
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
