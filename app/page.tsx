import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import Hero from '@/components/sections/Hero';
import Trayectoria from '@/components/sections/Trayectoria';
import SelectedOpportunities from '@/components/home/SelectedOpportunities';
import Newsletter from '@/components/sections/Newsletter';
import { INSTITUTIONAL_OPEN_GRAPH } from '@/lib/share-metadata';

// El Home conserva su metadata institucional (layout raíz) y es la única página que declara la
// URL raíz como og:url.
export const metadata: Metadata = {
  openGraph: { ...INSTITUTIONAL_OPEN_GRAPH, url: '/' },
};

// WEB GARCÍA V2 (quinta pasada) — Contacto salió del Home y pasó a ser landing propia (/contacto,
// ver app/contacto/page.tsx). El live search del Hero (HeroSearch.tsx, /api/search,
// searchPublicProperties) no quedó aprobado para esta etapa y se retiró por completo del repo
// (decisión de producto/UX, no falla técnica — ver docs/ai/WEB_GARCIA_V2.md).
// PRE-LAUNCH V2: "Oportunidades seleccionadas" pasa a ser una curaduría manual de García
// (lib/home-selection.ts) inmediatamente después del Hero — ya no se arma desde los DESTACADO de
// 2Clics (FeaturedProperties.tsx queda en el repo, fuera del Home).
// Estructura: Header → Hero → Oportunidades seleccionadas → Trayectoria → Newsletter → Footer.
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SelectedOpportunities />
        <Trayectoria />
      </main>
      <Newsletter />
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
