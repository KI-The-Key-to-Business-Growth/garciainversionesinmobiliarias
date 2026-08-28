import React from 'react';
import Link from 'next/link';
import ListingImage from '@/components/properties/ListingImage';
import { formatPublicLocation } from '@/lib/2clics/format';
import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

type CuratedDevelopmentCardProps = {
  curation: DevelopmentCuration;
  sourceProperty: PublicProperty;
};

// Card de un DESARROLLO curado (grupo de propertyIds normales), no de una propiedad suelta —
// por eso el badge dice "Proyecto/Desarrollo" en vez de Venta/Alquiler/Destacada como
// `PropertyCard`, para que quede claro que se está mostrando una agrupación editorial, no una
// ficha estándar. Los datos (foto/ubicación) vienen 100% de `sourceProperty` (2Clics real) — el
// único dato inventado acá es el nombre editorial del grupo (`curation.name`).
export default function CuratedDevelopmentCard({ curation, sourceProperty }: CuratedDevelopmentCardProps) {
  const href = `/desarrollos/${curation.slug}`;
  const location = formatPublicLocation(sourceProperty.location, sourceProperty.region);
  const unitCount = curation.propertyIds.length;

  return (
    <article className="twoclics-card twoclics-card--development">
      <Link href={href} className="twoclics-card-media" aria-label={`Ver ${curation.name}`}>
        <ListingImage image={sourceProperty.images[0]} alt={curation.name} />
        <div className="twoclics-card-badges">
          <span>Proyecto / Desarrollo</span>
        </div>
      </Link>

      <div className="twoclics-card-body">
        <h3>
          <Link href={href}>{curation.name}</Link>
        </h3>
        {location ? <p className="twoclics-card-location">{location}</p> : null}
        <p className="twoclics-card-facts">
          {unitCount === 1 ? '1 propiedad asociada' : `${unitCount} propiedades asociadas`}
        </p>
        <Link href={href} className="btn btn-dark twoclics-card-cta">
          Ver proyecto
        </Link>
      </div>
    </article>
  );
}
