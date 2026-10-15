import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CatalogView from '@/components/properties/CatalogView';
import { getPropertyCatalog } from '@/lib/2clics/listings';
import { getMasterCatalogExcludedPropertyIds } from '@/lib/site-curation';

export const metadata: Metadata = {
  title: 'Propiedades | García Inversiones Inmobiliarias',
  description: 'Propiedades y desarrollos seleccionados en Buenos Aires y Miami.',
  alternates: { canonical: '/propiedades' },
};

type PropiedadesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PropiedadesPage({ searchParams }: PropiedadesPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const catalog = await getPropertyCatalog(resolvedSearchParams, {
    excludePropertyIds: getMasterCatalogExcludedPropertyIds(),
  });
  const showDevelopments =
    catalog.filters.operation === 'all' && catalog.filters.propertyTypeId === null;

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
            <CatalogView catalog={catalog} showDevelopments={showDevelopments} />
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
