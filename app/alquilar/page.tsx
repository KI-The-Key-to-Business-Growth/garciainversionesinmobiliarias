import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CatalogView from '@/components/properties/CatalogView';
import { getPropertyCatalog } from '@/lib/2clics/listings';
import { getExcludedPropertyIds } from '@/lib/site-curation';

export const metadata: Metadata = {
  title: 'Propiedades para alquilar | García Inversiones Inmobiliarias',
  description: 'Explorá las propiedades en alquiler disponibles actualmente, seleccionadas por García Inversiones Inmobiliarias.',
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
      <main className="market-page">
        {/* WEB GARCÍA V2 (Comprar/Alquilar, octava pasada) — sin Hero interior: página funcional
            de búsqueda, no landing editorial. La sección activa ya la comunica el Header
            ("Alquilar" en dorado). H1 oculto visualmente (.sr-only) solo para accesibilidad/SEO —
            no contradice la decisión visual de no mostrar un título. */}
        <h1 className="sr-only">Propiedades para alquilar</h1>
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
