import React from 'react';
import Link from 'next/link';
import ListingImage from '@/components/properties/ListingImage';
import type { PublicImage } from '@/lib/2clics/types';

type FeaturedSpotlightProps = {
  eyebrow: string;
  title: string;
  meta?: string;
  note?: string;
  image: PublicImage | null | undefined;
  ctaHref: string;
  ctaLabel: string;
};

// Presentación editorial de mayor escala — usada tanto por /desarrollos (proyecto destacado)
// como por /invertir (oportunidad de inversión confirmada). Todo el contenido (foto/meta) viene
// de una propiedad real de 2Clics salvo `note`, que es copy editorial explícitamente configurado
// en `lib/site-curation.ts` — nunca texto inventado en este componente.
export default function FeaturedSpotlight({
  eyebrow,
  title,
  meta,
  note,
  image,
  ctaHref,
  ctaLabel,
}: FeaturedSpotlightProps) {
  return (
    <article className="featured-spotlight">
      <div className="featured-spotlight-media">
        <ListingImage image={image} alt={title} />
      </div>
      <div className="featured-spotlight-body">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {meta ? <p className="featured-spotlight-meta">{meta}</p> : null}
        {note ? <p className="featured-spotlight-note">{note}</p> : null}
        <Link className="btn btn-primary" href={ctaHref}>
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
