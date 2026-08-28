import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import About from '@/components/sections/About';
import Markets from '@/components/sections/Markets';
import Why from '@/components/sections/Why';

export const metadata: Metadata = {
  title: 'Nosotros | García Inversiones Inmobiliarias',
  description: 'Quiénes somos, cómo trabajamos y en qué mercados operamos hoy.',
  alternates: { canonical: '/nosotros' },
};

// WEB GARCÍA V2 (segunda pasada) — página real (antes era solo el ancla `/#nosotros` del Home).
// Reutiliza contenido institucional ya existente y aprobado (About/Why/Markets) reorganizado acá
// en vez de reescrito — ningún dato/cifra nuevo, ver docs/ai/WEB_GARCIA_V2.md.
export default function NosotrosPage() {
  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <p className="eyebrow">Nosotros</p>
            <h1>Conocé García</h1>
            <p>Quiénes somos, nuestra forma de trabajar y los mercados en los que operamos hoy.</p>
          </div>
        </section>
        <About />
        <Why />
        <Markets />
      </main>
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
