import Image from 'next/image';

// NOSOTROS — "Una empresa familiar con mirada global". Fabiana en <strong>.
// Foto Fabiana optimizada con next/image (origen WebP 512x512, 14.5KB).
// Stats con borde-izquierdo dorado (cambio de diseño §3.3).
export default function About() {
  return (
    <section className="section about" id="nosotros">
      <div className="container">
        <div className="about-grid">
          <div className="about-media reveal">
            <Image
              src="/assets/FabianaGarcia.webp"
              alt="Fabiana García — CEO García Inversiones Inmobiliarias"
              width={512}
              height={512}
              sizes="380px"
              loading="lazy"
            />
          </div>
          <div className="about-copy reveal">
            <span className="eyebrow">Nosotros</span>
            <h2 className="section-title">Una empresa familiar con mirada global</h2>
            <p>
              García Inversiones nace de una convicción: que comprar, vender o invertir en real
              estate requiere criterio, no solo catálogo. Por eso trabajamos de forma integral:
              seleccionamos cada propiedad, analizamos cada mercado y acompañamos cada decisión.
            </p>
            <p>
              <strong>Fabiana García</strong> es la fundadora, CEO y principal referente comercial
              de García Inversiones. Con más de 20 años en la industria del real estate, combina
              experiencia, conocimiento del mercado y una forma de trabajo basada en el trato
              directo y el acompañamiento personalizado.
            </p>
            <div className="stats">
              <div className="stat">
                <strong>Criterio</strong>
                <span>Análisis antes de recomendar.</span>
              </div>
              <div className="stat">
                <strong>Buenos Aires + Miami</strong>
                <span>Dos mercados, una misma forma de trabajar.</span>
              </div>
              <div className="stat">
                <strong>Acompañamiento</strong>
                <span>Atención personalizada en cada etapa.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
