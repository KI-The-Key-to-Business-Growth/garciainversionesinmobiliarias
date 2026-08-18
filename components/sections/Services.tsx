// SERVICIOS — 4 cards: inversiones, operaciones, propietarios y desarrollos seleccionados.
// Cambio de diseño §3.3: service cards min-height 320px, display flex column (en globals.css).
const SERVICES = [
  {
    n: '01',
    title: 'Asesoramiento en inversiones',
    text: 'Analizamos cada oportunidad desde una perspectiva comercial y patrimonial, partiendo del objetivo de cada cliente.',
    items: ['Análisis de oportunidad', 'Perfil de inversión', 'Comparación de alternativas'],
  },
  {
    n: '02',
    title: 'Compra, venta y alquiler',
    text: 'Acompañamos cada operación de forma personalizada, desde la búsqueda o publicación hasta la negociación y el cierre.',
    items: [
      'Propiedades seleccionadas',
      'Negociación y seguimiento',
      'Acompañamiento hasta el cierre',
    ],
  },
  {
    n: '03',
    title: 'Propietarios',
    text: 'Si tenés una propiedad para vender o alquilar, trabajamos desde el análisis inicial hasta su comercialización y seguimiento.',
    items: [
      'Tasación profesional',
      'Análisis de mercado',
      'Presentación y difusión',
      'Seguimiento',
    ],
  },
  {
    n: '04',
    title: 'Desarrollos seleccionados',
    text: 'Analizamos proyectos y desarrollos en Buenos Aires y Miami para acompañar al cliente en la comparación y evaluación de alternativas.',
    items: [
      'Análisis del proyecto',
      'Comparación de alternativas',
      'Información comercial vigente',
      'Acompañamiento personalizado',
    ],
  },
];

export default function Services() {
  return (
    <section className="section services" id="servicios">
      <div className="container">
        <div className="services-head reveal">
          <div>
            <span className="eyebrow">Servicios</span>
            <h2 className="section-title">Qué ofrecemos</h2>
          </div>
        </div>
        <div className="services-grid">
          {SERVICES.map((s) => (
            <article className="service-card reveal" key={s.n}>
              <div className="service-icon">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <ul>
                {s.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
