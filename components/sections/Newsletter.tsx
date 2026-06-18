import NewsletterForm from '@/components/forms/NewsletterForm';

// NEWSLETTER — independiente de 2Clics.
export default function Newsletter() {
  return (
    <section className="newsletter-section">
      <div className="newsletter-inner">
        <h2 className="newsletter-title">Suscribite a nuestras novedades</h2>
        <p className="newsletter-text">
          Recibí oportunidades, propiedades destacadas y novedades del mercado directamente en tu
          correo.
        </p>
        <NewsletterForm />
        <p className="form-legal form-legal--light">
          Al suscribirte aceptás que García Inversiones Inmobiliarias utilice tu email para enviarte
          novedades del mercado. <a href="/privacidad">Ver Política de Privacidad</a>.
        </p>
        <div id="newsletterSuccess" className="newsletter-success">
          ✓ Suscripción confirmada. Te enviaremos oportunidades, propiedades destacadas y novedades
          del mercado.
        </div>
      </div>
    </section>
  );
}
