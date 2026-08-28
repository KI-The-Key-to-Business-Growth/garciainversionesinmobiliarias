import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import Services from '@/components/sections/Services';

export const metadata: Metadata = {
  title: 'Servicios | García Inversiones Inmobiliarias',
  description: 'Asesoramiento en inversiones, compra, alquiler, propietarios y desarrollos seleccionados.',
  alternates: { canonical: '/servicios' },
};

// WEB GARCÍA V2 (segunda pasada) — reutiliza el contenido ya aprobado de "Qué ofrecemos"
// (Services.tsx), antes solo visible como sección del Home. Ver docs/ai/WEB_GARCIA_V2.md.
export default function ServiciosPage() {
  return (
    <>
      <Header />
      <main>
        <section className="twoclics-catalog-hero twoclics-catalog-hero--compact">
          <div className="container">
            <p className="eyebrow">Servicios</p>
            <h1>Cómo acompañamos cada operación</h1>
            <p>Desde el análisis inicial hasta el cierre — con criterio comercial y patrimonial.</p>
          </div>
        </section>
        <Services />
      </main>
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
