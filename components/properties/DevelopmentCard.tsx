import React from 'react';
import Link from 'next/link';
import ListingImage from '@/components/properties/ListingImage';
import {
  compactText,
  developmentHref,
  formatLocation,
} from '@/lib/2clics/format';
import type { PublicDevelopment } from '@/lib/2clics/types';

type DevelopmentCardProps = {
  development: PublicDevelopment;
};

export default function DevelopmentCard({ development }: DevelopmentCardProps) {
  const href = developmentHref(development);
  const location = formatLocation(development.location);
  const status = development.status?.name || '';
  const type = development.type?.name || '';
  const meta = [type, status].filter(Boolean);

  return (
    <article className="twoclics-card twoclics-card--development">
      <Link href={href} className="twoclics-card-media" aria-label={`Ver desarrollo ${development.title}`}>
        <ListingImage image={development.images[0]} alt={development.title} />
        <div className="twoclics-card-badges">
          <span>Desarrollo</span>
          {status ? <span>{status}</span> : null}
        </div>
      </Link>

      <div className="twoclics-card-body">
        <div className="twoclics-card-meta">
          {development.marketLabel ? <span>{development.marketLabel}</span> : null}
        </div>
        <h3>
          <Link href={href}>{development.title}</Link>
        </h3>
        {location ? <p className="twoclics-card-location">{location}</p> : null}
        {meta.length ? <p className="twoclics-card-facts">{compactText(meta)}</p> : null}
        {development.properties.length ? (
          <p className="twoclics-card-facts">
            {development.properties.length === 1
              ? '1 unidad asociada'
              : `${development.properties.length} unidades asociadas`}
          </p>
        ) : null}
        <Link href={href} className="btn btn-dark twoclics-card-cta">
          Ver desarrollo
        </Link>
      </div>
    </article>
  );
}
