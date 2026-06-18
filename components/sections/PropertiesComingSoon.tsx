// PROPIEDADES — placeholder "Selección en preparación" (informe §3.7).
// Se muestra mientras PROPERTIES_ENABLED=false. Estilos inline preservados del legacy.
export default function PropertiesComingSoon() {
  return (
    <section id="destacadas" style={{ background: '#f2ede4', padding: '100px 20px', textAlign: 'center' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ width: 48, height: 2, background: '#cda04f', margin: '0 auto 28px' }} />
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#cda04f',
            margin: '0 0 16px',
          }}
        >
          PROPIEDADES
        </p>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 42,
            fontWeight: 300,
            color: '#0c2948',
            margin: '0 0 20px',
            lineHeight: 1.2,
          }}
        >
          Selección en preparación.
        </h2>
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 15,
            fontWeight: 400,
            color: '#666666',
            lineHeight: 1.8,
            maxWidth: 520,
            margin: '0 auto 36px',
          }}
        >
          Estamos preparando una selección de propiedades en Argentina y mercados internacionales. Si
          tenés algo en mente, escribinos y te mostramos opciones antes de que estén publicadas.
        </p>
        <a
          href="https://wa.me/5491167240353"
          target="_blank"
          rel="noopener"
          style={{
            background: '#cda04f',
            color: '#ffffff',
            fontFamily: "'Jost', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            padding: '13px 30px',
            borderRadius: 24,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Consultar propiedades
        </a>
      </div>
    </section>
  );
}
