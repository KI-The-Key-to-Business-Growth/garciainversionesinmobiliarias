import Image from 'next/image';

// HERO — imagen única condor-resort con filtro saturate(1.35) brightness(1.05) (vía .hero-slide en globals.css).
// next/image con priority (LCP) + fill; el filtro de .hero-slide se aplica sobre la imagen.
// Título con split de color: línea 1 blanca, "visión estratégica" en dorado (.accent).
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
              Somos una consultora boutique especializada en propiedades seleccionadas e inversiones
              inmobiliarias en Argentina y mercados internacionales. Trabajamos uno a uno con cada
              cliente para que cada decisión sea la correcta.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="/propiedades">
                Ver propiedades
              </a>
              <a
                className="btn btn-secondary"
                href="https://wa.me/5491167240353"
                target="_blank"
                rel="noopener"
              >
                Hablar con un asesor
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
