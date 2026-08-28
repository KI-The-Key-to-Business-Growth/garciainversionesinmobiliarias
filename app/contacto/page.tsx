import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import RevealObserver from '@/components/RevealObserver';
import Contact from '@/components/sections/Contact';
import TurnstileScript from '@/components/forms/TurnstileScript';

export const metadata: Metadata = {
  title: 'Contacto | García Inversiones Inmobiliarias',
  description:
    'Escribinos por WhatsApp, email o completá el formulario para recibir atención personalizada.',
  alternates: { canonical: '/contacto' },
};

// WEB GARCÍA V2 (quinta pasada) — Contacto deja de ser una sección del Home y pasa a ser landing
// propia: Header → Contacto → Footer, nada más. Mismos canales/formulario/backend de siempre
// (Contact.tsx no cambió de lógica, solo de página contenedora). Turnstile se carga acá porque
// esta es ahora la única ruta con formulario (antes solo estaba en la home).
export default function ContactoPage() {
  return (
    <>
      <Header />
      <main>
        <Contact />
      </main>
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
      <TurnstileScript />
    </>
  );
}
