import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import FeaturedSpotlight from '@/components/properties/FeaturedSpotlight';
import ListingState from '@/components/properties/ListingState';
import { formatPublicLocation } from '@/lib/2clics/format';
import { getPublicPropertyById } from '@/lib/2clics/listings';
import { getActiveInvestmentOpportunities } from '@/lib/site-curation';
import type { InvestmentOpportunityCuration } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

export const metadata: Metadata = {
  title: 'Invertir | García Inversiones Inmobiliarias',
  description: 'Formas de inversión que García tiene efectivamente disponibles hoy.',
  alternates: { canonical: '/invertir' },
};

type OpportunityEntry = { opportunity: InvestmentOpportunityCuration; sourceProperty: PublicProperty };

const ANALYSIS_CRITERIA = [
  { label: 'Objetivo', text: 'Qué busca la persona: crecimiento, renta, diversificación o resguardo.' },
  { label: 'Mercado', text: 'Buenos Aires o Miami, y el momento particular de cada uno.' },
  { label: 'Horizonte', text: 'Plazos esperados y grado de liquidez de la operación.' },
  { label: 'Características', text: 'Condiciones concretas de la propiedad u oportunidad puntual.' },
];

async function loadOpportunities(): Promise<OpportunityEntry[]> {
  const results = await Promise.all(
    getActiveInvestmentOpportunities().map(async (opportunity) => {
      const result = await getPublicPropertyById(opportunity.sourcePropertyId);
      return result.property ? { opportunity, sourceProperty: result.property } : null;
    }),
  );
  return results.filter((entry): entry is OpportunityEntry => entry !== null);
}

export default async function InvertirPage() {
  const entries = await loadOpportunities();

  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <p className="eyebrow">Invertir</p>
            <h1>Formas de invertir con García</h1>
            <p>
              No todas las oportunidades tienen el mismo objetivo, horizonte, liquidez, estructura
              ni nivel de riesgo. García las analiza caso por caso — a veces a través de{' '}
              <Link href="/desarrollos">proyectos seleccionados</Link>, y a veces mediante
              oportunidades puntuales como las que mostramos a continuación.
            </p>
          </div>
        </section>

        <section className="twoclics-catalog-section">
          <div className="container">
            <div className="twoclics-section-heading twoclics-section-heading--compact">
              <h2>Cómo analizamos cada oportunidad</h2>
            </div>
            <div className="criteria-grid">
              {ANALYSIS_CRITERIA.map((criterion) => (
                <div className="criteria-item" key={criterion.label}>
                  <strong>{criterion.label}</strong>
                  <p>{criterion.text}</p>
                </div>
              ))}
            </div>

            <div className="twoclics-section-heading twoclics-section-heading--compact criteria-following-heading">
              <h2>Oportunidades disponibles</h2>
            </div>
            {entries.length ? (
              <div className="featured-spotlight-list featured-spotlight-list--single">
                {entries.map(({ opportunity, sourceProperty }) => (
                  <FeaturedSpotlight
                    key={opportunity.slug}
                    eyebrow="Oportunidad de inversión"
                    title={opportunity.name}
                    meta={formatPublicLocation(sourceProperty.location, sourceProperty.region)}
                    note={opportunity.note}
                    image={sourceProperty.images[0]}
                    ctaHref={`/invertir/${opportunity.slug}`}
                    ctaLabel="Conocer esta inversión"
                  />
                ))}
              </div>
            ) : (
              <ListingState status="ready" kind="catalog" filtered={false} />
            )}
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
