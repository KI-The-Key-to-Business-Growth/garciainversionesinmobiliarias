// POR QUÉ NOSOTROS — "¿Por qué García Inversiones?" / "Porque no mostramos todo."
// why-stats: grid 3 columnas, números Cormorant dorados.
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
              <h3>Selección con criterio</h3>
              <p>
                No recomendamos una propiedad simplemente porque esté disponible. Buscamos que tenga
                sentido para el objetivo de cada cliente.
              </p>
            </article>
            <article className="why-point reveal">
              <h3>Acompañamiento personalizado</h3>
              <p>
                Cada operación se trabaja con seguimiento cercano y acompañamiento durante las
                distintas etapas del proceso.
              </p>
            </article>
            <article className="why-point reveal">
              <h3>Mirada comercial y patrimonial</h3>
              <p>
                Analizamos cada decisión considerando la propiedad, su contexto y el objetivo detrás
                de la operación.
              </p>
            </article>
          </div>
        </div>
        <div className="why-stats reveal">
          <div className="why-stat">
            <span className="why-stat-number">+500</span>
            <span className="why-stat-label">Operaciones realizadas</span>
          </div>
          <div className="why-stat">
            <span className="why-stat-number">+20 años</span>
            <span className="why-stat-label">En la industria del real estate</span>
          </div>
          <div className="why-stat">
            <span className="why-stat-number why-stat-number--market">Buenos Aires + Miami</span>
            <span className="why-stat-label">Mercados activos</span>
          </div>
        </div>
      </div>
    </section>
  );
}
