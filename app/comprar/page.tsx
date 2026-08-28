import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CatalogView from '@/components/properties/CatalogView';
import { getPropertyCatalog } from '@/lib/2clics/listings';
import { getExcludedPropertyIds } from '@/lib/site-curation';

export const metadata: Metadata = {
  title: 'Comprar | García Inversiones Inmobiliarias',
  description: 'Todas las propiedades en venta en Buenos Aires y Miami, con filtros por mercado, tipo y precio.',
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
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <h1>Comprar</h1>
            <p>Propiedades en venta seleccionadas en Buenos Aires y Miami.</p>
          </div>
        </section>

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
