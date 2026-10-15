import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CuratedDevelopmentCard from '@/components/properties/CuratedDevelopmentCard';
import DesarrollosMarketTabs from '@/components/properties/DesarrollosMarketTabs';
import ListingState from '@/components/properties/ListingState';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { resolveDevelopmentAssets } from '@/lib/development-assets';
import { DEVELOPMENTS } from '@/lib/site-curation';
import { getDevelopmentEditorialCuration, toDevelopmentCardSource } from '@/lib/desarrollos';
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
      if (!result.property) return null;
      // `cardImageIndex` (vigesimotercera pasada, FASE 3): cada desarrollo con curaduría editorial
      // propia decide qué imagen real cumple la función de portada del índice — nunca
      // `images[0]` a ciegas. Sin curaduría editorial, degrada al mismo fallback de siempre.
      const editorial = getDevelopmentEditorialCuration(curation.slug);
      const source = toDevelopmentCardSource(result.property, curation.publicName, editorial?.cardImageIndex);
      // Un hero editorial local (render oficial), cuando existe, también es la portada de la card.
      const heroAsset = resolveDevelopmentAssets(curation.slug).hero?.[0];
      if (heroAsset) {
        source.image = {
          id: heroAsset.src,
          name: '',
          url: heroAsset.src,
          thumbnailUrl: heroAsset.src,
          displayUrl: heroAsset.src,
          displayThumbnailUrl: heroAsset.src,
          useVirtualized: false,
        };
      }
      return { curation, source };
    }),
  );
  return results.filter((entry): entry is CuratedEntry => entry !== null);
}

// Grilla compacta de un mercado — extraída para no repetir el condicional grilla/empty-state entre
// US y AR. `emptyMessage` es el único texto editorial que cambia por mercado.
function MarketGrid({ entries, emptyMessage }: { entries: CuratedEntry[]; emptyMessage: string }) {
  if (!entries.length) {
    return (
      <div className="desarrollos-empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="desarrollos-grid">
      {entries.map(({ curation, source }) => (
        <CuratedDevelopmentCard key={curation.slug} curation={curation} source={source} variant="compact" />
      ))}
    </div>
  );
}

// WEB GARCÍA V2 (Desarrollos, décima pasada; card y grilla ajustadas en la undécima; apertura
// editorial + selector de mercado + grilla compacta en la decimonovena) — catálogo visual de
// proyectos, no landing editorial. Sin mapa, sin filtros de status todavía (no hay datos
// pre-construction/under construction/etc. oficialmente confirmados). El selector US/Argentina
// filtra por el campo explícito `curation.market` (lib/site-curation.ts) — nunca por texto de
// título/ubicación cruda de la fuente. Ambos paneles se resuelven server-side (una sola carga de
// datos) y se le pasan ya renderizados a `DesarrollosMarketTabs` (Client Component): el toggle de
// mercado es un cambio de estado local instantáneo, sin fetch ni reload. `FeaturedSpotlight` no se
// borró como componente — sigue en uso en `/invertir`, fuera de esta pasada.
export default async function DesarrollosPage() {
  const entries = await loadCuratedDevelopments();
  const usEntries = entries.filter(({ curation }) => curation.market === 'US');
  const arEntries = entries.filter(({ curation }) => curation.market === 'AR');

  return (
    <>
      <Header />
      <main>
        <section className="desarrollos-intro">
          <div className="container desarrollos-intro-inner">
            <h1>Desarrollos seleccionados</h1>
            <p>
              Proyectos que analizamos por su ubicación, propuesta, producto y adecuación a distintos
              objetivos de compra e inversión.
            </p>
          </div>
        </section>
        <section className="twoclics-catalog-section">
          <div className="container">
            {!entries.length ? (
              <ListingState status="ready" kind="catalog" filtered={false} />
            ) : (
              <DesarrollosMarketTabs
                defaultTabId="US"
                tabs={[
                  {
                    id: 'US',
                    label: 'Estados Unidos',
                    content: (
                      <MarketGrid
                        entries={usEntries}
                        emptyMessage="Estamos preparando nuestra selección de desarrollos en Estados Unidos."
                      />
                    ),
                  },
                  {
                    id: 'AR',
                    label: 'Argentina',
                    content: (
                      <MarketGrid
                        entries={arEntries}
                        emptyMessage="Estamos preparando nuestra selección de desarrollos en Argentina."
                      />
                    ),
                  },
                ]}
              />
            )}
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
