import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import Hero from '@/components/sections/Hero';
import Trayectoria from '@/components/sections/Trayectoria';
import FeaturedProperties from '@/components/properties/FeaturedProperties';
import Newsletter from '@/components/sections/Newsletter';

// WEB GARCÍA V2 (quinta pasada) — Contacto salió del Home y pasó a ser landing propia (/contacto,
// ver app/contacto/page.tsx). Estructura definitiva del Home: Header → Hero (limpio, sin
// buscador) → Trayectoria/cifras → Oportunidades seleccionadas → Newsletter → Footer. El live
// search del Hero (HeroSearch.tsx, /api/search, searchPublicProperties) no quedó aprobado para
// esta etapa y se retiró por completo del repo (decisión de producto/UX, no falla técnica — ver
// docs/ai/WEB_GARCIA_V2.md).
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Trayectoria />
        <FeaturedProperties />
      </main>
      <Newsletter />
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
