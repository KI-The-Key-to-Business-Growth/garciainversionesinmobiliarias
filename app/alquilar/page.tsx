import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CatalogView from '@/components/properties/CatalogView';
import { getPropertyCatalog } from '@/lib/2clics/listings';
import { getExcludedPropertyIds } from '@/lib/site-curation';

export const metadata: Metadata = {
  title: 'Alquilar | García Inversiones Inmobiliarias',
  description: 'Todas las propiedades en alquiler en Buenos Aires y Miami, con filtros por mercado, tipo y precio.',
  alternates: { canonical: '/alquilar' },
};

type AlquilarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AlquilarPage({ searchParams }: AlquilarPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const catalog = await getPropertyCatalog(
    { ...resolvedSearchParams, operacion: 'alquiler' },
    { excludePropertyIds: getExcludedPropertyIds() },
  );

  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <h1>Alquilar</h1>
            <p>Propiedades en alquiler seleccionadas en Buenos Aires y Miami.</p>
          </div>
        </section>

        <section className="twoclics-catalog-section">
          <div className="container">
            <CatalogView
              catalog={catalog}
              showDevelopments={false}
              actionPath="/alquilar"
              lockedOperation="alquiler"
            />
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
