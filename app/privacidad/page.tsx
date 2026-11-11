import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import ConsentSettingsLink from '@/components/consent/ConsentSettingsLink';

export const metadata: Metadata = {
  title: 'Política de Privacidad | García Inversiones Inmobiliarias',
  description:
    'Política de privacidad de García Inversiones Inmobiliarias: qué datos recopilamos, para qué los usamos, qué herramientas utilizamos y cuáles son tus derechos.',
  alternates: { canonical: '/privacidad' },
};

// ── ESTADO DE ESTE TEXTO ─────────────────────────────────────────────────────
// BORRADOR PARA REVISIÓN JURÍDICA. NO está validado por un abogado ni debe presentarse como
// aprobado. Esta nota es el control de publicación: mientras exista, `PRIVACY_PUBLISH_CHECK=1 npm test`
// falla (tests/privacy/privacy-page.test.ts). Las cuestiones que el abogado debe resolver están en
// docs/ai/PRIVACIDAD_ASESOR_JURIDICO.md; el resto de la documentación, en docs/ai/PRIVACIDAD_REVISION.md.
// Al validarse el texto: quitar esta nota y actualizar la fecha de abajo. Un dato sin confirmar se
// marca en el texto con «[A CONFIRMAR: …]» y también bloquea la publicación.

const INDEX = [
  ['identificacion', 'Quién es la responsable'],
  ['datos', 'Qué datos recopilamos'],
  ['finalidad', 'Para qué usamos tus datos'],
  ['formularios', 'Formularios, consultas y newsletter'],
  ['whatsapp', 'WhatsApp'],
  ['analitica', 'Analítica y publicidad'],
  ['cookies', 'Cookies y contenidos de terceros'],
  ['proveedores', 'Proveedores y transferencias fuera de Argentina'],
  ['conservacion', 'Conservación de los datos'],
  ['seguridad', 'Seguridad'],
  ['derechos', 'Tus derechos'],
  ['cambios-contacto', 'Cambios y contacto'],
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
            <p className="privacy-hero-sub">Última actualización: noviembre de 2026</p>
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
                  <h2>1. Quién es la responsable</h2>
                  <p>
                    La responsable del tratamiento de los datos personales recabados a través de
                    este sitio web es:
                  </p>
                  <div className="privacy-card">
                    <p>
                      <strong>María Fabiana García</strong>, persona humana, titular de{' '}
                      <strong>García Inversiones Inmobiliarias</strong>.
                    </p>
                    <p>Matrícula profesional: CMCPSI 6378.</p>
                    <p>
                      Domicilio: Hipólito Yrigoyen 1470, El Talar (CP 1618), Partido de Tigre,
                      Provincia de Buenos Aires, Argentina.
                    </p>
                    <p>
                      Correo electrónico:{' '}
                      <a href="mailto:fabiana@garciainversiones.com.ar">
                        fabiana@garciainversiones.com.ar
                      </a>
                    </p>
                    <p>
                      Sitio web:{' '}
                      <a href="https://www.garciainversionesinmobiliarias.com.ar">
                        www.garciainversionesinmobiliarias.com.ar
                      </a>
                    </p>
                  </div>
                  <p>
                    El domicilio informado es el que la titular indica a los fines de esta política.
                    No constituye una oficina comercial ni un establecimiento de atención al
                    público. Las consultas y reuniones se coordinan previamente a través de nuestros
                    canales oficiales de contacto.
                  </p>
                </section>

                <section id="datos" className="privacy-section">
                  <h2>2. Qué datos recopilamos</h2>
                  <ul className="privacy-list">
                    <li>
                      <strong>Datos que nos proporcionás:</strong> nombre y apellido, correo
                      electrónico, teléfono o WhatsApp, y el motivo y el mensaje de tu consulta,
                      cuando completás un formulario, te suscribís al newsletter o nos escribís por
                      WhatsApp.
                    </li>
                    <li>
                      <strong>Datos técnicos de navegación:</strong> páginas visitadas, origen de la
                      visita, tipo de navegador y de dispositivo, y la dirección IP, que reciben
                      nuestros proveedores de alojamiento, seguridad y medición cuando se carga el
                      sitio. Las herramientas de analítica y publicidad solo se activan si las
                      aceptás (ver secciones 6 y 7).
                    </li>
                    <li>
                      <strong>Referencia técnica de WhatsApp:</strong> cuando seleccionás un enlace
                      de WhatsApp del sitio, según lo que hayas aceptado (ver sección 5).
                    </li>
                  </ul>
                  <p>
                    No solicitamos intencionalmente datos sensibles ni datos de menores de 18 años.
                    Si sos menor, por favor no envíes tus datos a través de este sitio.
                  </p>
                </section>

                <section id="finalidad" className="privacy-section">
                  <h2>3. Para qué usamos tus datos</h2>
                  <ul className="privacy-list">
                    <li>Responder tus consultas comerciales e inmobiliarias.</li>
                    <li>Gestionar el seguimiento y la relación comercial con quienes nos consultan.</li>
                    <li>
                      Enviarte información sobre propiedades y novedades del mercado, únicamente si
                      te suscribiste al newsletter.
                    </li>
                    <li>
                      Conocer el uso del sitio y qué propiedades, desarrollos y campañas generan
                      consultas, según lo que hayas aceptado en el aviso de cookies.
                    </li>
                    <li>Proteger el sitio y los formularios frente al spam y usos automatizados.</li>
                  </ul>
                  <p>
                    No vendemos tus datos de contacto ni el contenido de tus consultas. Los
                    compartimos solo con los proveedores que nos permiten operar el sitio (sección
                    8), con las plataformas de medición y publicidad si aceptaste sus cookies
                    (sección 6), con WhatsApp si iniciás una conversación, y cuando una autoridad
                    competente lo exija conforme a la ley.
                  </p>
                </section>

                <section id="formularios" className="privacy-section">
                  <h2>4. Formularios, consultas y newsletter</h2>
                  <p>
                    Los datos que ingresás en los formularios de contacto o de consulta por una
                    propiedad se usan para responderte por el medio que nos indicaste y para
                    registrar la consulta y darle seguimiento en nuestro sistema de gestión de
                    clientes (CRM), cuando corresponda. Cada consulta se notifica internamente por correo
                    electrónico. No usamos tus datos de contacto para
                    enviarte comunicaciones no relacionadas con tu consulta sin tu consentimiento.
                  </p>
                  <p>
                    Para proteger los formularios del spam usamos una verificación de Cloudflare
                    (Turnstile), que analiza señales técnicas de tu navegador, como la dirección IP.
                    Funciona aunque rechaces las cookies opcionales.
                  </p>
                  <p>
                    La suscripción al newsletter es voluntaria. Podés darte de baja en cualquier
                    momento escribiendo a{' '}
                    <a href="mailto:fabiana@garciainversiones.com.ar">
                      fabiana@garciainversiones.com.ar
                    </a>{' '}
                    con el asunto «Baja newsletter».
                  </p>
                </section>

                <section id="whatsapp" className="privacy-section">
                  <h2>5. WhatsApp</h2>
                  <p>
                    Al seleccionar un enlace de WhatsApp de este sitio se prepara un mensaje
                    relacionado con la propiedad, el desarrollo o la oportunidad que estabas
                    viendo, con una referencia técnica aleatoria que no incorpora directamente tu
                    nombre, teléfono ni correo electrónico. Qué registramos depende de tu elección
                    en el aviso de cookies:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Si aceptaste solo las cookies de analítica:</strong> registramos la
                      referencia, la propiedad o el desarrollo consultado y la página de origen. No
                      guardamos datos de campañas ni identificadores publicitarios en ese registro.
                    </li>
                    <li>
                      <strong>Si aceptaste las cookies de publicidad:</strong> además asociamos el
                      clic con el origen de tu visita y la campaña, incluidos identificadores
                      técnicos de publicidad.
                    </li>
                    <li>
                      <strong>Si rechazaste ambas:</strong> no registramos el clic. Copiar el enlace
                      sin abrirlo tampoco genera un registro.
                    </li>
                  </ul>
                  <p>
                    Seleccionar un enlace no significa que hayas enviado un mensaje. Si decidís
                    iniciar la conversación, se realiza mediante WhatsApp, un servicio de Meta, que
                    trata la información conforme a sus propias condiciones y política de
                    privacidad. Las conversaciones se mantienen en la aplicación de WhatsApp
                    Business, atendida personalmente por la titular. Las consultas comerciales
                    relevantes se registran manualmente en nuestro CRM (2Clics); no se leen ni se
                    procesan las conversaciones de forma automática.
                  </p>
                </section>

                <section id="analitica" className="privacy-section">
                  <h2>6. Analítica y publicidad</h2>
                  <p>
                    Utilizamos <strong>Google Analytics 4</strong>, <strong>Google Tag Manager</strong>,{' '}
                    <strong>Meta Pixel</strong> y <strong>Google Ads</strong> para entender cómo se
                    usa el sitio, medir qué anuncios generan consultas y mejorar nuestras campañas.
                    Recopilan información técnica y de navegación (páginas visitadas, origen del
                    tráfico, interacciones, dispositivo y eventos de conversión), de forma
                    estadística o asociada a identificadores técnicos del navegador.{' '}
                    <strong>No se activan hasta que las aceptás</strong> en el aviso de cookies.
                  </p>
                  <p>
                    Los datos que escribís en nuestros formularios (nombre, correo, teléfono y
                    mensaje) no se incorporan a los eventos que enviamos a Google Analytics, Google
                    Tag Manager ni Meta. Sin embargo, cuando estas herramientas se cargan, sus
                    proveedores reciben por sí mismos datos técnicos del navegador y de la
                    conexión, como la dirección IP, y los tratan conforme a sus propias políticas:{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                      Google
                    </a>{' '}
                    y{' '}
                    <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">
                      Meta
                    </a>
                    . Meta puede usar la información que recibe también para sus propios fines.
                  </p>
                  <p>
                    Si aceptás las cookies de analítica o de publicidad, guardamos en tu
                    dispositivo, por hasta 90 días, el origen de tu visita (por ejemplo, el anuncio
                    o la campaña desde la que llegaste y la página de entrada) junto con un
                    identificador de sesión. Si nos enviás una consulta, asociamos esa información
                    a la consulta para saber qué campañas generan oportunidades reales; no incluye
                    tus datos de contacto. Si las rechazás, no guardamos esta información.
                  </p>
                </section>

                <section id="cookies" className="privacy-section">
                  <h2>7. Cookies y contenidos de terceros</h2>
                  <ul className="privacy-list">
                    <li>
                      <strong>Necesarias:</strong> permiten que el sitio y los formularios
                      funcionen, incluida una cookie propia donde guardamos tu elección sobre las
                      cookies por hasta 180 días.
                    </li>
                    <li>
                      <strong>Analítica (opcional):</strong> medición del uso del sitio y registro
                      básico de los clics hacia WhatsApp (sección 5).
                    </li>
                    <li>
                      <strong>Publicidad (opcional):</strong> medición de conversiones y anuncios, y
                      asociación de los clics hacia WhatsApp con la campaña de origen.
                    </li>
                  </ul>
                  <p>
                    Las opcionales solo se activan si las aceptás en el aviso que aparece al
                    ingresar. Si las rechazás, el sitio, los formularios, la verificación de
                    seguridad y los enlaces a WhatsApp siguen funcionando con normalidad. Podés
                    cambiar tu elección o retirar tu consentimiento en cualquier momento desde{' '}
                    <ConsentSettingsLink className="consent-inline-link" />. Al retirarlo,
                    eliminamos las cookies de medición y el origen de visita guardado en tu
                    dispositivo. También podés bloquear o borrar cookies desde tu navegador, lo que
                    puede afectar el funcionamiento de algunas partes del sitio.
                  </p>
                  <p>
                    Algunas fichas de propiedades y desarrollos incluyen un mapa de Google Maps. El
                    mapa no se carga al abrir la página: aparece un aviso con el botón «Cargar
                    mapa», y se muestra solo cuando lo pedís o si aceptaste las cookies de
                    publicidad. Al cargarse, Google puede recibir tu dirección IP y datos de tu
                    navegador y usar sus propias cookies, conforme a sus políticas. Los videos y
                    recorridos virtuales son enlaces: no se cargan dentro de este sitio.
                  </p>
                </section>

                <section id="proveedores" className="privacy-section">
                  <h2>8. Proveedores y transferencias fuera de Argentina</h2>
                  <p>
                    Para operar el sitio nos apoyamos en proveedores tecnológicos. Cada uno recibe la
                    información necesaria para su función:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Vercel:</strong> alojamiento del sitio. Las funciones del sitio se
                      ejecutan en Washington D. C., Estados Unidos.
                    </li>
                    <li>
                      <strong>Supabase:</strong> base de datos donde se guardan las suscripciones al
                      newsletter y los registros técnicos de origen de las consultas y de clics a
                      WhatsApp (sin tu nombre, correo ni teléfono).
                    </li>
                    <li>
                      <strong>Resend:</strong> envío de los avisos de cada consulta, que incluyen los
                      datos que ingresaste. Los envíos se realizan desde São Paulo (Brasil); según
                      el proveedor, los datos de su cuenta se alojan en Estados Unidos.
                    </li>
                    <li>
                      <strong>2Clics:</strong> sistema de gestión de clientes (CRM) donde se
                      registran las consultas para su seguimiento comercial y, si aceptaste las
                      cookies correspondientes, una nota con el origen de la consulta.
                    </li>
                    <li>
                      <strong>Cloudflare:</strong> verificación anti-spam de los formularios y DNS.
                    </li>
                    <li>
                      <strong>Upstash:</strong> límite de solicitudes para evitar abusos; procesa de
                      forma temporal la dirección IP.
                    </li>
                    <li>
                      <strong>Sentry:</strong> monitoreo de errores técnicos; está configurado sin el
                      envío automático de datos personales.
                    </li>
                    <li>
                      <strong>Google y Meta:</strong> analítica, publicidad y WhatsApp (secciones 5 y
                      6).
                    </li>
                  </ul>
                  <p>
                    Algunos de estos proveedores tratan información fuera de la Argentina, en
                    particular en Estados Unidos, donde el nivel de protección de los datos
                    personales puede ser distinto del argentino. Cada proveedor trata los datos
                    conforme a sus propias condiciones y políticas de privacidad, que podés
                    consultar en sus sitios.
                  </p>
                </section>

                <section id="conservacion" className="privacy-section">
                  <h2>9. Conservación de los datos</h2>
                  <p>
                    Conservamos los datos solo mientras sean necesarios para las finalidades
                    descriptas en esta política o para cumplir obligaciones legales:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>En tu navegador:</strong> el origen de tu visita, por hasta 90 días, y
                      tu elección sobre las cookies, por hasta 180 días. Podés borrarlos en
                      cualquier momento.
                    </li>
                    <li>
                      <strong>Registros técnicos de clics hacia WhatsApp:</strong> mientras sean
                      necesarios para conocer qué propiedades y campañas generan consultas.
                    </li>
                    <li>
                      <strong>Consultas, contactos y conversaciones:</strong> mientras sean
                      necesarios para responderte, dar seguimiento a la consulta y mantener la
                      relación comercial.
                    </li>
                    <li>
                      <strong>Newsletter:</strong> mientras estés suscripto; podés pedir la baja en
                      cualquier momento.
                    </li>
                  </ul>
                  <p>
                    Cuando dejan de ser necesarios, los eliminamos o dejamos de utilizarlos. Podés
                    pedir la supresión de tus datos en cualquier momento (sección 11). Los
                    proveedores de analítica, publicidad y alojamiento conservan la información
                    según sus propias políticas.
                  </p>
                </section>

                <section id="seguridad" className="privacy-section">
                  <h2>10. Seguridad</h2>
                  <p>
                    Aplicamos medidas técnicas y organizativas razonables para proteger tu
                    información frente a accesos no autorizados, alteración, divulgación o
                    destrucción: conexión cifrada (HTTPS), validación de los datos de los
                    formularios, acceso interno limitado y proveedores con estándares de seguridad
                    reconocidos. Ningún sistema de transmisión de datos por Internet es
                    completamente seguro, por lo que no podemos asegurar una protección absoluta.
                  </p>
                </section>

                <section id="derechos" className="privacy-section">
                  <h2>11. Tus derechos</h2>
                  <p>
                    De acuerdo con la Ley N.° 25.326 de Protección de los Datos Personales, podés
                    acceder a tus datos, rectificarlos y actualizarlos, solicitar su supresión,
                    oponerte a su tratamiento en los casos previstos y revocar el consentimiento que
                    hayas otorgado. Para ejercerlos, escribinos a{' '}
                    <a href="mailto:fabiana@garciainversiones.com.ar">
                      fabiana@garciainversiones.com.ar
                    </a>{' '}
                    indicando tu solicitud y los datos necesarios para identificarte.
                  </p>
                  <p>
                    El acceso es gratuito y puede ejercerse a intervalos no inferiores a seis meses,
                    salvo que acredites un interés legítimo. Respondemos las solicitudes de acceso
                    dentro de los diez (10) días corridos y las de rectificación, actualización o
                    supresión dentro de los cinco (5) días hábiles de recibido tu reclamo.
                  </p>
                  <p>
                    La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control de
                    la Ley N.° 25.326 y atiende las denuncias y reclamos de quienes consideren
                    afectados sus derechos:{' '}
                    <a
                      href="https://www.argentina.gob.ar/aaip/datospersonales"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      www.argentina.gob.ar/aaip/datospersonales
                    </a>
                    .
                  </p>
                </section>

                <section id="cambios-contacto" className="privacy-section">
                  <h2>12. Cambios y contacto</h2>
                  <p>
                    Podemos actualizar esta política para reflejar cambios en nuestras prácticas, en
                    las herramientas que usamos o en la ley; cuando sean sustanciales, actualizaremos
                    la fecha indicada al inicio. Para cualquier consulta, solicitud o reclamo sobre
                    tus datos personales:
                  </p>
                  <div className="privacy-card">
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href="mailto:fabiana@garciainversiones.com.ar">
                        fabiana@garciainversiones.com.ar
                      </a>
                    </p>
                    <p>
                      <strong>WhatsApp:</strong>{' '}
                      <a
                        href="https://wa.me/5491167240353"
                        target="_blank"
                        rel="noopener"
                        data-whatsapp-location="privacidad"
                      >
                        +54 9 11 6724-0353
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
