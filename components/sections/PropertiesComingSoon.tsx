// PROPIEDADES — placeholder "Selección en preparación" (informe §3.7).
// Se muestra mientras PROPERTIES_ENABLED=false. Estilos inline preservados del legacy.
type PropertiesComingSoonProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  status?: string;
  text?: string;
  showCta?: boolean;
};

export default function PropertiesComingSoon({
  id = 'destacadas',
  eyebrow = 'PROPIEDADES',
  title,
  status = 'Selección en preparación.',
  text = 'Estamos preparando una selección de propiedades en Argentina y mercados internacionales. Si tenés algo en mente, escribinos y te mostramos opciones antes de que estén publicadas.',
  showCta = true,
}: PropertiesComingSoonProps = {}) {
  return (
    <section id={id} style={{ background: '#f2ede4', padding: '100px 20px', textAlign: 'center' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ width: 48, height: 2, background: '#cda04f', margin: '0 auto 28px' }} />
        <p
          style={{
            fontFamily: 'var(--font-jost), sans-serif',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#cda04f',
            margin: '0 0 16px',
          }}
        >
          {eyebrow}
        </p>
        {title ? (
          <>
            <h2
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: 42,
                fontWeight: 300,
                color: '#0c2948',
                margin: '0 0 14px',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-jost), sans-serif',
                fontSize: 16,
                fontWeight: 600,
                color: '#0c2948',
                margin: '0 0 18px',
              }}
            >
              {status}
            </p>
          </>
        ) : (
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              fontSize: 42,
              fontWeight: 300,
              color: '#0c2948',
              margin: '0 0 20px',
              lineHeight: 1.2,
            }}
          >
            {status}
          </h2>
        )}
        <p
          style={{
            fontFamily: 'var(--font-jost), sans-serif',
            fontSize: 15,
            fontWeight: 400,
            color: '#666666',
            lineHeight: 1.8,
            maxWidth: 520,
            margin: showCta ? '0 auto 36px' : '0 auto',
          }}
        >
          {text}
        </p>
        {showCta ? (
          <a
            href="https://wa.me/5491167240353"
            target="_blank"
            rel="noopener"
            data-whatsapp-location="propiedades_placeholder"
            style={{
              background: '#cda04f',
              color: '#ffffff',
              fontFamily: 'var(--font-jost), sans-serif',
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
        ) : null}
      </div>
    </section>
  );
}
