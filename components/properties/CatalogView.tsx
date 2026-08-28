import React from 'react';
import DevelopmentCard from '@/components/properties/DevelopmentCard';
import ListingState from '@/components/properties/ListingState';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyFilters from '@/components/properties/PropertyFilters';
import { nextPageHref } from '@/lib/2clics/listings';
import type { PropertyCatalogResult } from '@/lib/2clics/listings';

type CatalogViewProps = {
  catalog: PropertyCatalogResult;
  showDevelopments: boolean;
  // WEB GARCÍA V2 — ver PropertyFilters.tsx. Sin pasarlos, se comporta exactamente como el
  // `/propiedades` original (motor/markup sin cambios, solo relocado a un componente compartido
  // para que /comprar y /alquilar puedan reutilizarlo sin duplicar esta sección).
  actionPath?: string;
  lockedOperation?: 'venta' | 'alquiler';
};

function resultCountLabel(count: number): string {
  return count === 1 ? '1 resultado' : `${count} resultados`;
}

export default function CatalogView({
  catalog,
  showDevelopments,
  actionPath,
  lockedOperation,
}: CatalogViewProps) {
  const visibleDevelopments = showDevelopments ? catalog.developments : [];
  const hasResults = catalog.properties.length > 0 || visibleDevelopments.length > 0;
  const hasActiveFilters =
    catalog.filters.location !== 'all' ||
    (!lockedOperation && catalog.filters.operation !== 'all') ||
    catalog.filters.propertyTypeId !== null ||
    catalog.filters.bedrooms !== null ||
    catalog.filters.rooms !== null ||
    catalog.filters.aptoCredito ||
    Boolean(catalog.filters.price.currency) ||
    catalog.filters.price.min !== null ||
    catalog.filters.price.max !== null;

  return (
    <>
      <PropertyFilters
        filters={catalog.filters}
        propertyTypes={catalog.propertyTypes}
        availableLocations={catalog.availableLocations}
        availableOperations={catalog.availableOperations}
        priceFacet={catalog.priceFacet}
        resolvedPrice={catalog.resolvedPrice}
        actionPath={actionPath}
        lockedOperation={lockedOperation}
      />

      {hasResults ? (
        <>
          {catalog.properties.length ? (
            <div className="twoclics-listing-block">
              <div className="twoclics-section-heading twoclics-section-heading--compact">
                <div className="twoclics-listing-heading-row">
                  <h2>Propiedades</h2>
                  {/* propertyTotalCount === null: la API no dio un total confiable para algún
                      bucket. En vez de no mostrar nada, feedback estable y honesto — nunca se
                      inventa un número. */}
                  <span>
                    {catalog.propertyTotalCount !== null
                      ? resultCountLabel(catalog.propertyTotalCount)
                      : 'Resultados filtrados'}
                  </span>
                </div>
              </div>
              <div className="twoclics-grid">
                {catalog.properties.map((property) => (
                  <PropertyCard
                    key={property.propertyId || property.title}
                    property={property}
                    variant="overlay-catalog"
                  />
                ))}
              </div>
              {catalog.hasMore ? (
                <div className="twoclics-pagination">
                  <a className="btn btn-outline" href={nextPageHref(catalog.filters, actionPath)}>
                    Ver más
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          {visibleDevelopments.length ? (
            <div className="twoclics-listing-block">
              <div className="twoclics-section-heading twoclics-section-heading--compact">
                <h2>Desarrollos</h2>
              </div>
              <div className="twoclics-grid">
                {visibleDevelopments.map((development) => (
                  <DevelopmentCard
                    key={development.developmentId || development.title}
                    development={development}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <ListingState
          status={catalog.status}
          kind="catalog"
          filtered={catalog.status === 'ready' && hasActiveFilters}
        />
      )}
    </>
  );
}
