// Footer premium — México eliminado, orden de mercados Argentina/EEUU/Uruguay/Dubái/España.
export default function Footer() {
  return (
    <footer className="footer-premium">
      <div className="container">
        <div className="footer-premium-grid">
          <div className="footer-brand-col">
            <a href="/" className="footer-logo-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logos/Garcia.svg" alt="García Inversiones Inmobiliarias" decoding="async" />
            </a>
            <p className="footer-tagline">
              Consultora boutique de real estate. Propiedades seleccionadas y asesoramiento
              personalizado en Argentina y mercados internacionales.
            </p>
            <div className="footer-contacts">
              <a
                href="https://wa.me/5491167240353"
                target="_blank"
                rel="noopener"
                className="footer-contact-item"
              >
                <span className="footer-contact-label">WhatsApp</span>
                <span>+54 9 11 6724-0353</span>
              </a>
              <a href="mailto:contacto@garciainversiones.com.ar" className="footer-contact-item">
                <span className="footer-contact-label">Email</span>
                <span>contacto@garciainversiones.com.ar</span>
              </a>
              <a
                href="https://instagram.com/inv.inmob.garcia"
                target="_blank"
                rel="noopener"
                className="footer-contact-item"
              >
                <span className="footer-contact-label">Instagram</span>
                <span>@inv.inmob.garcia</span>
              </a>
              <div className="footer-contact-item">
                <span className="footer-contact-label">Ubicación</span>
                <span>Buenos Aires, Argentina</span>
              </div>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-column-title">Navegación</h4>
            <ul className="footer-links">
              <li><a href="/#inicio">Inicio</a></li>
              <li><a href="/#nosotros">Nosotros</a></li>
              <li><a href="/propiedades">Propiedades</a></li>
              <li><a href="/#servicios">Servicios</a></li>
              <li><a href="/#mercados">Mercados</a></li>
              <li><a href="/#contacto">Contacto</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-column-title">Mercados</h4>
            <ul className="footer-links">
              <li>Argentina</li>
              <li>Estados Unidos</li>
              <li>Uruguay</li>
              <li>Dubái</li>
              <li>España</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4 className="footer-column-title">Servicios</h4>
            <ul className="footer-links">
              <li>Asesoramiento en inversiones</li>
              <li>Compra y venta</li>
              <li>Alquiler de propiedades</li>
              <li>Mercados internacionales</li>
              <li>Proyectos y desarrollos</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>© 2026 García Inversiones Inmobiliarias. Todos los derechos reservados.</span>
          <a href="/privacidad" className="footer-privacy-link">Política de Privacidad</a>
          <a href="/#inicio">↑ Volver al inicio</a>
        </div>
      </div>
    </footer>
  );
}
