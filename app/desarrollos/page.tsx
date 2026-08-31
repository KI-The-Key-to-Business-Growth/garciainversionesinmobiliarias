import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CuratedDevelopmentCard from '@/components/properties/CuratedDevelopmentCard';
import ListingState from '@/components/properties/ListingState';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { DEVELOPMENTS } from '@/lib/site-curation';
import type { CuratedEntry } from '@/lib/desarrollos';

export const metadata: Metadata = {
  title: 'Desarrollos | García Inversiones Inmobiliarias',
  description: 'Proyectos seleccionados por García en sus mercados activos.',
  alternates: { canonical: '/desarrollos' },
};

// Si la propiedad fuente de un proyecto no está disponible (error/no configurado), ese proyecto
// se omite en silencio de la grilla en vez de mostrar una card rota — misma postura de no
// inventar datos que ya usa el resto del catálogo.
async function loadCuratedDevelopments(): Promise<CuratedEntry[]> {
  const results = await Promise.all(
    DEVELOPMENTS.map(async (curation) => {
      const result = await getPublicPropertyById(curation.sourcePropertyId);
      return result.property ? { curation, sourceProperty: result.property } : null;
    }),
  );
  return results.filter((entry): entry is CuratedEntry => entry !== null);
}

// WEB GARCÍA V2 (Desarrollos, décima pasada; card y grilla ajustadas en la undécima) — catálogo
// visual de proyectos, no landing editorial. Sin Hero navy (la revisión visual no lo aprobó; la
// sección activa del Header ya comunica "Desarrollos"), sin mapa, sin filtros todavía (no hay
// datos de status pre-construction/under construction/etc. oficialmente confirmados para
// construirlos), sin contador "N proyecto(s)" (undécima pasada: información innecesaria — la
// grilla ya lo comunica). Reutiliza `.twoclics-grid`, el mismo sistema de 3 columnas/densidad que
// ya usan Comprar/Alquilar/`/propiedades` — una sola card hoy ocupa una celda normal, sin
// estirarse a media página. `FeaturedSpotlight` no se borró como componente — sigue en uso en
// `/invertir`, fuera de esta pasada.
export default async function DesarrollosPage() {
  const entries = await loadCuratedDevelopments();

  return (
    <>
      <Header />
      <main>
        {/* H1 oculto visualmente — sin Hero visible, pero con semántica de encabezado de página
            para accesibilidad/SEO (mismo criterio que Comprar/Alquilar). */}
        <h1 className="sr-only">Desarrollos</h1>
        <section className="twoclics-catalog-section">
          <div className="container">
            {!entries.length ? (
              <ListingState status="ready" kind="catalog" filtered={false} />
            ) : (
              <div className="twoclics-grid">
                {entries.map(({ curation, sourceProperty }) => (
                  <CuratedDevelopmentCard key={curation.slug} curation={curation} sourceProperty={sourceProperty} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
