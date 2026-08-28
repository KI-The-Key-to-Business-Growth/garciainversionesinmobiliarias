import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';

export const metadata: Metadata = {
  title: 'Vender | García Inversiones Inmobiliarias',
  description: 'García acompaña y trabaja estratégicamente la comercialización de tu propiedad.',
  alternates: { canonical: '/vender' },
};

const STEPS = [
  'Entendemos la propiedad y el objetivo.',
  'Definimos posicionamiento.',
  'Preparamos la presentación.',
  'Producimos material comercial.',
  'Comunicamos y gestionamos interesados.',
  'Negociamos y acompañamos la operación.',
];

// Reutilizado EXCLUSIVAMENTE del contenido ya aprobado de Services.tsx (tarjeta "Propietarios") —
// no se amplían capacidades ni se inventa alcance nuevo para esta landing.
const OWNER_SERVICES = ['Tasación profesional', 'Análisis de mercado', 'Presentación y difusión', 'Seguimiento'];

// Principios García ya usados en otras partes del sitio (Hero, Why.tsx) — sin slogans nuevos.
const DIFFERENTIALS = [
  'Datos y argumentos antes que adjetivos',
  'Transparencia en cada etapa',
  'Acompañamiento personalizado',
];

function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export default function VenderPage() {
  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <p className="eyebrow">Vender</p>
            <h1>Vender tu propiedad</h1>
            <p>Datos y argumentos antes que adjetivos, transparencia y sin presión comercial.</p>
          </div>
        </section>

        <section className="twoclics-catalog-section">
          <div className="container">
            <p className="sell-intro">
              El trabajo empieza antes de publicar: entender la propiedad y definir cómo
              presentarla es lo que después hace la diferencia en el proceso de venta.
            </p>

            <div className="twoclics-section-heading twoclics-section-heading--compact">
              <h2>Nuestro proceso</h2>
            </div>
            <ol className="sell-process-list">
              {STEPS.map((step, index) => (
                <li key={step} className="sell-process-item">
                  <span className="sell-process-index">{stepNumber(index)}</span>
                  <span className="sell-process-text">{step}</span>
                </li>
              ))}
            </ol>

            <div className="twoclics-section-heading twoclics-section-heading--compact sell-section-spacing">
              <h2>Qué hacemos por tu propiedad</h2>
            </div>
            <ul className="sell-owner-services">
              {OWNER_SERVICES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="sell-differentials sell-section-spacing">
              {DIFFERENTIALS.map((item) => (
                <span className="sell-differential-chip" key={item}>
                  {item}
                </span>
              ))}
            </div>

            <div className="section-cta">
              <Link className="btn btn-primary" href="/contacto">
                Quiero vender mi propiedad
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
