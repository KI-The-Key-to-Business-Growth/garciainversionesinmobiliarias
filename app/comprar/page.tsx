import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CatalogView from '@/components/properties/CatalogView';
import { getPropertyCatalog } from '@/lib/2clics/listings';
import { getExcludedPropertyIds } from '@/lib/site-curation';

export const metadata: Metadata = {
  title: 'Propiedades para comprar | García Inversiones Inmobiliarias',
  description: 'Explorá propiedades disponibles en Buenos Aires y Miami, seleccionadas por García Inversiones Inmobiliarias.',
  alternates: { canonical: '/comprar' },
};

type ComprarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ComprarPage({ searchParams }: ComprarPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  // Operación siempre Venta acá, sin importar qué traiga la URL — reutiliza el mismo motor de
  // /propiedades (`getPropertyCatalog`), solo forzando este filtro y excluyendo lo curado.
  const catalog = await getPropertyCatalog(
    { ...resolvedSearchParams, operacion: 'venta' },
    { excludePropertyIds: getExcludedPropertyIds() },
  );

  return (
    <>
      <Header />
      <main className="market-page">
        {/* WEB GARCÍA V2 (Comprar/Alquilar, octava pasada) — sin Hero interior: página funcional
            de búsqueda, no landing editorial. La sección activa ya la comunica el Header
            ("Comprar" en dorado). H1 oculto visualmente (.sr-only) solo para accesibilidad/SEO —
            no contradice la decisión visual de no mostrar un título. */}
        <h1 className="sr-only">Propiedades para comprar</h1>
        <section className="twoclics-catalog-section">
          <div className="container">
            <CatalogView
              catalog={catalog}
              showDevelopments={false}
              actionPath="/comprar"
              lockedOperation="venta"
            />
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
