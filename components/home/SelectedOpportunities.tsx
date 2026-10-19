import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { loadHomeSelection, type HomeSelectionCard } from '@/lib/home-selection';

// "Oportunidades seleccionadas" — selección editorial del Home, inmediatamente después del Hero.
// La lista y su orden viven en lib/home-selection.ts (curaduría manual, no inventario). Cada card:
// imagen protagonista, rótulo (Desarrollo / Oportunidad de inversión), nombre, ubicación,
// descriptor editorial ya validado y CTA a su landing. Sin precios, badges ni claims.
export function SelectedOpportunitiesView({ cards }: { cards: HomeSelectionCard[] }) {
  if (!cards.length) return null;

  return (
    <section className="home-selection" id="oportunidades-seleccionadas">
      <div className="container">
        <div className="home-selection-heading reveal">
          <h2>Oportunidades seleccionadas</h2>
          <p>Una selección de propiedades y oportunidades que estamos analizando y trabajando actualmente.</p>
        </div>
        <ul className={`home-selection-grid home-selection-grid--${cards.length} reveal`}>
          {cards.map((card) => (
            <li key={card.key} className="home-selection-item">
              <Link className={`home-selection-card home-selection-card--${card.kind}`} href={card.href}>
                <div className="home-selection-media">
                  {card.image ? (
                    <Image
                      src={card.image.src}
                      alt={card.name}
                      fill
                      sizes="(max-width: 680px) 84vw, (max-width: 1020px) 50vw, 400px"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                    />
                  ) : null}
                  {card.image?.tag ? <span className="project-media-tag">{card.image.tag}</span> : null}
                </div>
                <div className="home-selection-body">
                  <p className="home-selection-kicker">{card.kicker}</p>
                  <h3>{card.name}</h3>
                  <p className="home-selection-location">{card.location}</p>
                  {card.descriptor ? <p className="home-selection-text">{card.descriptor}</p> : null}
                  <span className="home-selection-cta">
                    {card.ctaLabel} <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default async function SelectedOpportunities() {
  const cards = await loadHomeSelection();
  return <SelectedOpportunitiesView cards={cards} />;
}
