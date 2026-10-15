import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import InvestmentOpportunityDetailView from '@/components/properties/InvestmentOpportunityDetailView';
import ListingState from '@/components/properties/ListingState';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { getInvestmentEditorialCuration, resolveInvestmentImage } from '@/lib/investments';
import { getInvestmentOpportunityBySlug } from '@/lib/site-curation';

type InvestmentOpportunityPageProps = {
  params: Promise<{ slug: string }>;
};

// `sourceProperty` (206734) es solo el vínculo técnico (imágenes + property_app_id para el lead).
// La metadata usa el nombre y el intro curados — nunca el título, tipo o descripción del registro.
export async function generateMetadata({ params }: InvestmentOpportunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = getInvestmentOpportunityBySlug(slug);
  if (!opportunity) return { title: 'Invertir | García Inversiones Inmobiliarias' };

  const source = await getPublicPropertyById(opportunity.sourcePropertyId);
  const curation = getInvestmentEditorialCuration(opportunity.slug);
  const description = curation?.intro;
  const image = curation && source.property ? resolveInvestmentImage(source.property.images, curation.openingImage) : null;
  return {
    title: `${opportunity.name} | García Inversiones Inmobiliarias`,
    description,
    alternates: { canonical: `/invertir/${opportunity.slug}` },
    openGraph: {
      title: opportunity.name,
      description,
      images: image ? [image.displayUrl] : undefined,
    },
  };
}

export default async function InvestmentOpportunityPage({ params }: InvestmentOpportunityPageProps) {
  const { slug } = await params;
  const opportunity = getInvestmentOpportunityBySlug(slug);
  if (!opportunity) notFound();

  const result = await getPublicPropertyById(opportunity.sourcePropertyId);
  const sourceProperty = result.property;

  return (
    <>
      <Header />
      <main>
        {sourceProperty ? (
          <InvestmentOpportunityDetailView
            opportunity={opportunity}
            source={{
              propertyId: sourceProperty.propertyId,
              region: sourceProperty.region,
              images: sourceProperty.images,
            }}
          />
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
