import React from 'react';
import ContactForm from '@/components/forms/ContactForm';

// CONTACTO — landing independiente /contacto (WEB GARCÍA V2, quinta pasada). Antes vivía como
// sección del Home (`/#contacto`); ahora es la única consumidora de este componente, así que el
// encabezado editorial (eyebrow + H1 "Hablemos") vive directamente acá en vez de en un Hero aparte.
// Mismos canales/formulario/backend de siempre — no se agregó ninguna promesa nueva.
export default function Contact() {
  return (
    <section className="section-sm contact contact--compact" id="contacto">
      <div className="container">
        <div className="contact-grid">
          <div className="contact-panel reveal">
            <span className="eyebrow">Contacto</span>
            <h1>Hablemos</h1>
            <p>
              Completá el formulario o escribinos directamente por WhatsApp para recibir atención
              personalizada.
            </p>
            <div className="contact-list contact-list--compact">
              <div className="contact-item">
                <strong>WhatsApp</strong>
                <a
                  href="https://wa.me/5491167240353"
                  target="_blank"
                  rel="noopener"
                  data-whatsapp-location="contacto"
                >
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
                <a href="https://www.instagram.com/garciainversiones.re/" target="_blank" rel="noopener">
                  @garciainversiones.re
                </a>
              </div>
              <div className="contact-item">
                <strong>Ubicación</strong>
                <span>Buenos Aires, Argentina</span>
              </div>
            </div>
          </div>
          <div className="contact-right-col">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
