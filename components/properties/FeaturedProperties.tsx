import React from 'react';
import ListingState from '@/components/properties/ListingState';
import PropertyCard from '@/components/properties/PropertyCard';
import { getFeaturedPublicProperties } from '@/lib/2clics/listings';
import { getExcludedPropertyIds } from '@/lib/site-curation';

export function featuredGridClassName(count: number): string {
  const safeCount = Math.min(Math.max(count, 1), 4);
  return `twoclics-grid twoclics-grid--featured twoclics-grid--featured-${safeCount}`;
}

export default async function FeaturedProperties() {
  const result = await getFeaturedPublicProperties(4, { excludePropertyIds: getExcludedPropertyIds() });
  const hasProperties = result.properties.length > 0;

  // Sin propiedades tradicionales destacadas en 2Clics, la sección no existe en la Home (ni
  // título ni estado vacío). Reaparece sola cuando haya al menos una elegible. Un error/falta de
  // configuración sí se informa — nunca se presenta una caída del proveedor como "no hay nada".
  if (!hasProperties && result.status === 'ready') return null;

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
