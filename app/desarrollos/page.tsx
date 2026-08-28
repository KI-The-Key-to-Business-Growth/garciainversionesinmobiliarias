import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CuratedDevelopmentCard from '@/components/properties/CuratedDevelopmentCard';
import FeaturedSpotlight from '@/components/properties/FeaturedSpotlight';
import ListingState from '@/components/properties/ListingState';
import { formatPublicLocation } from '@/lib/2clics/format';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { DEVELOPMENTS } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';
import type { DevelopmentCuration } from '@/lib/site-curation';

export const metadata: Metadata = {
  title: 'Desarrollos | García Inversiones Inmobiliarias',
  description: 'Proyectos seleccionados por García en Buenos Aires y Miami.',
  alternates: { canonical: '/desarrollos' },
};

type CuratedEntry = { curation: DevelopmentCuration; sourceProperty: PublicProperty };

// Extracto real de la descripción pública de 2Clics para la spotlight del índice — nunca la
// descripción completa (eso queda para /desarrollos/[slug]), nunca texto inventado.
function excerpt(text: string, maxLength = 200): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}…`;
}

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

export default async function DesarrollosPage() {
  const entries = await loadCuratedDevelopments();
  // Con pocos proyectos, una presentación editorial de mayor escala se lee mejor que una grilla
  // chica perdida en espacio vacío — a partir de 3 proyectos pasa a grilla estándar.
  const useFeaturedLayout = entries.length > 0 && entries.length <= 2;

  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <p className="eyebrow">Desarrollos</p>
            <h1>Proyectos seleccionados</h1>
            <p>Proyectos en Buenos Aires y Miami que acompañamos de cerca, con unidades disponibles.</p>
          </div>
        </section>

        <section className="twoclics-catalog-section">
          <div className="container">
            {!entries.length ? (
              <ListingState status="ready" kind="catalog" filtered={false} />
            ) : useFeaturedLayout ? (
              <div className="featured-spotlight-list featured-spotlight-list--single">
                {entries.map(({ curation, sourceProperty }) => (
                  <FeaturedSpotlight
                    key={curation.slug}
                    eyebrow="Proyecto"
                    title={curation.name}
                    meta={formatPublicLocation(sourceProperty.location, sourceProperty.region)}
                    note={sourceProperty.description ? excerpt(sourceProperty.description) : undefined}
                    image={sourceProperty.images[0]}
                    ctaHref={`/desarrollos/${curation.slug}`}
                    ctaLabel="Conocer proyecto"
                  />
                ))}
              </div>
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
