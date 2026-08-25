import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import DevelopmentDetailView from '@/components/properties/DevelopmentDetailView';
import ListingState from '@/components/properties/ListingState';
import { formatLocation } from '@/lib/2clics/format';
import { getPublicDevelopmentById } from '@/lib/2clics/listings';

type DevelopmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params }: DevelopmentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const developmentId = parseId(id);
  if (!developmentId) return { title: 'Desarrollo | García Inversiones Inmobiliarias' };

  const result = await getPublicDevelopmentById(developmentId);
  if (!result.development) {
    return {
      title: 'Desarrollo | García Inversiones Inmobiliarias',
      alternates: { canonical: `/desarrollos/${developmentId}` },
    };
  }

  const development = result.development;
  const description = development.description || formatLocation(development.location);
  return {
    title: `${development.title} | García Inversiones Inmobiliarias`,
    description: description || undefined,
    alternates: { canonical: `/desarrollos/${developmentId}` },
    openGraph: {
      title: development.title,
      description: description || undefined,
      images: development.images[0]?.displayUrl ? [development.images[0].displayUrl] : undefined,
    },
  };
}

export default async function DevelopmentDetailPage({ params }: DevelopmentDetailPageProps) {
  const { id } = await params;
  const developmentId = parseId(id);
  if (!developmentId) notFound();

  const result = await getPublicDevelopmentById(developmentId);
  const development = result.development;

  return (
    <>
      <Header />
      <main>
        {development ? (
          <DevelopmentDetailView development={development} />
        ) : result.status === 'not-found' ? (
          notFound()
        ) : (
          <section className="twoclics-detail-section">
            <div className="container">
              <ListingState status={result.status} kind="development" />
            </div>
          </section>
        )}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
