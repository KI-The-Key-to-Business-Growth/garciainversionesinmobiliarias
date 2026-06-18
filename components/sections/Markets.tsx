// MERCADOS — 5 cards (México eliminado). Diseño §3.3: fondo navy, borde-top 3px gold, texto muted.
const MARKETS = [
  {
    name: 'Argentina',
    text: 'El mercado local sigue generando oportunidades para quien sabe dónde mirar. Trabajamos en la zona norte del Gran Buenos Aires — Nordelta, Tigre y Benavídez — con foco en propiedades de ubicación consolidada, proyección de valor y rentabilidad.',
    chip: 'Mercado local',
  },
  {
    name: 'Estados Unidos',
    text: 'Seguridad jurídica, renta en dólares y un mercado con décadas de comportamiento documentado. Trabajamos con activos en Miami, West Palm Beach, Orlando y otras ciudades. Orientados a inversiones estratégicas seleccionadas según el perfil de cada cliente.',
    chip: 'Renta',
  },
  {
    name: 'Uruguay',
    text: 'Ideal para quienes buscan diversificar cerca, con moneda dolarizada, régimen fiscal favorable y oportunidades en Punta del Este, Montevideo y Colonia.',
    chip: 'Patrimonio',
  },
  {
    name: 'Dubái',
    text: 'Sin impuesto a las ganancias ni a la renta, con alto retorno por rentabilidad y financiación directa del desarrollador. Uno de los mercados de mayor proyección a nivel global.',
    chip: 'Inversión global',
  },
  {
    name: 'España',
    text: 'Acceso al mercado inmobiliario europeo a través de un fondo de inversión seleccionado. Uno de los sectores más sólidos de Europa con rentabilidad proyectada del 7% anual a 5 años.',
    chip: 'Estabilidad',
  },
];

export default function Markets() {
  return (
    <section className="section markets" id="mercados">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <span className="eyebrow">Mercados</span>
            <h2 className="section-title">Donde vemos valor</h2>
            <p className="section-text">
              Mercados donde hoy puede existir oportunidad para quienes buscan diversificar,
              resguardar capital o generar renta inmobiliaria.
            </p>
          </div>
        </div>
        <div className="cards-4">
          {MARKETS.map((m) => (
            <article className="market-card reveal" key={m.name}>
              <h3>{m.name}</h3>
              <p>{m.text}</p>
              <span className="market-chip">{m.chip}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
