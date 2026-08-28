import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

// HERO — imagen única condor-resort con filtro saturate(1.35) brightness(1.05) (vía .hero-slide en globals.css).
// next/image con priority (LCP) + fill; el filtro de .hero-slide se aplica sobre la imagen.
// Título con split de color: línea 1 blanca, "visión estratégica" en dorado (.accent).
// WEB GARCÍA V2 (cuarta pasada — Home): el buscador libre (HeroSearch) no quedó aprobado para
// esta etapa y se retiró — Hero vuelve a la versión limpia (título/bajada/CTA humano). El CTA
// "Hablar con un asesor" no abre WhatsApp: lleva a la landing de contacto (`/contacto`, mismo
// destino que usa el botón "Contacto" del Header — ver docs/ai/WEB_GARCIA_V2.md). Quinta pasada:
// antes apuntaba a `/#contacto` (sección del Home); ahora Contacto es una página propia.
export default function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-slides" aria-hidden="true">
        <div className="hero-slide active">
          <Image
            src="/assets/propiedades/condor-resort.jpeg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
      </div>
      <div className="hero-overlay" />
      <div className="container hero-content">
        <div className="hero-grid">
          <div className="hero-copy reveal">
            <h1 className="hero-title">
              <span className="hero-line">Real estate con</span>
              <span className="hero-line accent">visión estratégica</span>
            </h1>
            <p className="hero-text">
              Somos una consultora boutique de real estate en Buenos Aires y Miami. Seleccionamos
              propiedades y oportunidades según cada objetivo, y acompañamos cada decisión con una
              mirada comercial y patrimonial.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-secondary" href="/contacto">
                Hablar con un asesor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
