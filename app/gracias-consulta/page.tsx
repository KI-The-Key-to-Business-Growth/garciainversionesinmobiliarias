import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';

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
              <Link href="/propiedades" className="btn btn-primary">
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

      <Script id="thank-you-page-view" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'thank_you_page_view',page_path:window.location.pathname,page_location:window.location.href,page_title:document.title});`}
      </Script>
    </>
  );
}
