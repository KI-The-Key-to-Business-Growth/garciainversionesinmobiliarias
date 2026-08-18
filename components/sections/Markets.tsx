// MERCADOS — Buenos Aires y Miami como mercados activos.
const MARKETS = [
  {
    country: 'Argentina',
    market: 'Buenos Aires',
    text: 'Trabajamos en Buenos Aires con propiedades seleccionadas para compra, venta, alquiler e inversión. Analizamos cada operación según el objetivo del cliente, la ubicación, las características de la propiedad y su contexto de mercado.',
    chip: 'Buenos Aires',
  },
  {
    country: 'Estados Unidos',
    market: 'Miami',
    text: 'En Estados Unidos concentramos actualmente nuestro trabajo en Miami, a través de relaciones locales y oportunidades seleccionadas.',
    chip: 'Miami',
  },
];

export default function Markets() {
  return (
    <section className="section markets" id="mercados">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">Mercados</span>
            <h2 className="section-title">Dónde vemos valor</h2>
            <p className="section-text">
              Hoy concentramos nuestro trabajo en dos mercados: Buenos Aires y Miami.
            </p>
          </div>
        </div>
        <div className="cards-4 markets-grid">
          {MARKETS.map((m) => (
            <article className="market-card reveal" key={m.market}>
              <span className="market-country">{m.country}</span>
              <h3>{m.market}</h3>
              <p>{m.text}</p>
              <span className="market-chip">{m.chip}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
