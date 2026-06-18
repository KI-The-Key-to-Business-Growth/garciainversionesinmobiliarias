import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';

export const metadata: Metadata = {
  title: 'Política de Privacidad | García Inversiones Inmobiliarias',
  description:
    'Política de privacidad de García Inversiones Inmobiliarias: qué datos recopilamos, cómo los usamos y cuáles son tus derechos.',
  alternates: { canonical: '/privacidad' },
};

const INDEX = [
  ['identificacion', 'Identificación del responsable'],
  ['datos-recopilados', 'Datos que recopilamos'],
  ['finalidad', 'Finalidad del tratamiento'],
  ['formularios', 'Formularios de contacto'],
  ['newsletter', 'Suscripción al newsletter'],
  ['herramientas', 'Herramientas de analítica'],
  ['no-venta', 'No vendemos tus datos'],
  ['seguridad', 'Seguridad'],
  ['derechos', 'Tus derechos'],
  ['cookies', 'Cookies'],
  ['cambios', 'Cambios en esta política'],
  ['contacto-privacidad', 'Contacto'],
];

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main>
        <section className="privacy-hero">
          <div className="container">
            <span className="eyebrow">Información legal</span>
            <h1>Política de Privacidad</h1>
            <p className="privacy-hero-sub">Última actualización: junio de 2026</p>
          </div>
        </section>

        <section className="privacy-content-section">
          <div className="container">
            <div className="privacy-layout">
              <aside className="privacy-index" aria-label="Índice de contenidos">
                <h2 className="privacy-index-title">Contenidos</h2>
                <ol className="privacy-index-list">
                  {INDEX.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`}>{label}</a>
                    </li>
                  ))}
                </ol>
              </aside>

              <article className="privacy-body">
                <section id="identificacion" className="privacy-section">
                  <h2>1. Identificación del responsable</h2>
                  <p>
                    El responsable del tratamiento de los datos personales recabados a través de
                    este sitio web es:
                  </p>
                  <div className="privacy-card">
                    <p><strong>García Inversiones Inmobiliarias</strong></p>
                    <p>
                      Sitio web:{' '}
                      <a href="https://www.garciainversionesinmobiliarias.com.ar">
                        www.garciainversionesinmobiliarias.com.ar
                      </a>
                    </p>
                    <p>
                      Correo de contacto:{' '}
                      <a href="mailto:contacto@garciainversiones.com.ar">
                        contacto@garciainversiones.com.ar
                      </a>
                    </p>
                    <p>Ubicación: Buenos Aires, Argentina</p>
                  </div>
                </section>

                <section id="datos-recopilados" className="privacy-section">
                  <h2>2. Datos que recopilamos</h2>
                  <p>
                    Podemos recopilar los siguientes tipos de información personal cuando interactuás
                    con nuestro sitio:
                  </p>
                  <ul className="privacy-list">
                    <li><strong>Datos de identificación:</strong> nombre y apellido.</li>
                    <li>
                      <strong>Datos de contacto:</strong> dirección de correo electrónico y número de
                      teléfono o WhatsApp.
                    </li>
                    <li>
                      <strong>Información de la consulta:</strong> motivo de la consulta y mensaje que
                      nos enviás a través del formulario de contacto.
                    </li>
                    <li>
                      <strong>Dirección de correo para newsletter:</strong> cuando te suscribís
                      voluntariamente a nuestras novedades.
                    </li>
                    <li>
                      <strong>Datos de navegación:</strong> información técnica recabada por
                      herramientas de analítica (ver sección 6), como páginas visitadas, duración de
                      la sesión y origen del tráfico.
                    </li>
                  </ul>
                  <p>
                    No solicitamos intencionalmente datos sensibles (según la legislación vigente) ni
                    datos de menores de 18 años. Si sos menor, por favor no envíes tus datos a través
                    de este sitio.
                  </p>
                </section>

                <section id="finalidad" className="privacy-section">
                  <h2>3. Finalidad del tratamiento</h2>
                  <p>
                    Los datos personales que nos proporcionás se utilizan exclusivamente para los
                    siguientes fines:
                  </p>
                  <ul className="privacy-list">
                    <li>Responder consultas comerciales e inmobiliarias enviadas a través de los formularios del sitio.</li>
                    <li>Enviar información sobre propiedades, oportunidades de inversión y novedades del mercado (únicamente si te suscribiste al newsletter).</li>
                    <li>Gestionar la relación comercial con potenciales y actuales clientes.</li>
                    <li>Mejorar la experiencia del usuario y el rendimiento del sitio web mediante datos estadísticos, agregados o seudonimizados, según la configuración de cada herramienta.</li>
                    <li>Medir la efectividad de nuestras campañas publicitarias.</li>
                  </ul>
                </section>

                <section id="formularios" className="privacy-section">
                  <h2>4. Formularios de contacto</h2>
                  <p>
                    Cuando completás y enviás el formulario de contacto o el formulario de consulta
                    por una propiedad, los datos ingresados son utilizados para:
                  </p>
                  <ul className="privacy-list">
                    <li>Responderte de manera personalizada a través de los canales que nos indicaste (email, WhatsApp o teléfono).</li>
                    <li>Registrar o gestionar la consulta en nuestro sistema de gestión de clientes (CRM), cuando corresponda, para asegurar un seguimiento adecuado.</li>
                    <li>Contactarte con información adicional relacionada con la propiedad o servicio de tu interés.</li>
                  </ul>
                  <p>
                    No utilizaremos tus datos de contacto para enviarte comunicaciones no
                    relacionadas con tu consulta sin tu consentimiento previo.
                  </p>
                </section>

                <section id="newsletter" className="privacy-section">
                  <h2>5. Suscripción al newsletter</h2>
                  <p>
                    Si te suscribís a nuestro newsletter, utilizaremos tu dirección de correo
                    electrónico para enviarte periódicamente:
                  </p>
                  <ul className="privacy-list">
                    <li>Novedades sobre propiedades destacadas y nuevas oportunidades de inversión.</li>
                    <li>Información sobre mercados inmobiliarios nacionales e internacionales.</li>
                    <li>Contenido de valor relacionado con el real estate.</li>
                  </ul>
                  <p>
                    La suscripción es completamente voluntaria. Podés darte de baja en cualquier
                    momento escribiéndonos a{' '}
                    <a href="mailto:contacto@garciainversiones.com.ar">contacto@garciainversiones.com.ar</a>{' '}
                    con el asunto &quot;Baja newsletter&quot;.
                  </p>
                </section>

                <section id="herramientas" className="privacy-section">
                  <h2>6. Herramientas de analítica y publicidad</h2>
                  <p>
                    Este sitio puede utilizar herramientas de medición, analítica y publicidad
                    digital, tales como <strong>Google Analytics 4</strong>,{' '}
                    <strong>Google Tag Manager</strong>, <strong>Meta Pixel</strong> y{' '}
                    <strong>Google Ads</strong>, con el objetivo de analizar el uso del sitio, medir
                    conversiones, mejorar la experiencia del usuario y optimizar campañas
                    publicitarias.
                  </p>
                  <p>
                    Estas herramientas pueden recopilar información técnica y de navegación, como
                    páginas visitadas, origen del tráfico, interacciones realizadas, dispositivo
                    utilizado y eventos de conversión. La información se utiliza de forma estadística,
                    agregada o asociada a identificadores técnicos de navegación, según la
                    configuración de cada plataforma.
                  </p>
                  <div className="privacy-tool-block">
                    <h3>Google Analytics 4</h3>
                    <p>
                      Utilizamos Google Analytics 4 para analizar el comportamiento de los usuarios en
                      el sitio. Para más información, podés consultar la{' '}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                        Política de privacidad de Google
                      </a>
                      .
                    </p>
                  </div>
                  <div className="privacy-tool-block">
                    <h3>Meta Pixel</h3>
                    <p>
                      Podemos utilizar Meta Pixel para medir la efectividad de anuncios en Facebook e
                      Instagram, crear audiencias y mostrar publicidad relevante. Para más información,
                      consultá la{' '}
                      <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">
                        Política de privacidad de Meta
                      </a>
                      .
                    </p>
                  </div>
                  <div className="privacy-tool-block">
                    <h3>Google Ads</h3>
                    <p>
                      Podemos utilizar Google Ads para medir conversiones generadas a partir de
                      anuncios y mejorar la relevancia de nuestras campañas. Para más información,
                      consultá la{' '}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                        Política de privacidad de Google
                      </a>
                      .
                    </p>
                  </div>
                  <p>
                    Estas herramientas pueden utilizar <strong>cookies</strong> propias y de terceros
                    para su funcionamiento.
                  </p>
                </section>

                <section id="no-venta" className="privacy-section">
                  <h2>7. No vendemos tus datos</h2>
                  <p>
                    García Inversiones Inmobiliarias <strong>no vende, alquila ni cede</strong> tus
                    datos personales a terceros con fines comerciales propios de esos terceros. Tus
                    datos podrán ser compartidos únicamente en los siguientes supuestos:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Proveedores de servicios:</strong> empresas que nos asisten en la
                      operación del sitio (plataformas de email, CRM, hosting), bajo acuerdos de
                      confidencialidad y únicamente para prestar el servicio contratado.
                    </li>
                    <li>
                      <strong>Obligación legal:</strong> cuando una autoridad competente lo requiera
                      conforme a la legislación vigente.
                    </li>
                  </ul>
                </section>

                <section id="seguridad" className="privacy-section">
                  <h2>8. Seguridad</h2>
                  <p>
                    Aplicamos medidas técnicas y organizativas razonables para proteger la información
                    personal que nos proporcionás frente a accesos no autorizados, alteración,
                    divulgación o destrucción. Entre ellas:
                  </p>
                  <ul className="privacy-list">
                    <li>Transmisión de datos mediante conexión HTTPS/TLS.</li>
                    <li>Validación y sanitización de los datos recibidos a través de los formularios.</li>
                    <li>Limitación de acceso interno a la información confidencial.</li>
                    <li>Almacenamiento de datos en proveedores con estándares de seguridad reconocidos.</li>
                  </ul>
                  <p>
                    Sin perjuicio de lo anterior, ningún sistema de transmisión de datos por Internet
                    es completamente seguro, por lo que no podemos garantizar una seguridad absoluta.
                  </p>
                </section>

                <section id="derechos" className="privacy-section">
                  <h2>9. Tus derechos</h2>
                  <p>
                    De acuerdo con la Ley N.° 25.326 de Protección de los Datos Personales de
                    Argentina y normativa aplicable, tenés derecho a:
                  </p>
                  <ul className="privacy-list">
                    <li><strong>Acceder</strong> a los datos personales que tenemos sobre vos.</li>
                    <li><strong>Rectificar</strong> datos incorrectos o incompletos.</li>
                    <li><strong>Suprimir</strong> tus datos personales (derecho al olvido), en los casos previstos por la ley.</li>
                    <li><strong>Oponerte</strong> al tratamiento de tus datos en determinadas circunstancias.</li>
                    <li><strong>Revocar</strong> el consentimiento otorgado en cualquier momento.</li>
                  </ul>
                  <p>
                    Para ejercer cualquiera de estos derechos, escribinos a{' '}
                    <a href="mailto:contacto@garciainversiones.com.ar">contacto@garciainversiones.com.ar</a>{' '}
                    indicando tu solicitud. Responderemos en un plazo razonable.
                  </p>
                  <p>
                    La Agencia de Acceso a la Información Pública (AAIP) es el organismo de control en
                    materia de datos personales en Argentina.
                  </p>
                </section>

                <section id="cookies" className="privacy-section">
                  <h2>10. Cookies</h2>
                  <p>
                    Las cookies son pequeños archivos de texto que los sitios web almacenan en tu
                    dispositivo. Este sitio utiliza cookies propias y de terceros para los siguientes
                    fines:
                  </p>
                  <ul className="privacy-list">
                    <li><strong>Funcionamiento del sitio:</strong> cookies técnicas necesarias para que el sitio funcione correctamente.</li>
                    <li><strong>Analítica:</strong> cookies de Google Analytics para medir el uso del sitio de forma estadística y agregada.</li>
                    <li><strong>Publicidad:</strong> cookies de Google Ads y Meta Pixel para medir conversiones y mostrar anuncios relevantes.</li>
                  </ul>
                  <p>
                    Podés configurar tu navegador para bloquear o eliminar las cookies. Ten en cuenta
                    que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio.
                  </p>
                </section>

                <section id="cambios" className="privacy-section">
                  <h2>11. Cambios en esta política</h2>
                  <p>
                    Podemos actualizar esta Política de Privacidad periódicamente para reflejar
                    cambios en nuestras prácticas, en las herramientas que utilizamos o en la
                    legislación aplicable. Cuando realicemos cambios sustanciales, actualizaremos la
                    fecha indicada al inicio de este documento.
                  </p>
                </section>

                <section id="contacto-privacidad" className="privacy-section">
                  <h2>12. Contacto</h2>
                  <p>
                    Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de tus
                    datos personales, podés contactarnos por los siguientes medios:
                  </p>
                  <div className="privacy-card">
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href="mailto:contacto@garciainversiones.com.ar">contacto@garciainversiones.com.ar</a>
                    </p>
                    <p>
                      <strong>WhatsApp:</strong>{' '}
                      <a href="https://wa.me/5491167240353" target="_blank" rel="noopener">
                        +54 9 11 6724-0353
                      </a>
                    </p>
                    <p>
                      <strong>Sitio web:</strong>{' '}
                      <a href="https://www.garciainversionesinmobiliarias.com.ar">
                        www.garciainversionesinmobiliarias.com.ar
                      </a>
                    </p>
                  </div>
                </section>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
