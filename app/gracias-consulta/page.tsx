import type { Metadata } from 'next';
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
              <a href="/propiedades" className="btn btn-primary">
                Ver propiedades
              </a>
              <a href="/" className="btn btn-secondary">
                Volver al inicio
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />

      {/* Tracking de conversión — sólo dispara generate_lead si viene del sitio (referrer interno) */}
      <Script id="ty-tracking" strategy="afterInteractive">
        {`(function(){var referrer=document.referrer||'';var isFromSite=referrer.includes(window.location.hostname)||referrer.includes('localhost')||referrer==='';window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'thank_you_page_view',lead_type:'consulta_inmobiliaria',page_location:window.location.href});if(isFromSite){window.dataLayer.push({event:'generate_lead',lead_type:'consulta_inmobiliaria',form_name:'Formulario de consulta',page_location:window.location.href});}})();`}
      </Script>
    </>
  );
}
