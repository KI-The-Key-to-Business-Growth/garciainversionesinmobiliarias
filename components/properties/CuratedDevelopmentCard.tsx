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

// Card de proyecto para /desarrollos (décima pasada — catálogo visual, ya no spotlight/grilla
// separadas). Imagen protagonista + un único link accesible cubriendo toda la card (mismo patrón
// ya aprobado en PropertyCard overlay: "toda la card es un único <Link>"). Solo datos respaldados:
// imagen + nombre editorial + ubicación pública (2Clics real) + slug curado
// (lib/site-curation.ts). Deliberadamente SIN precio/unidades/año/estado/developer/fecha de
// entrega/rentabilidad/payment plan — García no tiene esos datos oficialmente confirmados hoy, y
// esta card no debe insinuarlos aunque sitios de referencia (developers/brokers) sí los muestren.
export default function CuratedDevelopmentCard({ curation, sourceProperty }: CuratedDevelopmentCardProps) {
  const href = `/desarrollos/${curation.slug}`;
  const location = formatPublicLocation(sourceProperty.location, sourceProperty.region);
  // Nombre real de la fuente (2Clics) — no `curation.name` (nombre editorial interno, ver
  // lib/site-curation.ts), duodécima pasada.
  const displayName = sourceProperty.title || curation.name;

  return (
    <article className="twoclics-card twoclics-card--development">
      <Link href={href} className="development-card-link">
        <div className="development-card-media">
          <ListingImage image={sourceProperty.images[0]} alt="" />
        </div>
        <div className="development-card-body">
          <span className="development-card-eyebrow">Desarrollo</span>
          <h3>{displayName}</h3>
          {location ? <p className="development-card-location">{location}</p> : null}
        </div>
      </Link>
    </article>
  );
}
