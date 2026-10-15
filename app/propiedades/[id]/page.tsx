import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import ListingState from '@/components/properties/ListingState';
import PropertyDetailView from '@/components/properties/PropertyDetailView';
import { formatPublicLocation } from '@/lib/2clics/format';
import { getPublicPropertyById, getRelatedPublicProperties } from '@/lib/2clics/listings';
import {
  getInvestmentOpportunityByPropertyId,
  getMasterCatalogExcludedPropertyIds,
  getPropertyBackLink,
} from '@/lib/site-curation';

type PropertyDetailPageProps = {
  params: Promise<{ id: string }>;
};

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params }: PropertyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const propertyId = parseId(id);
  if (!propertyId) return { title: 'Propiedad | García Inversiones Inmobiliarias' };

  const opportunity = getInvestmentOpportunityByPropertyId(propertyId);
  if (opportunity) {
    return {
      title: `${opportunity.name} | García Inversiones Inmobiliarias`,
      alternates: { canonical: `/invertir/${opportunity.slug}` },
    };
  }

  const result = await getPublicPropertyById(propertyId);
  if (!result.property) {
    return {
      title: 'Propiedad | García Inversiones Inmobiliarias',
      alternates: { canonical: `/propiedades/${propertyId}` },
    };
  }

  const property = result.property;
  const description = property.description || formatPublicLocation(property.location, property.region);
  return {
    title: `${property.title} | García Inversiones Inmobiliarias`,
    description: description || undefined,
    alternates: { canonical: `/propiedades/${propertyId}` },
    openGraph: {
      title: property.title,
      description: description || undefined,
      images: property.images[0]?.displayUrl ? [property.images[0].displayUrl] : undefined,
    },
  };
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const propertyId = parseId(id);
  if (!propertyId) notFound();

  // El registro técnico de una oportunidad de inversión no se presenta como "VENTA · CASA".
  const opportunity = getInvestmentOpportunityByPropertyId(propertyId);
  if (opportunity) permanentRedirect(`/invertir/${opportunity.slug}`);

  const result = await getPublicPropertyById(propertyId);
  const property = result.property;
  const relatedProperties = property
    ? await getRelatedPublicProperties(property, 8, { excludePropertyIds: getMasterCatalogExcludedPropertyIds() })
    : [];

  return (
    <>
      <main>
        {property ? (
          <PropertyDetailView
            property={property}
            relatedProperties={relatedProperties}
            backLink={getPropertyBackLink(property.propertyId, property.operationType)}
          />
        ) : result.status === 'not-found' ? (
          notFound()
        ) : (
          <section className="twoclics-detail-section">
            <div className="container">
              <ListingState status={result.status} kind="property" />
            </div>
          </section>
        )}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
