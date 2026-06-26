import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';

export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <section className="error-404-section">
          <div className="error-404-content">
            <span className="error-404-code">404</span>
            <span className="eyebrow">Página no encontrada</span>
            <h1>Esta página no existe</h1>
            <p>
              La URL que buscás no existe o fue movida. Podés explorar nuestras propiedades
              disponibles o volver al inicio.
            </p>
            <div className="error-404-actions">
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
    </>
  );
}
