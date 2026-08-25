import React from 'react';
import ListingState from '@/components/properties/ListingState';
import PropertyCard from '@/components/properties/PropertyCard';
import { getFeaturedPublicProperties } from '@/lib/2clics/listings';

export function featuredGridClassName(count: number): string {
  const safeCount = Math.min(Math.max(count, 1), 4);
  return `twoclics-grid twoclics-grid--featured twoclics-grid--featured-${safeCount}`;
}

export default async function FeaturedProperties() {
  const result = await getFeaturedPublicProperties(4);
  const hasProperties = result.properties.length > 0;

  return (
    <section className="section twoclics-featured" id="oportunidades-seleccionadas">
      <div className="container">
        <div className="twoclics-section-heading">
          <span className="eyebrow">SELECCIÓN GARCÍA</span>
          <h2 className="section-title">Oportunidades seleccionadas</h2>
          <p className="section-text">
            Una selección de propiedades que García destaca por sus características y adecuación a
            distintos objetivos inmobiliarios.
          </p>
        </div>

        {hasProperties ? (
          <div className={featuredGridClassName(result.properties.length)}>
            {result.properties.map((property) => (
              <PropertyCard key={property.propertyId || property.title} property={property} variant="overlay-home" />
            ))}
          </div>
        ) : (
          <ListingState status={result.status} kind="featured" />
        )}
      </div>
    </section>
  );
}
