import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import ThankYouTracking from '@/components/tracking/ThankYouTracking';

export const metadata: Metadata = {
  title: 'Gracias por tu consulta | García Inversiones Inmobiliarias',
  robots: { index: false, follow: true },
};

export default function GraciasPage() {
  return (
    <>
      <Header />
      <main>
        <section className="thank-you-hero">
          <div className="thank-you-content">
            <span className="eyebrow">Solicitud recibida</span>
            <h1>Gracias por tu consulta</h1>
            <p>
              Recibimos tus datos correctamente. El equipo de García Inversiones Inmobiliarias se va
              a contactar con vos para avanzar con la consulta.
            </p>
            <div className="thank-you-actions">
              <Link href="/comprar" className="btn btn-primary">
                Ver propiedades
              </Link>
              <Link href="/" className="btn btn-secondary">
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />

      {/* Solo vista de página (engagement). NO es una conversión: el lead se mide al enviar el formulario. */}
      <ThankYouTracking />
    </>
  );
}
