# /privacidad — propuesta consolidada para revisión (2026-11-11)

> **Estado: BORRADOR PARA REVISIÓN JURÍDICA. No está validado por un profesional, no está publicado y no cambia ninguna política vigente.** La implementación técnica no equivale a validación jurídica. Lo que hoy ve el público en `/privacidad` es la versión anterior (publicada el 2026-11-11, sin mención al enlace de WhatsApp con referencia).
>
> Rama `privacy/review-draft` (sin push, sin merge). Cada dato no comprobable figura como **`[A CONFIRMAR: …]`** y el control `PRIVACY_PUBLISH_CHECK=1 npm test` **falla mientras queden pendientes**: así el borrador no puede publicarse por accidente.

Este documento reemplaza a la versión anterior de `PRIVACIDAD_REVISION.md` y es la **única** referencia del tema: (1) qué cambió, (2) hechos técnicos comprobados, (3) texto completo propuesto, (4) cuestiones para el asesor, (5) conservación, (6) proveedores y transferencias, (7) datos del responsable, (8) derechos y AAIP, (9) otras jurisdicciones, (10) cómo publicar.

## 1. Qué cambió respecto de la política vigente
- **Nueva explicación de los enlaces de WhatsApp y el origen de consultas** (sección 6): referencia aleatoria, qué se registra con cada consentimiento, copiar no registra, clic ≠ mensaje, WhatsApp es un servicio de Meta.
- **Afirmaciones absolutas retiradas** (sección 6 y 7): «No enviamos tu nombre, correo ni teléfono a Google/Meta» pasa a distinguir **datos de formulario** (no se incorporan a los eventos) de **datos técnicos** que las plataformas reciben por sí mismas (IP, navegador, cookies propias). «No vende, alquila ni cede» se limita a «no vende datos de contacto ni el contenido de las consultas» y reconoce el papel de Google y Meta.
- **Secciones nuevas:** 11 *Proveedores y transferencias internacionales*, 12 *Conservación de los datos*. Los números de «Cambios» (13) y «Contacto» (14) se desplazaron; las referencias internas a las secciones 6 y 10 no cambian.
- **Datos del responsable:** razón social/CUIT y domicilio como pendientes; el correo `contacto@garciainversiones.com.ar` se conserva y queda marcado «comprobar».
- **Derechos:** se agrega *actualizar*, gratuidad y frecuencia del acceso, plazos de la ley (marcados a validar) y datos de la AAIP.
- **Cookies:** cookie propia de la elección (180 días) y descripción de los mapas de Google Maps, que ahora **no se cargan** hasta que el visitante lo pide o acepta publicidad (sección 11). Los videos y recorridos virtuales son enlaces, no contenido incrustado.
- **Banner/panel de cookies:** las descripciones de *Analítica* y *Publicidad* ahora mencionan el registro del clic hacia WhatsApp con el mismo alcance que la política. `CONSENT_VERSION` se subió a 2 en un commit **separado** (`f4ee99d`) para volver a preguntar una vez a todos (finalidad informada distinta); está pendiente de revisión y puede descartarse sin afectar el resto (evaluación en la sección 11).

## 2. Hechos técnicos comprobados (separados de las decisiones jurídicas)
| Afirmación de la política | Evidencia |
|---|---|
| Sin consentimiento no se registra el clic | `WHATSAPP_CLICK_REQUIRES_CONSENT = true`; prueba en producción 2026-11-11: rechazar cookies + clic = 0 llamadas y 0 filas |
| Solo analítica: registro básico, sin datos de campaña ni identificadores | `WHATSAPP_ATTRIBUTION_REQUIRES_MARKETING_CONSENT = true`; fila de prueba `id 2`: sin UTM, campaña, `fbclid`, `fbp` ni sesión |
| Publicidad: atribución completa | fila de prueba `id 3`: UTM, IDs de campaña/conjunto/anuncio, `fbclid`, sesión |
| Copiar el enlace no genera registro | prueba en producción (menú contextual): 0 filas; test unitario `isEffectiveWhatsAppClick` |
| La referencia es aleatoria (65 bits) y no contiene datos personales | `lib/whatsapp-ref.ts` (`crypto.getRandomValues`), 20.000 referencias sin repetir en pruebas |
| Clic ≠ mensaje recibido | `wa_message_received_at` y `wa_match_method` quedan en `NULL` (NO MEDIDO TODAVÍA) |
| Los datos de formulario no se incorporan a los eventos de GA4/Meta | `stripPii` descarta teléfono, correo, nombre y mensaje (tests); los eventos llevan IDs y datos de página |
| Las plataformas reciben IP y datos del navegador por sí mismas | inherente a cargar sus scripts; **no verificado** contra la página del Pixel de Meta (no se leyó) |
| Origen de la visita en el navegador: hasta 90 días; elección de cookies: 180 días | `ATTRIBUTION_TTL_DAYS = 90`, `CONSENT_MAX_AGE_DAYS = 180` (tests de consistencia) |
| Funciones del sitio en Washington D. C. (EE. UU.) | registros de build y despliegues de Vercel (`iad1`) |
| Proveedores efectivamente configurados | variables de entorno de producción (solo nombres): 2Clics, Supabase, Resend, Upstash, Cloudflare Turnstile, Sentry |
| Sentry sin datos personales automáticos | `sendDefaultPii: false` (server y edge) |
| Upstash guarda la IP en los contadores de límite | clave `rl:{ip}:{acción}` con ventana de hasta 15 minutos (`lib/security/ratelimit.ts`) |
| Turnstile funciona aunque se rechacen las cookies opcionales | verificación esencial; carga siempre (CSP y pruebas) |
| **Único contenido incrustado de terceros: dos mapas de Google Maps** (ficha de propiedad y de desarrollo). Los videos y recorridos son enlaces. Antes se cargaban al abrir la página; ahora esperan un clic o el consentimiento de publicidad | `ConsentGatedEmbed.tsx`, `lib/embed-consent.ts`, tests `tests/privacy/embed-consent.test.ts` y `tests/2clics/ui.test.ts` |
| GA4: datos de eventos 2 meses, datos de usuario 14 meses | Admin API de GA4 (`dataRetentionSettings`) |
| **La elección de cookies se guarda solo en el navegador** (cookie `gi_consent`); no hay registro del consentimiento en el servidor | `lib/consent.ts`. Relevante para la política de consentimiento de Google en el EEE/Reino Unido (exige conservar registros): punto 8 de la sección 4 |

**No se modificó** ningún formulario, el CRM (2Clics), el Pixel, GTM, GA4, el registro de clics ni WhatsApp. Cambios de código de esta rama: texto de `app/privacidad/page.tsx`, dos descripciones del panel de cookies, y un mecanismo de conservación **deshabilitado por defecto** (sección 5).

## 3. Texto completo propuesto para `/privacidad`
*(Generado automáticamente desde `app/privacidad/page.tsx` de la rama para que coincida exactamente con lo que se publicaría. Los textos en negrita entre corchetes son pendientes.)*

## 1. Identificación del responsable

El responsable del tratamiento de los datos personales recabados a través de
este sitio web es:

**García Inversiones Inmobiliarias**

Nombre legal o titular responsable y CUIT:
**[A CONFIRMAR (grupo B): razón social o titular, y CUIT]**

Domicilio: **[A CONFIRMAR (grupo B): domicilio legal o de contacto]**

Sitio web:
[www.garciainversionesinmobiliarias.com.ar](https://www.garciainversionesinmobiliarias.com.ar)

Correo de contacto:
[contacto@garciainversiones.com.ar](mailto:contacto@garciainversiones.com.ar)
**[A CONFIRMAR (grupo B): comprobar que esta casilla esté operativa para solicitudes de privacidad]**

Ubicación: Buenos Aires, Argentina

## 2. Datos que recopilamos

Podemos recopilar los siguientes tipos de información personal cuando
interactuás con nuestro sitio:

-
**Datos de identificación:** nombre y apellido.

-
**Datos de contacto:** dirección de correo electrónico y número
de teléfono o WhatsApp.

-
**Información de la consulta:** motivo de la consulta y mensaje
que nos enviás a través del formulario de contacto.

-
**Dirección de correo para newsletter:** cuando te suscribís
voluntariamente a nuestras novedades.

-
**Datos de navegación:** información técnica recabada por
herramientas de analítica (ver sección 6), como páginas visitadas, duración de
la sesión y origen del tráfico.

-
**Datos técnicos de conexión:** como la dirección IP, el tipo de
navegador y de dispositivo, que reciben nuestros proveedores de alojamiento, de
seguridad y de medición cuando se carga el sitio (ver sección 11).

-
**Referencia técnica de WhatsApp:** cuando seleccionás un enlace de
WhatsApp de nuestro sitio, según lo que hayas aceptado (ver sección 6).

-
**Conversaciones de WhatsApp:** si decidís iniciar una conversación,
la información que nos proporcionás en ella.

No solicitamos intencionalmente datos sensibles (según la legislación vigente)
ni datos de menores de 18 años. Si sos menor, por favor no envíes tus datos a
través de este sitio.

## 3. Finalidad del tratamiento

Los datos personales que nos proporcionás se utilizan exclusivamente para los
siguientes fines:

-
Responder consultas comerciales e inmobiliarias enviadas a través de los
formularios del sitio o de WhatsApp.

-
Enviar información sobre propiedades, oportunidades de inversión y novedades
del mercado (únicamente si te suscribiste al newsletter).

- Gestionar la relación comercial con potenciales y actuales clientes.

-
Mejorar la experiencia del usuario y el rendimiento del sitio web mediante
datos estadísticos, agregados o seudonimizados, según la configuración de cada
herramienta.

- Medir la efectividad de nuestras campañas publicitarias.

-
Conocer qué propiedades, desarrollos u oportunidades generan consultas a través
de los enlaces de WhatsApp, únicamente según tu consentimiento (ver sección 6).

- Proteger el sitio y los formularios frente a spam y usos automatizados.

## 4. Formularios de contacto

Cuando completás y enviás el formulario de contacto o el formulario de consulta
por una propiedad, los datos ingresados son utilizados para:

-
Responderte de manera personalizada a través de los canales que nos indicaste
(email, WhatsApp o teléfono).

-
Registrar o gestionar la consulta en nuestro sistema de gestión de clientes
(CRM), cuando corresponda, para asegurar un seguimiento adecuado.

-
Contactarte con información adicional relacionada con la propiedad o servicio
de tu interés.

Para proteger los formularios del spam, usamos una verificación de Cloudflare
(Turnstile) que analiza señales técnicas de tu navegador, como la dirección IP,
para distinguir a las personas de los programas automáticos. Esta verificación
funciona aunque rechaces las cookies opcionales.

No utilizaremos tus datos de contacto para enviarte comunicaciones no
relacionadas con tu consulta sin tu consentimiento previo.

## 5. Suscripción al newsletter

Si te suscribís a nuestro newsletter, utilizaremos tu dirección de correo
electrónico para enviarte periódicamente:

-
Novedades sobre propiedades destacadas y nuevas oportunidades de inversión.

- Información sobre mercados inmobiliarios nacionales e internacionales.

- Contenido de valor relacionado con el real estate.

La suscripción es completamente voluntaria. Podés darte de baja en cualquier
momento escribiéndonos a
[contacto@garciainversiones.com.ar](mailto:contacto@garciainversiones.com.ar)
con el asunto "Baja newsletter".

## 6. Herramientas de analítica y publicidad

Este sitio utiliza herramientas de medición, analítica y publicidad
digital, tales como **Google Analytics 4**,
**Google Tag Manager**, **Meta Pixel** y
**Google Ads**, con el objetivo de analizar el uso del sitio, medir
conversiones, mejorar la experiencia del usuario y optimizar campañas
publicitarias.

Estas herramientas pueden recopilar información técnica y de navegación, como
páginas visitadas, origen del tráfico, interacciones realizadas, dispositivo
utilizado y eventos de conversión. La información se utiliza de forma
estadística, agregada o asociada a identificadores técnicos de navegación, según
la configuración de cada plataforma.

### Google Analytics 4

Utilizamos Google Analytics 4 para analizar el comportamiento de los usuarios
en el sitio. Para más información, podés consultar la
[Política de privacidad de Google](https://policies.google.com/privacy)
.

### Meta Pixel

Podemos utilizar Meta Pixel para medir la efectividad de anuncios en Facebook
e Instagram, crear audiencias y mostrar publicidad relevante. Meta puede usar
la información que recibe también para sus propios fines, conforme a su
política. Para más información, consultá la
[Política de privacidad de Meta](https://www.facebook.com/privacy/policy/)
.

### Google Ads

Podemos utilizar Google Ads para medir conversiones generadas a partir de
anuncios y mejorar la relevancia de nuestras campañas. Para más información,
consultá la
[Política de privacidad de Google](https://policies.google.com/privacy)
.

Estas herramientas utilizan **cookies** propias y de terceros para
su funcionamiento. **No se activan hasta que las aceptás** en el
aviso de cookies, y podés rechazarlas o retirar tu consentimiento en cualquier
momento (ver sección 10).

Los datos que escribís en nuestros formularios (nombre, correo electrónico,
teléfono y mensaje) no se incorporan a los eventos que enviamos a Google
Analytics, Google Tag Manager ni Meta. Sin embargo, cuando estas herramientas se
cargan, sus proveedores reciben por sí mismos datos técnicos del navegador y de
la conexión, como la dirección IP, el tipo de navegador y de dispositivo y los
identificadores de sus propias cookies, y los tratan conforme a sus propias
políticas.

### Origen de la visita

Si aceptás las cookies de analítica o de publicidad, guardamos en tu
dispositivo, por hasta 90 días, el origen de tu visita (por ejemplo, el anuncio
o la campaña desde la que llegaste, la página de entrada y el sitio de
referencia) junto con un identificador de sesión. Si nos enviás una consulta,
asociamos esa información a la consulta para saber qué campañas generan
oportunidades reales; no incluye tus datos de contacto. Si rechazás las
cookies opcionales, no guardamos esta información.

### Enlaces de WhatsApp y origen de consultas

Cuando seleccionás un enlace de WhatsApp de nuestro sitio, se prepara un
mensaje relacionado con la propiedad, el desarrollo o la oportunidad que
estabas consultando. El mensaje incluye una referencia técnica aleatoria que no
incorpora directamente tu nombre, teléfono ni correo electrónico.

Si aceptaste las cookies de analítica o de publicidad, podemos registrar esa
referencia junto con la propiedad o el desarrollo consultado y la página desde
la cual accediste al enlace. Si aceptaste las cookies de publicidad, además
podemos asociar esa interacción con información sobre el origen de tu visita y
la campaña publicitaria correspondiente, incluidos identificadores técnicos de
publicidad (por ejemplo, identificadores de clic y del navegador). Si aceptaste
solo las de analítica, no guardamos datos de campañas ni identificadores
publicitarios en ese registro.

Si rechazaste ambas opciones, no conservamos ese registro de clic. Copiar el
enlace sin abrirlo tampoco genera un registro.

Seleccionar un enlace no significa que hayas enviado un mensaje. Si decidís
iniciar la conversación, esta se realiza mediante WhatsApp, un servicio de
Meta, que trata la información conforme a sus propias condiciones y política de
privacidad. García utiliza la información que nos proporcionás en la
conversación para responder tu consulta y gestionar el seguimiento comercial
correspondiente. Hoy esas conversaciones se mantienen en la aplicación de
WhatsApp Business de García.
**[A CONFIRMAR (grupo B): confirmar si las conversaciones se incorporan o se incorporarán a otros sistemas (CRM) y, en ese caso, informarlo aquí]**

## 7. No vendemos tus datos

García Inversiones Inmobiliarias **no vende** tus datos personales de
contacto (nombre, correo electrónico, teléfono) ni el contenido de tus consultas.
Tus datos podrán ser compartidos únicamente en los siguientes supuestos:

-
**Proveedores de servicios:** empresas que nos asisten en la
operación del sitio (alojamiento, base de datos, correo electrónico, CRM,
seguridad), únicamente para prestar el servicio contratado. Los detallamos en la
sección 11.

-
**Plataformas de medición y publicidad:** solo si aceptaste las
cookies correspondientes. Reciben datos técnicos y de uso, no tus datos de
contacto, y pueden tratarlos conforme a sus propias políticas (ver sección 6).

-
**WhatsApp (Meta):** si iniciás una conversación con nosotros.

-
**Obligación legal:** cuando una autoridad competente lo requiera
conforme a la legislación vigente.

## 8. Seguridad

Aplicamos medidas técnicas y organizativas razonables para proteger la
información personal que nos proporcionás frente a accesos no autorizados,
alteración, divulgación o destrucción. Entre ellas:

- Transmisión de datos mediante conexión HTTPS/TLS.

-
Validación y sanitización de los datos recibidos a través de los formularios.

- Limitación de acceso interno a la información confidencial.

-
Almacenamiento de datos en proveedores con estándares de seguridad
reconocidos.

Sin perjuicio de lo anterior, ningún sistema de transmisión de datos por
Internet es completamente seguro, por lo que no podemos garantizar una seguridad
absoluta.

## 9. Tus derechos

De acuerdo con la Ley N.° 25.326 de Protección de los Datos Personales de
Argentina y normativa aplicable, tenés derecho a:

-
**Acceder** a los datos personales que tenemos sobre vos.

-
**Rectificar y actualizar** datos incorrectos, incompletos o
desactualizados.

-
**Suprimir** tus datos personales (derecho al olvido), en los
casos previstos por la ley.

-
**Oponerte** al tratamiento de tus datos en determinadas
circunstancias.

-
**Revocar** el consentimiento otorgado en cualquier momento.

Para ejercer cualquiera de estos derechos, escribinos a
[contacto@garciainversiones.com.ar](mailto:contacto@garciainversiones.com.ar)
indicando tu solicitud y los datos necesarios para identificarte.

El derecho de acceso es gratuito y puede ejercerse a intervalos no inferiores a
seis meses, salvo que acredites un interés legítimo. Responderemos las solicitudes
de acceso dentro de los diez (10) días corridos de recibido tu reclamo, y las de
rectificación, actualización o supresión dentro de los cinco (5) días hábiles.
**[A CONFIRMAR (grupo C): validar estos plazos (arts. 14 y 16 de la Ley 25.326, según el texto vigente) y el procedimiento interno para cumplirlos]**

La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control de
la Ley N.° 25.326 y tiene la atribución de atender las denuncias y reclamos de
quienes resulten afectados en sus derechos. Podés comunicarte con ella en
[www.argentina.gob.ar/aaip/datospersonales](https://www.argentina.gob.ar/aaip/datospersonales)
. **[A CONFIRMAR (grupo C): leyenda exacta exigida por la normativa vigente, y datos de contacto de la AAIP]**

## 10. Cookies

Las cookies son pequeños archivos de texto que los sitios web almacenan en tu
dispositivo. Este sitio utiliza cookies propias y de terceros para los
siguientes fines:

-
**Funcionamiento del sitio:** cookies técnicas necesarias para
que el sitio funcione correctamente, incluida una cookie propia donde guardamos
tu elección sobre las cookies por hasta 180 días.

-
**Analítica (opcional):** cookies de Google Analytics para medir
el uso del sitio de forma estadística y agregada, y registro de los clics hacia
WhatsApp según lo descripto en la sección 6.

-
**Publicidad (opcional):** cookies de Google Ads y Meta Pixel para medir
conversiones y mostrar anuncios relevantes, y asociación de los clics hacia
WhatsApp con la campaña de origen.

Las cookies de analítica y de publicidad son **opcionales**: solo se
activan si las aceptás en el aviso que aparece al ingresar al sitio. Si las
rechazás, el sitio, los formularios, la verificación de seguridad y los enlaces a
WhatsApp siguen funcionando con normalidad.

Podés cambiar tu elección o retirar tu consentimiento en cualquier momento desde
«Preferencias de cookies». Al retirarlo, eliminamos las
cookies de medición y la información de origen de visita guardada en tu
dispositivo.

Algunas páginas de propiedades y desarrollos incluyen un mapa de Google Maps. El mapa no
se carga al abrir la página: aparece un aviso con el botón «Cargar mapa» y solo
se muestra cuando lo pedís, o automáticamente si aceptaste las cookies de
publicidad. Al cargarse, Google puede recibir tu dirección IP y datos de tu
navegador y, según el caso, usar sus propias cookies, conforme a sus políticas.
El enlace «Abrir en Google Maps» abre el sitio de Google en otra pestaña. Los
videos y recorridos virtuales son enlaces: no se cargan dentro de esta web.

También podés configurar tu navegador para bloquear o eliminar las cookies. Tené
en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del
sitio.

## 11. Proveedores y transferencias internacionales

Para operar este sitio nos apoyamos en los siguientes proveedores. Cada uno
recibe solo la información necesaria para su función:

-
**Vercel (alojamiento):** recibe los datos de conexión (como la
dirección IP y las páginas solicitadas) y los registros técnicos del servicio.
Las funciones del sitio se ejecutan en Washington D. C., Estados Unidos.

-
**Supabase (base de datos):** guarda las suscripciones al
newsletter y los registros técnicos de origen de las consultas y de clics a
WhatsApp (sin tu nombre, correo ni teléfono). Ubicación:
**[A CONFIRMAR (grupo B): región del proyecto de Supabase]**

-
**Resend (correo electrónico):** procesa los avisos internos de
cada consulta, que incluyen los datos que ingresaste (nombre, correo, teléfono
y mensaje). Los envíos se realizan desde la región de São Paulo (Brasil); según el proveedor, los datos de su cuenta se alojan en los Estados Unidos.

-
**2Clics (CRM):** recibe los datos de tus consultas para su
seguimiento comercial y, cuando aceptaste las cookies correspondientes, una nota
con el origen de la consulta. Ubicación y condiciones:
**[A CONFIRMAR (grupo B): ubicación del tratamiento y contrato de 2Clics]**

-
**Cloudflare (verificación anti-spam y DNS):** recibe señales
técnicas de tu navegador (como la dirección IP) al verificar los formularios.

-
**Upstash (límite de solicitudes):** procesa de forma temporal la
dirección IP asociada a contadores para limitar abusos. Ubicación:
**[A CONFIRMAR (grupo B): región de la base de Upstash]**

-
**Sentry (monitoreo de errores):** recibe información técnica de
errores del servidor; está configurado sin el envío automático de datos
personales. Ubicación: **[A CONFIRMAR (grupo B): región de la organización de Sentry]**

-
**Google y Meta:** analítica, publicidad y WhatsApp, según las
secciones 6 y 10.

Algunos de estos proveedores tratan información fuera de la Argentina, en
particular en los Estados Unidos.
**[A CONFIRMAR (grupo C): redacción sobre las transferencias internacionales y su base jurídica (art. 12 de la Ley 25.326: nivel adecuado, cláusulas contractuales modelo aprobadas por la AAIP u otra), según la documentación de cada proveedor; no afirmar garantías que no estén documentadas]**

## 12. Conservación de los datos

Conservamos los datos solo durante el tiempo necesario para las finalidades
descriptas, y los eliminamos o anonimizamos cuando dejan de ser necesarios. Los
plazos dependen de dónde se guarda cada dato:

-
**En tu navegador:** el origen de tu visita, por hasta 90 días, y
tu elección sobre las cookies, por hasta 180 días. Podés borrarlos en cualquier
momento (ver sección 10).

-
**Registros técnicos de clics hacia WhatsApp (nuestra base de datos):**
hasta 90 días y luego se eliminan automáticamente.
**[A CONFIRMAR (grupo C): plazo de 90 días en estudio; no publicar como compromiso hasta aprobar la política y activar la eliminación automática]**

-
**Registros de origen de consultas por formulario y suscripciones al newsletter:**
**[A CONFIRMAR (grupo C): plazo de conservación]**

-
**Contactos y negocios en nuestro CRM:**
**[A CONFIRMAR (grupo C): plazo de conservación (decisión comercial y jurídica)]**

-
**Conversaciones de WhatsApp Business y correos de consulta:**
**[A CONFIRMAR (grupo C): plazo de conservación (decisión comercial y jurídica)]**

Los proveedores de analítica, publicidad y alojamiento conservan la información
que reciben según sus propias políticas.

## 13. Cambios en esta política

Podemos actualizar esta Política de Privacidad periódicamente para reflejar
cambios en nuestras prácticas, en las herramientas que utilizamos o en la
legislación aplicable. Cuando realicemos cambios sustanciales, actualizaremos la
fecha indicada al inicio de este documento.

## 14. Contacto

Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de
tus datos personales, podés contactarnos por los siguientes medios:

**Email:**
[contacto@garciainversiones.com.ar](mailto:contacto@garciainversiones.com.ar)

**WhatsApp:**
[+54 9 11 6724-0353](https://wa.me/5491167240353)

**Sitio web:**
[www.garciainversionesinmobiliarias.com.ar](https://www.garciainversionesinmobiliarias.com.ar)

## 4. Cuestiones que debe validar el asesor jurídico (lista breve; ninguna está resuelta)
1. **Responsable:** razón social/titular, CUIT, domicilio y correo operativo (sección 7).
2. **Consentimiento:** si el consentimiento de **analítica** alcanza para el registro básico del clic (referencia + activo + página); y si ampliar la descripción de las finalidades en el banner **sin volver a pedir** el consentimiento a quienes ya eligieron es suficiente (la versión 2 está preparada aparte; ver sección 11).
3. **Transferencias internacionales:** según la AAIP, EE. UU. **no figura** entre los países con nivel adecuado; hay que definir la base de cada transferencia (art. 12, Ley 25.326; cláusulas modelo aprobadas por Res. AAIP 198/2023 y su presentación en 30 días, con redacciones distintas en dos páginas de la AAIP) y qué contratos de tratamiento de datos (DPA) aceptó realmente García con cada proveedor (sección 6). Hoy **no hay documentación en el repositorio** que respalde ninguna.
4. **Registro de bases de datos (arts. 21 y 24):** si la base de consultas/newsletter debe inscribirse ante la AAIP; las páginas de la AAIP no mencionan newsletters ni listas de contacto de sitios web.
5. **Plazos y leyenda:** vigencia de los plazos de los arts. 14 (10 días corridos) y 16 (5 días hábiles) en el texto actualizado de la ley y de cualquier reforma; leyenda exacta sobre la AAIP (no se leyó la Disposición DNPDP 10/2008).
6. **Conservación:** plazos de la sección 5 (90 días de los clics es solo una propuesta de trabajo) y su fundamento.
7. **Mapas de Google:** confirmar que el criterio implementado (carga con clic, o automática solo con consentimiento de publicidad) es suficiente.
8. **Otras jurisdicciones:** si las campañas dirigidas a la UE/España o a EE. UU. exigen información o condiciones adicionales (sección 9), incluida la exigencia de Google de **conservar registros del consentimiento** (hoy solo hay cookie).
9. **WhatsApp:** roles de García (responsable) y de WhatsApp/Meta (encargado, según los términos del WhatsApp Business App vigentes desde el 2026-09-23) y redacción si en el futuro las conversaciones se incorporan al CRM o se analizan con IA (no implementado; requeriría texto y validación aparte).
10. **Google y Meta:** cómo describir su condición (responsable, corresponsable o encargado según la jurisdicción) y la frase «no vendemos tus datos» frente al uso propio que ambos hacen de los datos de medición.
11. **Newsletter:** base de licitud, mecanismo de baja y plazo de eliminación.
12. **Menores:** redacción vigente («no solicitamos datos de menores de 18 años»).

## 5. Conservación (propuesta de trabajo; no es una política aprobada)
**No se aplica un mismo plazo a todos los sistemas.** Fundamento general: la Ley 25.326 (art. 4, inc. 7) exige destruir los datos cuando dejan de ser necesarios para su finalidad; no fija un plazo único.

| Sistema | Qué se guarda | Hoy | Propuesta | Decisión pendiente |
|---|---|---|---|---|
| **Navegador** | origen de la visita (`gi_attr`), sesión (`gi_sid`), referencia de WhatsApp (`gi_wa_ref`/`gi_wa_reg`, hasta cerrar la pestaña), elección de cookies (`gi_consent`) | origen: 90 días; elección: 180 días (implementado) | sin cambios | el plazo de 90 días del origen es una decisión provisoria nuestra, no un requisito legal |
| **Supabase — clics de WhatsApp** (`lead_attribution`, `whatsapp_click`) | referencia, activo, página, consentimiento y, con publicidad, datos de campaña | sin plazo (indefinido) | **90 días**, solo filas **sin mensaje asociado** | aprobar el plazo y activar el mecanismo (abajo). Las filas ya vinculadas a un mensaje recibido pasan a ser un registro comercial: su plazo es otra decisión |
| **Supabase — consultas por formulario** (`lead_attribution`) | tipo, activo, estado del CRM y atribución (sesión, `fbp`, `fbc`, identificadores de clic) | sin plazo | borrar a los 90 días los **identificadores seudónimos** (sesión, `fbp`, `fbc`, clics, toques) y conservar solo lo agregable; plazo del resto: decisión | SQL propuesto en `docs/ai/sql/2026-11-11_whatsapp_ref.sql` (comentado, no ejecutado) |
| **Supabase — newsletter** | correo, nombre, origen | mientras exista la suscripción | mientras esté suscripto; eliminar o marcar la baja dentro de los 5 días hábiles de pedida | base de licitud y plazo |
| **2Clics (CRM)** | contactos y negocios, con la nota de origen | sin plazo; el CRM no se toca desde esta web | prospectos sin avance: 24 meses desde la última interacción (referencia: la propia plataforma de Meta retiene datos de eventos hasta 2 años); clientes: el plazo de conservación de documentación comercial/contable que fije el asesor | **decisión comercial y jurídica**; el MCP de 2Clics no tiene operaciones de borrado: sería un proceso manual o un pedido al proveedor |
| **Conversaciones de WhatsApp Business** | mensajes en la aplicación de WhatsApp Business de García | los gestiona la persona que atiende | mismo criterio que el CRM | decisión comercial y jurídica; no hay conservación automática |
| **Correos de consulta** (Resend → casilla) | nombre, correo, teléfono y mensaje | sin plazo | 24 meses | decisión |
| **Google Analytics 4** | eventos y usuarios | datos de eventos 2 meses; datos de usuario 14 meses (configurado) | sin cambios | — |
| **Meta Pixel** | datos de eventos | según Meta (los términos indican hasta 2 años) | — | informar en la política |
| **Vercel / Sentry / Upstash / Cloudflare** | registros técnicos | según cada proveedor (Hobby: 1 hora de registros de ejecución) | — | **no verificado** para Sentry, Upstash y Cloudflare |

**Mecanismo técnico para los clics de WhatsApp (preparado en esta rama, deshabilitado, con pruebas):**
- `lib/retention/whatsapp-clicks.ts` + `app/api/maintenance/retention/route.ts` + `vercel.json` (cron diario 06:17 UTC).
- Borra **solo** `lead_attribution` con `lead_type = 'whatsapp_click'` y `wa_message_received_at IS NULL` y más antiguas que el plazo. **No toca** formularios, contactos, CRM ni otras tablas (hay tests que lo garantizan).
- **Auditable:** cada corrida escribe una fila en `retention_audit` (regla, plazo, corte, filas encontradas y borradas, estado, error) **antes** de borrar; si no puede registrarla, no borra. Consulta: `SELECT … FROM retention_audit ORDER BY ran_at DESC`.
- **Controlado:** modo de prueba (`?dry=1`), plazo mínimo de 30 días, tope de 10.000 filas por corrida, autenticación por `CRON_SECRET`, **deshabilitado** salvo `RETENTION_ENABLED=true`, y **en Preview/Development nunca borra** (comparten base con producción).
- **Para activarlo (con tu autorización):** (1) aprobar el plazo; (2) ejecutar `docs/ai/sql/2026-11-11_retention_audit.sql`; (3) cargar `CRON_SECRET` y `RETENTION_ENABLED=true` en Vercel (producción); (4) integrar la rama (el cron de Vercel se programa con `vercel.json`; el uso de Cron en el plan actual **no se verificó en esta sesión**); (5) correr una vez en modo de prueba y revisar `retention_audit`; (6) recién entonces publicar el compromiso de 90 días en la política.
- *Alternativa sin código de aplicación:* programar el mismo borrado con `pg_cron` (disponible en Supabase, no instalada); el SQL equivalente está comentado en el archivo de auditoría.
- Entre tanto, **las filas de prueba existentes (`id` 1, 2 y 3) y los clics que se vayan registrando no se eliminan solos.**

## 6. Proveedores y transferencias internacionales
Información tomada de las páginas **públicas** de cada proveedor (leídas el 2026-11-11). Describe lo que **el proveedor documenta**; no prueba que García haya aceptado esos términos ni que las transferencias estén aprobadas. «García:» indica lo que hay que verificar en la cuenta real.

| Proveedor | Función y datos que recibe | Ubicación (según el proveedor / García) | Mecanismo de transferencia documentado | A confirmar |
|---|---|---|---|---|
| **Vercel** | alojamiento y entrega; IP, páginas solicitadas, registros | procesamiento principal en EE. UU. (la documentación admite «cualquier lugar del mundo»); García: funciones en Washington D. C. (verificado) | EU SCC + marcos DPF; **el DPA rige para planes Pro/Enterprise: García está hoy en Hobby** | que el DPA aplique al pasar a Pro |
| **Supabase** | base de datos: newsletter y registros técnicos | la región se elige por proyecto; default no indicado; García: **no verificada** | SCC (con anexos UK/Suiza); DPF no indicado; el DPA forma parte de los términos | región del proyecto; subencargados |
| **Resend** | envío de los avisos de consulta (nombre, correo, teléfono, mensaje) | datos de cuenta y registros **siempre en EE. UU.** (según el proveedor); región de envío del dominio de García: **São Paulo, Brasil** (verificada en el DNS de Cloudflare) | SCC + DPF; DPA incorporado a los términos | 22 subencargados listados |
| **Upstash** | contadores de límite con la IP | región elegible por base; García: **no verificada** | DPF y SCC (política); el PDF del DPA no pudo leerse | región; DPA |
| **Sentry** | errores técnicos (sin datos personales por defecto) | EE. UU. (Iowa) o UE (Fráncfort), **elegido al crear la organización y no modificable**; García: **no verificada** | DPF (+ SCC de respaldo); **el DPA NO es automático: hay que aceptarlo** | región y **si se aceptó el DPA** |
| **Cloudflare** | Turnstile (IP, huella TLS, navegador, clave y origen); DNS | metadatos en EE. UU. y Europa; sin retención ni ubicación indicadas para Turnstile | SCC + DPF; DPA incorporado al acuerdo *self-serve* | retención de Turnstile |
| **Google** (GTM, GA4, Ads) | solo con consentimiento: datos de uso, IP, identificadores de cookies | «cualquier país donde Google o sus subencargados operen» | SCC / DPF según el producto | condiciones de Analytics (no se leyeron); registros del consentimiento (EEE/UK) |
| **Meta** (Pixel, WhatsApp) | Pixel solo con consentimiento; WhatsApp si la persona inicia la conversación | no indicada | términos de Business Tools y adenda de transferencias (no leída); en la UE/UK Meta es corresponsable de ciertos datos | términos de procesamiento de datos de Meta (no se pudieron leer); aviso y consentimiento verificable en la UE |
| **2Clics** | CRM: nombre, correo, teléfono, mensaje y nota de origen | **no verificada** (su sitio no fue accesible desde esta sesión) | **no verificado** | ubicación, contrato y subencargados |
| **Google Maps (mapas incrustados)** | IP y datos del navegador, solo al cargarse el mapa (clic o consentimiento de publicidad) | del proveedor | del proveedor | criterio de carga (punto 7) |

## 7. Datos del responsable que faltan confirmar
- **Razón social o titular responsable y CUIT** — no figuran en el repositorio ni en la política vigente.
- **Domicilio legal o de contacto** — hoy solo «Buenos Aires, Argentina».
- **Correo para solicitudes de privacidad** — se mantiene `contacto@garciainversiones.com.ar`. Comprobación hecha: el dominio `garciainversiones.com.ar` **existe y tiene servidor de correo propio** (proveedor `hostmar`, con SPF); el dominio del sitio no tiene correo. **No se comprobó que la casilla exista ni que sea de García**: alguien de García debe enviar un mensaje de prueba. No se reemplazó por ninguna otra dirección.
- Si García está o debe estar inscripta en el Registro Nacional de Bases de Datos (punto 4).

## 8. Derechos, plazos y AAIP (lo que dice la ley, leída del texto original; pendiente de validar vigencia)
- Art. 14: acceso gratuito a intervalos no inferiores a seis meses (salvo interés legítimo); respuesta **dentro de 10 días corridos** de la intimación fehaciente.
- Art. 16: rectificación, actualización o supresión **dentro de 5 días hábiles** del reclamo.
- Art. 6: la información al titular debe incluir la **identidad y el domicilio del responsable** (de ahí el pendiente de la sección 1).
- AAIP: órgano de control (Decreto 1558/2001, art. 29); página de datos personales: `https://www.argentina.gob.ar/aaip/datospersonales`. **No se encontró** la leyenda estándar exigida; no se leyó la Disposición DNPDP 10/2008.
- Reforma: la AAIP describe un proyecto de ley de 2023 (Mensaje 87/2023); **no se pudo confirmar** su estado parlamentario ni que haya reforma vigente.
- El texto original de la ley leído puede no reflejar modificaciones posteriores.

## 9. Otras jurisdicciones (preguntas, no conclusiones)
- **UE/España:** si las campañas a personas en España/UE hacen aplicable el régimen europeo de protección de datos. Aunque se aplicara, hay requisitos de proveedores ya documentados: Google exige consentimiento válido para cookies y personalización de anuncios en el EEE, Reino Unido y Suiza, **conservar registros del consentimiento** e instrucciones de revocación; los términos de Meta exigen aviso claro y consentimiento verificable antes de sus cookies en la UE.
- **EE. UU. (Miami):** si alguna ley estatal aplicable exige avisos u opciones adicionales (no se verificó ninguna).
- La política actual está redactada solo conforme a la ley argentina y no distingue países.

## 10. Cómo publicar (cuando el contenido esté validado)
1. El asesor valida el texto y se completan **todos** los `[A CONFIRMAR]` (datos del responsable, ubicaciones, plazos, redacción de transferencias).
2. Quitar los `Pendiente` y la nota de borrador de `app/privacidad/page.tsx` y actualizar la fecha.
3. `PRIVACY_PUBLISH_CHECK=1 npm test` debe pasar (hoy falla con 15 pendientes —grupos B y C—, a propósito).
4. Decidir la activación de la conservación (sección 5) **antes** de publicar el compromiso de 90 días.
5. Integrar por PR con CI y verificar la página, el banner y el registro de clics en producción.

## 11. Cierre de rama: lo que está terminado y lo que falta

### 11.1 Los 17 pendientes, clasificados
- **Grupo A — técnicos (resueltos en el código, 2):** (1) contenidos incrustados: solo hay dos mapas de Google Maps y ahora se cargan con un clic o con consentimiento de publicidad; el texto se corrigió (antes mencionaba, por error, videos y recorridos incrustados); (2) región de envío de Resend: São Paulo (DNS).
- **Grupo B — datos que debe aportar García (9):** razón social/titular y CUIT; domicilio; casilla de correo operativa (`contacto@garciainversiones.com.ar`: enviar un mensaje de prueba); si las conversaciones de WhatsApp pasarán al CRM; región de Supabase (panel); región de Upstash (panel); región de Sentry y si se aceptó su DPA (panel); ubicación y contrato de 2Clics (consulta al proveedor).
- **Grupo C — criterio jurídico (6):** transferencias internacionales (base y redacción); plazos y leyenda de la AAIP; plazo de 90 días de clics de WhatsApp; plazo de formularios/newsletter; plazo del CRM; plazo de conversaciones de WhatsApp y correos.
- El registro de bases de datos (arts. 21 y 24) y la ley aplicable a campañas en UE/EE. UU. no son pendientes dentro del texto sino preguntas del grupo C (sección 4).

### 11.2 Conservación
- Criterio propuesto: 90 días para clics de WhatsApp **sin mensaje asociado**. Mecanismo terminado, **deshabilitado**, con 19 tests (incluido un control estático: solo toca `lead_attribution` y `retention_audit`, un único `delete`, mismas tres condiciones en conteo y borrado, sin referencias a 2Clics ni WhatsApp Business).
- Verificación en producción (solo lectura, 2026-11-11): 3 filas en total (`prueba` 1, `whatsapp_click` 2); **0 alcanzadas** por la regla de 90 días (todas del 2026-11-11). Nada se borró.
- No hay eliminación automática para 2Clics ni WhatsApp Business. El plazo de 24 meses para prospectos sigue como propuesta pendiente de decisión comercial y jurídica.
- Activación: pasos de la sección 5; requiere aprobación formal del plazo y una corrida de prueba (`?dry=1`) en el entorno elegido.

### 11.3 Evaluación de `CONSENT_VERSION` = 2 (commit separado, pendiente de revisión)
- **Efecto:** la cookie `gi_consent` v1 deja de valer; todos los visitantes vuelven a ver el banner **una vez**. Hasta que elijan, GTM/GA4/Pixel no cargan (el snippet inicial compara la versión).
- **Por qué:** la descripción de las finalidades cambió (registro del clic hacia WhatsApp); informar una finalidad distinta y pedir consentimiento de nuevo es el criterio más conservador.
- **Costo:** pérdida temporal de medición de quienes no vuelvan a aceptar; hoy el tráfico es bajo, antes de campañas es el mejor momento.
- **Limpieza:** si el visitante tenía una cookie v1 y ahora no concede todo, se borran las cookies de medición y la atribución guardadas (tests incluidos).
- **Cómo descartarlo:** revertir el commit `f4ee99d`; el resto de la rama no depende de él.

### 11.4 Transferencias y garantías que el asesor debe validar
Ver tabla de la sección 6. Resumen de lo **documentado por los proveedores** (no es prueba de que García lo haya aceptado): Vercel (EE. UU.; DPA solo Pro/Enterprise, García en Hobby); Supabase (SCC; región a confirmar); Resend (cuenta en EE. UU., SCC + DPF); Upstash (DPF/SCC; DPA no leído); Sentry (DPF; el DPA hay que aceptarlo; región fija al crear la organización); Cloudflare (SCC + DPF); Google y Meta (términos propios y exigencias de consentimiento); 2Clics (sin datos). EE. UU. no figura entre los países con nivel adecuado según la AAIP.

### 11.5 Qué falta para publicar
1. Datos del grupo B de García. 2. Validación jurídica del grupo C. 3. Decidir `CONSENT_VERSION` 2 y la activación de la conservación. 4. Quitar `Pendiente` y la nota de borrador; `PRIVACY_PUBLISH_CHECK=1 npm test` en verde. 5. PR con CI y verificación en producción. Nada de esto se hizo: la rama no está publicada ni integrada.
