// SERVICIOS — 4 cards (§3.2): 01 Inversiones, 02 Compra/venta/alquiler, 03 Propietarios, 04 Mercados internacionales.
// Cambio de diseño §3.3: service cards min-height 320px, display flex column (en globals.css).
const SERVICES = [
  {
    n: '01',
    title: 'Asesoramiento en inversiones',
    text: 'Evaluamos cada oportunidad desde una perspectiva patrimonial, financiera y comercial. Te ayudamos a entender qué comprar, dónde, cuándo y con qué objetivo.',
    items: ['Análisis de oportunidad', 'Perfil de inversión', 'Estrategia de renta o resguardo'],
  },
  {
    n: '02',
    title: 'Compra, venta y alquiler',
    text: 'Acompañamos cada operación con atención personalizada, desde la búsqueda o publicación hasta el cierre. Sin vueltas, con presencia real en cada etapa.',
    items: ['Propiedades seleccionadas', 'Negociación y seguimiento', 'Cierre acompañado'],
  },
  {
    n: '03',
    title: 'Propietarios',
    text: 'Si tenés una propiedad para vender o alquilar, te acompañamos desde el análisis inicial hasta el cierre con difusión estratégica y seguimiento activo.',
    items: [
      'Tasación profesional',
      'Estudio integral de mercado',
      'Presentación y marketing de la propiedad',
      'Seguimiento y reportes',
    ],
  },
  {
    n: '04',
    title: 'Mercados internacionales',
    text: 'Acompañamos a clientes que buscan diversificar su capital fuera de Argentina con oportunidades reales en Estados Unidos, Uruguay, Dubái y España.',
    items: [
      'Real estate internacional',
      'Proyectos en desarrollo y unidades terminadas',
      'Visión de mediano y largo plazo',
      'Oportunidades para revalorización, rentabilidad o uso propio',
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
