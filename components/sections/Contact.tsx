import ContactForm from '@/components/forms/ContactForm';

// CONTACTO — badge "Atención directa" (§3.2), botón "Enviar consulta" dorado.
export default function Contact() {
  return (
    <section className="section contact" id="contacto">
      <div className="container">
        <div className="contact-grid">
          <div className="contact-panel reveal">
            <span className="eyebrow">Contacto</span>
            <p>
              Completá el formulario o escribinos directamente por WhatsApp para recibir atención
              personalizada.
            </p>
            <div className="contact-list">
              <div className="contact-item">
                <strong>WhatsApp</strong>
                <a href="https://wa.me/5491167240353" target="_blank" rel="noopener">
                  +54 9 11 6724-0353
                </a>
              </div>
              <div className="contact-item">
                <strong>Email</strong>
                <a href="mailto:contacto@garciainversiones.com.ar">
                  contacto@garciainversiones.com.ar
                </a>
              </div>
              <div className="contact-item">
                <strong>Instagram</strong>
                <a href="https://instagram.com/inv.inmob.garcia" target="_blank" rel="noopener">
                  @inv.inmob.garcia
                </a>
              </div>
              <div className="contact-item">
                <strong>Ubicación</strong>
                <span>Buenos Aires, Argentina</span>
              </div>
            </div>
          </div>
          <div className="contact-right-col">
            <div className="trust-badges reveal">
              <span className="trust-badge">
                <span className="trust-icon">✓</span>Respondemos en menos de 24hs
              </span>
              <span className="trust-badge">
                <span className="trust-icon">✓</span>Atención directa
              </span>
              <span className="trust-badge">
                <span className="trust-icon">✓</span>Sin compromiso
              </span>
            </div>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
