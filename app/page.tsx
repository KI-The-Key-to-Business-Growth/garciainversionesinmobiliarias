import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import Hero from '@/components/sections/Hero';
import About from '@/components/sections/About';
import Services from '@/components/sections/Services';
import Markets from '@/components/sections/Markets';
import FeaturedProperties from '@/components/properties/FeaturedProperties';
import Why from '@/components/sections/Why';
import CtaBand from '@/components/sections/CtaBand';
import Contact from '@/components/sections/Contact';
import Newsletter from '@/components/sections/Newsletter';
import TurnstileScript from '@/components/forms/TurnstileScript';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <FeaturedProperties />
        <Services />
        <About />
        <Markets />
        <Why />
        <CtaBand />
        <Contact />
      </main>
      <Newsletter />
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
      {/* Turnstile: solo en la home porque es la única ruta con formularios. */}
      <TurnstileScript />
    </>
  );
}
