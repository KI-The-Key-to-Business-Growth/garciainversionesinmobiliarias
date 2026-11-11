import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import ConsentSettingsLink from '@/components/consent/ConsentSettingsLink';

export const metadata: Metadata = {
  title: 'Política de Privacidad | García Inversiones Inmobiliarias',
  description:
    'Política de privacidad de García Inversiones Inmobiliarias: qué datos recopilamos, cómo los usamos y cuáles son tus derechos.',
  alternates: { canonical: '/privacidad' },
};

// ── ESTADO DE ESTE TEXTO ─────────────────────────────────────────────────────
// BORRADOR PARA REVISIÓN JURÍDICA. NO está validado por un profesional ni debe presentarse como
// aprobado. Cada dato que no se pudo comprobar figura como «[A CONFIRMAR: …]» (componente
// `Pendiente`). El texto NO puede publicarse mientras queden pendientes: ver el control de
// publicación en tests/privacy/privacy-page.test.ts (PRIVACY_PUBLISH_CHECK=1) y
// docs/ai/PRIVACIDAD_REVISION.md (hechos técnicos comprobados frente a decisiones jurídicas).
// Al validarse el texto: quitar los `Pendiente`, esta nota y actualizar la fecha de arriba.

// grupo B = dato que debe aportar García; grupo C = criterio jurídico (asesor). Los pendientes de
// grupo A (técnicos) se resolvieron en el código y ya no figuran.
function Pendiente({ children, grupo }: { children: ReactNode; grupo: 'B' | 'C' }) {
  return (
    <span data-privacy-pending="true" data-privacy-group={grupo}>
      [A CONFIRMAR: {children}]
    </span>
  );
}

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
  ['proveedores', 'Proveedores y transferencias internacionales'],
  ['conservacion', 'Conservación de los datos'],
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
                  <h2>1. Identificación del responsable</h2>
                  <p>
                    El responsable del tratamiento de los datos personales recabados a través de
                    este sitio web es:
                  </p>
                  <div className="privacy-card">
                    <p>
                      <strong>Fabiana García</strong>, persona humana, que opera bajo el nombre
                      comercial <strong>García Inversiones Inmobiliarias</strong>.
                    </p>
                    <p>
                      Denominación legal completa:{' '}
                      <Pendiente grupo="B">
                        nombre completo según documento de identidad o constancia fiscal (el padrón
                        profesional la registra como «María Fabiana García»)
                      </Pendiente>
                    </p>
                    <p>Matrícula profesional: CMCPSI 6378.</p>
                    <p>
                      CUIT:{' '}
                      <Pendiente grupo="C">
                        CUIT, desde documentación oficial, y si el asesor considera obligatorio
                        exhibirlo en esta política
                      </Pendiente>
                    </p>
                    <p>
                      Domicilio: Hipólito Yrigoyen 1470, El Talar (CP 1618), Partido de Tigre,
                      Provincia de Buenos Aires, Argentina.{' '}
                      <Pendiente grupo="C">
                        cómo denominarlo (legal, de contacto o constituido); el padrón profesional
                        publica otro domicilio
                      </Pendiente>
                    </p>
                    <p>
                      El domicilio informado es el que la titular indica a los fines de esta política.
                      No constituye una oficina comercial ni un establecimiento de atención al
                      público. Las consultas y reuniones se coordinan previamente a través de
                      nuestros canales oficiales de contacto.
                    </p>
                    <p>
                      Sitio web:{' '}
                      <a href="https://www.garciainversionesinmobiliarias.com.ar">
                        www.garciainversionesinmobiliarias.com.ar
                      </a>
                    </p>
                    <p>
                      Correo de contacto:{' '}
                      <a href="mailto:fabiana@garciainversiones.com.ar">
                        fabiana@garciainversiones.com.ar
                      </a>{' '}
                      <Pendiente grupo="B">
                        comprobar la escritura exacta de la casilla, que recibe mensajes y que está bajo el
                        control de la titular
                      </Pendiente>
                    </p>
                  </div>
                </section>

                <section id="datos-recopilados" className="privacy-section">
                  <h2>2. Datos que recopilamos</h2>
                  <p>
                    Podemos recopilar los siguientes tipos de información personal cuando
                    interactuás con nuestro sitio:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Datos de identificación:</strong> nombre y apellido.
                    </li>
                    <li>
                      <strong>Datos de contacto:</strong> dirección de correo electrónico y número
                      de teléfono o WhatsApp.
                    </li>
                    <li>
                      <strong>Información de la consulta:</strong> motivo de la consulta y mensaje
                      que nos enviás a través del formulario de contacto.
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
                    <li>
                      <strong>Datos técnicos de conexión:</strong> como la dirección IP, el tipo de
                      navegador y de dispositivo, que reciben nuestros proveedores de alojamiento, de
                      seguridad y de medición cuando se carga el sitio (ver sección 11).
                    </li>
                    <li>
                      <strong>Referencia técnica de WhatsApp:</strong> cuando seleccionás un enlace de
                      WhatsApp de nuestro sitio, según lo que hayas aceptado (ver sección 6).
                    </li>
                    <li>
                      <strong>Conversaciones de WhatsApp:</strong> si decidís iniciar una conversación,
                      la información que nos proporcionás en ella.
                    </li>
                  </ul>
                  <p>
                    No solicitamos intencionalmente datos sensibles (según la legislación vigente)
                    ni datos de menores de 18 años. Si sos menor, por favor no envíes tus datos a
                    través de este sitio.
                  </p>
                </section>

                <section id="finalidad" className="privacy-section">
                  <h2>3. Finalidad del tratamiento</h2>
                  <p>
                    Los datos personales que nos proporcionás se utilizan exclusivamente para los
                    siguientes fines:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      Responder consultas comerciales e inmobiliarias enviadas a través de los
                      formularios del sitio o de WhatsApp.
                    </li>
                    <li>
                      Enviar información sobre propiedades, oportunidades de inversión y novedades
                      del mercado (únicamente si te suscribiste al newsletter).
                    </li>
                    <li>Gestionar la relación comercial con potenciales y actuales clientes.</li>
                    <li>
                      Mejorar la experiencia del usuario y el rendimiento del sitio web mediante
                      datos estadísticos, agregados o seudonimizados, según la configuración de cada
                      herramienta.
                    </li>
                    <li>Medir la efectividad de nuestras campañas publicitarias.</li>
                    <li>
                      Conocer qué propiedades, desarrollos u oportunidades generan consultas a través
                      de los enlaces de WhatsApp, únicamente según tu consentimiento (ver sección 6).
                    </li>
                    <li>Proteger el sitio y los formularios frente a spam y usos automatizados.</li>
                  </ul>
                </section>

                <section id="formularios" className="privacy-section">
                  <h2>4. Formularios de contacto</h2>
                  <p>
                    Cuando completás y enviás el formulario de contacto o el formulario de consulta
                    por una propiedad, los datos ingresados son utilizados para:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      Responderte de manera personalizada a través de los canales que nos indicaste
                      (email, WhatsApp o teléfono).
                    </li>
                    <li>
                      Registrar o gestionar la consulta en nuestro sistema de gestión de clientes
                      (CRM), cuando corresponda, para asegurar un seguimiento adecuado.
                    </li>
                    <li>
                      Contactarte con información adicional relacionada con la propiedad o servicio
                      de tu interés.
                    </li>
                  </ul>
                  <p>
                    Para proteger los formularios del spam, usamos una verificación de Cloudflare
                    (Turnstile) que analiza señales técnicas de tu navegador, como la dirección IP,
                    para distinguir a las personas de los programas automáticos. Esta verificación
                    funciona aunque rechaces las cookies opcionales.
                  </p>
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
                    <li>
                      Novedades sobre propiedades destacadas y nuevas oportunidades de inversión.
                    </li>
                    <li>Información sobre mercados inmobiliarios nacionales e internacionales.</li>
                    <li>Contenido de valor relacionado con el real estate.</li>
                  </ul>
                  <p>
                    La suscripción es completamente voluntaria. Podés darte de baja en cualquier
                    momento escribiéndonos a{' '}
                    <a href="mailto:fabiana@garciainversiones.com.ar">
                      fabiana@garciainversiones.com.ar
                    </a>{' '}
                    con el asunto &quot;Baja newsletter&quot;.
                  </p>
                </section>

                <section id="herramientas" className="privacy-section">
                  <h2>6. Herramientas de analítica y publicidad</h2>
                  <p>
                    Este sitio utiliza herramientas de medición, analítica y publicidad
                    digital, tales como <strong>Google Analytics 4</strong>,{' '}
                    <strong>Google Tag Manager</strong>, <strong>Meta Pixel</strong> y{' '}
                    <strong>Google Ads</strong>, con el objetivo de analizar el uso del sitio, medir
                    conversiones, mejorar la experiencia del usuario y optimizar campañas
                    publicitarias.
                  </p>
                  <p>
                    Estas herramientas pueden recopilar información técnica y de navegación, como
                    páginas visitadas, origen del tráfico, interacciones realizadas, dispositivo
                    utilizado y eventos de conversión. La información se utiliza de forma
                    estadística, agregada o asociada a identificadores técnicos de navegación, según
                    la configuración de cada plataforma.
                  </p>
                  <div className="privacy-tool-block">
                    <h3>Google Analytics 4</h3>
                    <p>
                      Utilizamos Google Analytics 4 para analizar el comportamiento de los usuarios
                      en el sitio. Para más información, podés consultar la{' '}
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Política de privacidad de Google
                      </a>
                      .
                    </p>
                  </div>
                  <div className="privacy-tool-block">
                    <h3>Meta Pixel</h3>
                    <p>
                      Podemos utilizar Meta Pixel para medir la efectividad de anuncios en Facebook
                      e Instagram, crear audiencias y mostrar publicidad relevante. Meta puede usar
                      la información que recibe también para sus propios fines, conforme a su
                      política. Para más información, consultá la{' '}
                      <a
                        href="https://www.facebook.com/privacy/policy/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
                      <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Política de privacidad de Google
                      </a>
                      .
                    </p>
                  </div>
                  <p>
                    Estas herramientas utilizan <strong>cookies</strong> propias y de terceros para
                    su funcionamiento. <strong>No se activan hasta que las aceptás</strong> en el
                    aviso de cookies, y podés rechazarlas o retirar tu consentimiento en cualquier
                    momento (ver sección 10).
                  </p>
                  <p>
                    Los datos que escribís en nuestros formularios (nombre, correo electrónico,
                    teléfono y mensaje) no se incorporan a los eventos que enviamos a Google
                    Analytics, Google Tag Manager ni Meta. Sin embargo, cuando estas herramientas se
                    cargan, sus proveedores reciben por sí mismos datos técnicos del navegador y de
                    la conexión, como la dirección IP, el tipo de navegador y de dispositivo y los
                    identificadores de sus propias cookies, y los tratan conforme a sus propias
                    políticas.
                  </p>
                  <div className="privacy-tool-block">
                    <h3>Origen de la visita</h3>
                    <p>
                      Si aceptás las cookies de analítica o de publicidad, guardamos en tu
                      dispositivo, por hasta 90 días, el origen de tu visita (por ejemplo, el anuncio
                      o la campaña desde la que llegaste, la página de entrada y el sitio de
                      referencia) junto con un identificador de sesión. Si nos enviás una consulta,
                      asociamos esa información a la consulta para saber qué campañas generan
                      oportunidades reales; no incluye tus datos de contacto. Si rechazás las
                      cookies opcionales, no guardamos esta información.
                    </p>
                  </div>
                  <div className="privacy-tool-block" id="whatsapp-origen">
                    <h3>Enlaces de WhatsApp y origen de consultas</h3>
                    <p>
                      Cuando seleccionás un enlace de WhatsApp de nuestro sitio, se prepara un
                      mensaje relacionado con la propiedad, el desarrollo o la oportunidad que
                      estabas consultando. El mensaje incluye una referencia técnica aleatoria que no
                      incorpora directamente tu nombre, teléfono ni correo electrónico.
                    </p>
                    <p>
                      Si aceptaste las cookies de analítica o de publicidad, podemos registrar esa
                      referencia junto con la propiedad o el desarrollo consultado y la página desde
                      la cual accediste al enlace. Si aceptaste las cookies de publicidad, además
                      podemos asociar esa interacción con información sobre el origen de tu visita y
                      la campaña publicitaria correspondiente, incluidos identificadores técnicos de
                      publicidad (por ejemplo, identificadores de clic y del navegador). Si aceptaste
                      solo las de analítica, no guardamos datos de campañas ni identificadores
                      publicitarios en ese registro.
                    </p>
                    <p>
                      Si rechazaste ambas opciones, no conservamos ese registro de clic. Copiar el
                      enlace sin abrirlo tampoco genera un registro.
                    </p>
                    <p>
                      Seleccionar un enlace no significa que hayas enviado un mensaje. Si decidís
                      iniciar la conversación, esta se realiza mediante WhatsApp, un servicio de
                      Meta, que trata la información conforme a sus propias condiciones y política de
                      privacidad. García utiliza la información que nos proporcionás en la
                      conversación para responder tu consulta y gestionar el seguimiento comercial
                      correspondiente. Esas conversaciones se mantienen en la aplicación de
                      WhatsApp Business, atendida personalmente por la titular. Las consultas
                      comerciales relevantes se registran manualmente en el CRM 2Clics; no se leen
                      ni se procesan las conversaciones de forma automática.
                    </p>
                  </div>
                </section>

                <section id="no-venta" className="privacy-section">
                  <h2>7. No vendemos tus datos</h2>
                  <p>
                    García Inversiones Inmobiliarias <strong>no vende</strong> tus datos personales de
                    contacto (nombre, correo electrónico, teléfono) ni el contenido de tus consultas.
                    Tus datos podrán ser compartidos únicamente en los siguientes supuestos:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Proveedores de servicios:</strong> empresas que nos asisten en la
                      operación del sitio (alojamiento, base de datos, correo electrónico, CRM,
                      seguridad), únicamente para prestar el servicio contratado. Los detallamos en la
                      sección 11.
                    </li>
                    <li>
                      <strong>Plataformas de medición y publicidad:</strong> solo si aceptaste las
                      cookies correspondientes. Reciben datos técnicos y de uso, no tus datos de
                      contacto, y pueden tratarlos conforme a sus propias políticas (ver sección 6).
                    </li>
                    <li>
                      <strong>WhatsApp (Meta):</strong> si iniciás una conversación con nosotros.
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
                    Aplicamos medidas técnicas y organizativas razonables para proteger la
                    información personal que nos proporcionás frente a accesos no autorizados,
                    alteración, divulgación o destrucción. Entre ellas:
                  </p>
                  <ul className="privacy-list">
                    <li>Transmisión de datos mediante conexión HTTPS/TLS.</li>
                    <li>
                      Validación y sanitización de los datos recibidos a través de los formularios.
                    </li>
                    <li>Limitación de acceso interno a la información confidencial.</li>
                    <li>
                      Almacenamiento de datos en proveedores con estándares de seguridad
                      reconocidos.
                    </li>
                  </ul>
                  <p>
                    Sin perjuicio de lo anterior, ningún sistema de transmisión de datos por
                    Internet es completamente seguro, por lo que no podemos garantizar una seguridad
                    absoluta.
                  </p>
                </section>

                <section id="derechos" className="privacy-section">
                  <h2>9. Tus derechos</h2>
                  <p>
                    De acuerdo con la Ley N.° 25.326 de Protección de los Datos Personales de
                    Argentina y normativa aplicable, tenés derecho a:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Acceder</strong> a los datos personales que tenemos sobre vos.
                    </li>
                    <li>
                      <strong>Rectificar y actualizar</strong> datos incorrectos, incompletos o
                      desactualizados.
                    </li>
                    <li>
                      <strong>Suprimir</strong> tus datos personales (derecho al olvido), en los
                      casos previstos por la ley.
                    </li>
                    <li>
                      <strong>Oponerte</strong> al tratamiento de tus datos en determinadas
                      circunstancias.
                    </li>
                    <li>
                      <strong>Revocar</strong> el consentimiento otorgado en cualquier momento.
                    </li>
                  </ul>
                  <p>
                    Para ejercer cualquiera de estos derechos, escribinos a{' '}
                    <a href="mailto:fabiana@garciainversiones.com.ar">
                      fabiana@garciainversiones.com.ar
                    </a>{' '}
                    indicando tu solicitud y los datos necesarios para identificarte.
                  </p>
                  <p>
                    El derecho de acceso es gratuito y puede ejercerse a intervalos no inferiores a
                    seis meses, salvo que acredites un interés legítimo. Responderemos las solicitudes
                    de acceso dentro de los diez (10) días corridos de recibido tu reclamo, y las de
                    rectificación, actualización o supresión dentro de los cinco (5) días hábiles.{' '}
                    <Pendiente grupo="C">
                      validar estos plazos (arts. 14 y 16 de la Ley 25.326, según el texto vigente) y
                      el procedimiento interno para cumplirlos
                    </Pendiente>
                  </p>
                  <p>
                    La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control de
                    la Ley N.° 25.326 y tiene la atribución de atender las denuncias y reclamos de
                    quienes resulten afectados en sus derechos. Podés comunicarte con ella en{' '}
                    <a
                      href="https://www.argentina.gob.ar/aaip/datospersonales"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      www.argentina.gob.ar/aaip/datospersonales
                    </a>
                    . <Pendiente grupo="C">leyenda exacta exigida por la normativa vigente, y datos de contacto de la AAIP</Pendiente>
                  </p>
                </section>

                <section id="cookies" className="privacy-section">
                  <h2>10. Cookies</h2>
                  <p>
                    Las cookies son pequeños archivos de texto que los sitios web almacenan en tu
                    dispositivo. Este sitio utiliza cookies propias y de terceros para los
                    siguientes fines:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Funcionamiento del sitio:</strong> cookies técnicas necesarias para
                      que el sitio funcione correctamente, incluida una cookie propia donde guardamos
                      tu elección sobre las cookies por hasta 180 días.
                    </li>
                    <li>
                      <strong>Analítica (opcional):</strong> cookies de Google Analytics para medir
                      el uso del sitio de forma estadística y agregada, y registro de los clics hacia
                      WhatsApp según lo descripto en la sección 6.
                    </li>
                    <li>
                      <strong>Publicidad (opcional):</strong> cookies de Google Ads y Meta Pixel para medir
                      conversiones y mostrar anuncios relevantes, y asociación de los clics hacia
                      WhatsApp con la campaña de origen.
                    </li>
                  </ul>
                  <p>
                    Las cookies de analítica y de publicidad son <strong>opcionales</strong>: solo se
                    activan si las aceptás en el aviso que aparece al ingresar al sitio. Si las
                    rechazás, el sitio, los formularios, la verificación de seguridad y los enlaces a
                    WhatsApp siguen funcionando con normalidad.
                  </p>
                  <p>
                    Podés cambiar tu elección o retirar tu consentimiento en cualquier momento desde{' '}
                    <ConsentSettingsLink className="consent-inline-link" />. Al retirarlo, eliminamos las
                    cookies de medición y la información de origen de visita guardada en tu
                    dispositivo.
                  </p>
                  <p>
                    Algunas páginas de propiedades y desarrollos incluyen un mapa de Google Maps. El mapa no
                    se carga al abrir la página: aparece un aviso con el botón «Cargar mapa» y solo
                    se muestra cuando lo pedís, o automáticamente si aceptaste las cookies de
                    publicidad. Al cargarse, Google puede recibir tu dirección IP y datos de tu
                    navegador y, según el caso, usar sus propias cookies, conforme a sus políticas.
                    El enlace «Abrir en Google Maps» abre el sitio de Google en otra pestaña. Los
                    videos y recorridos virtuales son enlaces: no se cargan dentro de esta web.
                  </p>
                  <p>
                    También podés configurar tu navegador para bloquear o eliminar las cookies. Tené
                    en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del
                    sitio.
                  </p>
                </section>

                <section id="proveedores" className="privacy-section">
                  <h2>11. Proveedores y transferencias internacionales</h2>
                  <p>
                    Para operar este sitio nos apoyamos en los siguientes proveedores. Cada uno
                    recibe solo la información necesaria para su función:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>Vercel (alojamiento):</strong> recibe los datos de conexión (como la
                      dirección IP y las páginas solicitadas) y los registros técnicos del servicio.
                      Las funciones del sitio se ejecutan en Washington D. C., Estados Unidos.
                    </li>
                    <li>
                      <strong>Supabase (base de datos):</strong> guarda las suscripciones al
                      newsletter y los registros técnicos de origen de las consultas y de clics a
                      WhatsApp (sin tu nombre, correo ni teléfono). Ubicación:{' '}
                      <Pendiente grupo="B">región del proyecto de Supabase</Pendiente>
                    </li>
                    <li>
                      <strong>Resend (correo electrónico):</strong> procesa los avisos internos de
                      cada consulta, que incluyen los datos que ingresaste (nombre, correo, teléfono
                      y mensaje). Los envíos se realizan desde la región de São Paulo (Brasil); según el proveedor, los datos de su cuenta se alojan en los Estados Unidos.
                    </li>
                    <li>
                      <strong>2Clics (CRM):</strong> recibe los datos de tus consultas para su
                      seguimiento comercial y, cuando aceptaste las cookies correspondientes, una nota
                      con el origen de la consulta. Ubicación y condiciones:{' '}
                      <Pendiente grupo="B">ubicación del tratamiento y contrato de 2Clics</Pendiente>
                    </li>
                    <li>
                      <strong>Cloudflare (verificación anti-spam y DNS):</strong> recibe señales
                      técnicas de tu navegador (como la dirección IP) al verificar los formularios.
                    </li>
                    <li>
                      <strong>Upstash (límite de solicitudes):</strong> procesa de forma temporal la
                      dirección IP asociada a contadores para limitar abusos. Ubicación:{' '}
                      <Pendiente grupo="B">región de la base de Upstash</Pendiente>
                    </li>
                    <li>
                      <strong>Sentry (monitoreo de errores):</strong> recibe información técnica de
                      errores del servidor; está configurado sin el envío automático de datos
                      personales. Ubicación: <Pendiente grupo="B">región de la organización de Sentry</Pendiente>
                    </li>
                    <li>
                      <strong>Google y Meta:</strong> analítica, publicidad y WhatsApp, según las
                      secciones 6 y 10.
                    </li>
                  </ul>
                  <p>
                    Algunos de estos proveedores tratan información fuera de la Argentina, en
                    particular en los Estados Unidos.{' '}
                    <Pendiente grupo="C">
                      redacción sobre las transferencias internacionales y su base jurídica (art. 12
                      de la Ley 25.326: nivel adecuado, cláusulas contractuales modelo aprobadas por
                      la AAIP u otra), según la documentación de cada proveedor; no afirmar garantías
                      que no estén documentadas
                    </Pendiente>
                  </p>
                </section>

                <section id="conservacion" className="privacy-section">
                  <h2>12. Conservación de los datos</h2>
                  <p>
                    Conservamos los datos solo durante el tiempo necesario para las finalidades
                    descriptas, y los eliminamos o anonimizamos cuando dejan de ser necesarios. Los
                    plazos dependen de dónde se guarda cada dato:
                  </p>
                  <ul className="privacy-list">
                    <li>
                      <strong>En tu navegador:</strong> el origen de tu visita, por hasta 90 días, y
                      tu elección sobre las cookies, por hasta 180 días. Podés borrarlos en cualquier
                      momento (ver sección 10).
                    </li>
                    <li>
                      <strong>Registros técnicos de clics hacia WhatsApp (nuestra base de datos):</strong>{' '}
                      hasta 90 días y luego se eliminan automáticamente.{' '}
                      <Pendiente grupo="C">
                        plazo de 90 días en estudio; no publicar como compromiso hasta aprobar la
                        política y activar la eliminación automática
                      </Pendiente>
                    </li>
                    <li>
                      <strong>Registros de origen de consultas por formulario y suscripciones al newsletter:</strong>{' '}
                      <Pendiente grupo="C">plazo de conservación</Pendiente>
                    </li>
                    <li>
                      <strong>Contactos y negocios en nuestro CRM:</strong>{' '}
                      <Pendiente grupo="C">plazo de conservación (decisión comercial y jurídica)</Pendiente>
                    </li>
                    <li>
                      <strong>Conversaciones de WhatsApp Business y correos de consulta:</strong>{' '}
                      <Pendiente grupo="C">plazo de conservación (decisión comercial y jurídica)</Pendiente>
                    </li>
                  </ul>
                  <p>
                    Los proveedores de analítica, publicidad y alojamiento conservan la información
                    que reciben según sus propias políticas.
                  </p>
                </section>

                <section id="cambios" className="privacy-section">
                  <h2>13. Cambios en esta política</h2>
                  <p>
                    Podemos actualizar esta Política de Privacidad periódicamente para reflejar
                    cambios en nuestras prácticas, en las herramientas que utilizamos o en la
                    legislación aplicable. Cuando realicemos cambios sustanciales, actualizaremos la
                    fecha indicada al inicio de este documento.
                  </p>
                </section>

                <section id="contacto-privacidad" className="privacy-section">
                  <h2>14. Contacto</h2>
                  <p>
                    Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de
                    tus datos personales, podés contactarnos por los siguientes medios:
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
