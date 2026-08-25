import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import DevelopmentCard from '@/components/properties/DevelopmentCard';
import ListingState from '@/components/properties/ListingState';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyFilters from '@/components/properties/PropertyFilters';
import { getPropertyCatalog, nextPageHref } from '@/lib/2clics/listings';

export const metadata: Metadata = {
  title: 'Propiedades | García Inversiones Inmobiliarias',
  description: 'Propiedades y desarrollos seleccionados en Buenos Aires y Miami.',
  alternates: { canonical: '/propiedades' },
};

type PropiedadesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resultCountLabel(count: number): string {
  return count === 1 ? '1 resultado' : `${count} resultados`;
}

export default async function PropiedadesPage({ searchParams }: PropiedadesPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const catalog = await getPropertyCatalog(resolvedSearchParams);
  const showDevelopments =
    catalog.filters.operation === 'all' && catalog.filters.propertyTypeId === null;
  const visibleDevelopments = showDevelopments ? catalog.developments : [];
  const hasResults = catalog.properties.length > 0 || visibleDevelopments.length > 0;
  const hasActiveFilters =
    catalog.filters.location !== 'all' ||
    catalog.filters.operation !== 'all' ||
    catalog.filters.propertyTypeId !== null ||
    catalog.filters.bedrooms !== null ||
    catalog.filters.rooms !== null ||
    catalog.filters.aptoCredito ||
    Boolean(catalog.filters.price.currency) ||
    catalog.filters.price.min !== null ||
    catalog.filters.price.max !== null;

  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero">
          <div className="container">
            <h1>Propiedades seleccionadas</h1>
            <p>
              Explorá propiedades y desarrollos en Buenos Aires y Miami. Cada alternativa se
              presenta con información clara para que puedas evaluar qué tiene sentido según tu
              objetivo.
            </p>
          </div>
        </section>

        <section className="twoclics-catalog-section">
          <div className="container">
            <PropertyFilters
              filters={catalog.filters}
              propertyTypes={catalog.propertyTypes}
              availableLocations={catalog.availableLocations}
              availableOperations={catalog.availableOperations}
              priceFacet={catalog.priceFacet}
              resolvedPrice={catalog.resolvedPrice}
            />

            {hasResults ? (
              <>
                {catalog.properties.length ? (
                  <div className="twoclics-listing-block">
                    <div className="twoclics-section-heading twoclics-section-heading--compact">
                      <div className="twoclics-listing-heading-row">
                        <h2>Propiedades</h2>
                        {/* propertyTotalCount === null: la API no dio un total confiable para
                            algún bucket (más allá de la normalización de "0 legítimo" en
                            propertyResponseCount). En vez de no mostrar nada, feedback estable
                            y honesto — nunca se inventa un número. */}
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
                        <a className="btn btn-outline" href={nextPageHref(catalog.filters)}>
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
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
