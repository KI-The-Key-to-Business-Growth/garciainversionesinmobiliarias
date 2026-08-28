import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import InvestmentOpportunityDetailView from '@/components/properties/InvestmentOpportunityDetailView';
import ListingState from '@/components/properties/ListingState';
import { formatLocation } from '@/lib/2clics/format';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { getInvestmentOpportunityBySlug } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

type InvestmentOpportunityPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: InvestmentOpportunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = getInvestmentOpportunityBySlug(slug);
  if (!opportunity) return { title: 'Invertir | García Inversiones Inmobiliarias' };

  const source = await getPublicPropertyById(opportunity.sourcePropertyId);
  const description = source.property ? formatLocation(source.property.location) : undefined;
  return {
    title: `${opportunity.name} | García Inversiones Inmobiliarias`,
    description,
    alternates: { canonical: `/invertir/${opportunity.slug}` },
    openGraph: {
      title: opportunity.name,
      description,
      images: source.property?.images[0]?.displayUrl ? [source.property.images[0].displayUrl] : undefined,
    },
  };
}

export default async function InvestmentOpportunityPage({ params }: InvestmentOpportunityPageProps) {
  const { slug } = await params;
  const opportunity = getInvestmentOpportunityBySlug(slug);
  if (!opportunity) notFound();

  const propertyResults = await Promise.all(
    opportunity.propertyIds.map((propertyId) => getPublicPropertyById(propertyId)),
  );
  const units = propertyResults
    .map((result) => result.property)
    .filter((property): property is PublicProperty => property !== null);
  const sourceProperty = units.find((unit) => unit.propertyId === opportunity.sourcePropertyId) || units[0] || null;

  return (
    <>
      <Header />
      <main>
        {sourceProperty ? (
          <InvestmentOpportunityDetailView opportunity={opportunity} sourceProperty={sourceProperty} units={units} />
        ) : (
          <section className="twoclics-detail-section">
            <div className="container">
              <ListingState status="error" kind="property" />
            </div>
          </section>
        )}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
