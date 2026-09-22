import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import InvestmentOpportunityDetailView from '@/components/properties/InvestmentOpportunityDetailView';
import ListingState from '@/components/properties/ListingState';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { getInvestmentOpportunityBySlug } from '@/lib/site-curation';

type InvestmentOpportunityPageProps = {
  params: Promise<{ slug: string }>;
};

// WEB GARCÍA V2 (Invertir, decimocuarta pasada) — `sourceProperty` (206734) es un registro
// placeholder de 2Clics ("Casa en venta en Miami", U$D 100.000), usado exclusivamente como
// vínculo técnico (imágenes reales + property_app_id para el lead) — nunca como fuente de
// title/description públicos. La metadata SEO usa el nombre editorial curado
// (`opportunity.name`) y una descripción propia, nunca `formatLocation(source.property.location)`
// ni `source.property.description` (ver lib/investments.ts para el detalle de por qué).
export async function generateMetadata({ params }: InvestmentOpportunityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = getInvestmentOpportunityBySlug(slug);
  if (!opportunity) return { title: 'Invertir | García Inversiones Inmobiliarias' };

  const source = await getPublicPropertyById(opportunity.sourcePropertyId);
  const description =
    'Una forma de participar en el desarrollo de residencias de lujo en Coconut Grove, Miami, acompañando económicamente el proyecto hasta su construcción y posterior venta.';
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
