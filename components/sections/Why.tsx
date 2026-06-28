// POR QUÉ NOSOTROS — "¿Por qué García Inversiones?" / "Porque no mostramos todo."
// why-stats: grid 3 columnas, números Cormorant dorados (§3.3). Stat mercados +8 (§3.2).
export default function Why() {
  return (
    <section className="section why">
      <div className="container">
        <div className="why-grid">
          <div className="reveal">
            <span className="eyebrow">Diferencial</span>
            <h2 className="section-title">¿Por qué García Inversiones?</h2>
            <p className="section-text">
              Porque no mostramos todo. Mostramos lo que tiene sentido.
            </p>
          </div>
          <div className="why-points">
            <article className="why-point reveal">
              <h3>Selección real</h3>
              <p>
                Cada propiedad que presentamos pasó por un análisis previo de mercado, ubicación y
                proyección.
              </p>
            </article>
            <article className="why-point reveal">
              <h3>Trato personalizado</h3>
              <p>Trabajás directamente con Fabiana en cada etapa del proceso.</p>
            </article>
            <article className="why-point reveal">
              <h3>Más de 500 operaciones de respaldo</h3>
              <p>Experiencia real en Argentina y en mercados internacionales.</p>
            </article>
          </div>
        </div>
        <div className="why-stats reveal">
          <div className="why-stat">
            <span className="why-stat-number">+500</span>
            <span className="why-stat-label">Operaciones realizadas</span>
          </div>
          <div className="why-stat">
            <span className="why-stat-number">20 años</span>
            <span className="why-stat-label">En la industria del real estate</span>
          </div>
          <div className="why-stat">
            <span className="why-stat-number">+8</span>
            <span className="why-stat-label">Mercados internacionales</span>
          </div>
        </div>
      </div>
    </section>
  );
}
