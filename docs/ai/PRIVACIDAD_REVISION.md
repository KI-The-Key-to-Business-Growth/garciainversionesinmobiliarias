# /privacidad — propuesta consolidada para revisión (2026-11-11)

> **Estado: PUBLICADA el 2026-11-11 por decisión de la titular, SIN revisión jurídica especializada (pendiente).** No está validada por un abogado y no debe presentarse como tal. La revisión (consentimiento, transferencias internacionales, plazos de conservación, inscripción de bases de datos y correcciones que correspondan) está pendiente: ver `PRIVACIDAD_ASESOR_JURIDICO.md`.
>
> Se retiró la nota de borrador que bloqueaba la publicación. Los tests siguen impidiendo publicar `[A CONFIRMAR]`, promesas de borrado automático, plazos no aprobados, regiones o contratos no comprobados, y cualquier afirmación de validación jurídica.

Referencia técnica del tema (las cuestiones jurídicas están **solo** en `PRIVACIDAD_ASESOR_JURIDICO.md`): (1) resumen de modificaciones, (2) hechos técnicos comprobados, (3) texto completo propuesto, (4) puntero al documento del abogado, (5) conservación y mecanismo de borrado (desactivado), (6) proveedores, (7) derechos y AAIP, (8) estado de cierre y comprobaciones para publicar.

## 1. Resumen de modificaciones (versión simplificada, 2026-11-11)
- **Política pública reescrita y simplificada** (12 secciones, lenguaje claro, comparable en estructura con las de inmobiliarias argentinas, sin copiar textos): responsable; datos; finalidades; formularios, consultas y newsletter; WhatsApp; analítica y publicidad; cookies y mapas; proveedores y transferencias; conservación; seguridad; derechos; cambios y contacto.
- **Responsable:** María Fabiana García, persona humana, titular de García Inversiones Inmobiliarias, matrícula CMCPSI 6378, domicilio informado (con la aclaración de que no es oficina ni atención al público) y correo `fabiana@garciainversiones.com.ar`. Sin CUIT (decisión del abogado).
- **Se retiró** todo lo que no aporta claridad al visitante: apartados sobre otras jurisdicciones, regiones técnicas no verificadas, tablas y detalles de implementación, y la sección larga de derechos del borrador anterior.
- **Conservación sin promesas no cumplibles:** se anuncian solo los plazos ya implementados (90 días el origen de visita en el navegador; 180 días la elección de cookies). Los clics de WhatsApp, formularios, CRM y conversaciones se conservan «mientras sean necesarios». **No** se anuncia eliminación automática ni el plazo de 90 días de WhatsApp (propuesta, mecanismo desactivado).
- **Transferencias:** se informa la función de cada proveedor, que algunos tratan datos fuera del país (en particular EE. UU.) y que cada uno aplica sus propias condiciones; no se afirman regiones ni contratos no comprobados.
- **Sin cambios:** modelo restrictivo de consentimiento, `CONSENT_VERSION = 2`, carga controlada de Google Maps, mecanismo de retención desactivado.
- **Marcadores `[A CONFIRMAR]`:** los siete marcadores jurídicos se resolvieron con redacción revisable (no se borraron sin más); las preguntas que dependen del abogado están en `PRIVACIDAD_ASESOR_JURIDICO.md`. El control de publicación se mantiene mediante la nota «BORRADOR PARA REVISIÓN JURÍDICA» (`PRIVACY_PUBLISH_CHECK=1 npm test` falla mientras exista).

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

## 1. Quién es la responsable

La responsable del tratamiento de los datos personales recabados a través de
este sitio web es:

**María Fabiana García**, persona humana, titular de
**García Inversiones Inmobiliarias**.

Matrícula profesional: CMCPSI 6378.

Domicilio: Hipólito Yrigoyen 1470, El Talar (CP 1618), Partido de Tigre,
Provincia de Buenos Aires, Argentina.

Correo electrónico:
[fabiana@garciainversiones.com.ar](mailto:fabiana@garciainversiones.com.ar)

Sitio web:
[www.garciainversionesinmobiliarias.com.ar](https://www.garciainversionesinmobiliarias.com.ar)

El domicilio informado es el que la titular indica a los fines de esta política.
No constituye una oficina comercial ni un establecimiento de atención al
público. Las consultas y reuniones se coordinan previamente a través de nuestros
canales oficiales de contacto.

## 2. Qué datos recopilamos

-
**Datos que nos proporcionás:** nombre y apellido, correo
electrónico, teléfono o WhatsApp, y el motivo y el mensaje de tu consulta,
cuando completás un formulario, te suscribís al newsletter o nos escribís por
WhatsApp.

-
**Datos técnicos de navegación:** páginas visitadas, origen de la
visita, tipo de navegador y de dispositivo, y la dirección IP, que reciben
nuestros proveedores de alojamiento, seguridad y medición cuando se carga el
sitio. Las herramientas de analítica y publicidad solo se activan si las
aceptás (ver secciones 6 y 7).

-
**Referencia técnica de WhatsApp:** cuando seleccionás un enlace
de WhatsApp del sitio, según lo que hayas aceptado (ver sección 5).

No solicitamos intencionalmente datos sensibles ni datos de menores de 18 años.
Si sos menor, por favor no envíes tus datos a través de este sitio.

## 3. Para qué usamos tus datos

- Responder tus consultas comerciales e inmobiliarias.

- Gestionar el seguimiento y la relación comercial con quienes nos consultan.

-
Enviarte información sobre propiedades y novedades del mercado, únicamente si
te suscribiste al newsletter.

-
Conocer el uso del sitio y qué propiedades, desarrollos y campañas generan
consultas, según lo que hayas aceptado en el aviso de cookies.

- Proteger el sitio y los formularios frente al spam y usos automatizados.

No vendemos tus datos de contacto ni el contenido de tus consultas. Los
compartimos solo con los proveedores que nos permiten operar el sitio (sección
8), con las plataformas de medición y publicidad si aceptaste sus cookies
(sección 6), con WhatsApp si iniciás una conversación, y cuando una autoridad
competente lo exija conforme a la ley.

## 4. Formularios, consultas y newsletter

Los datos que ingresás en los formularios de contacto o de consulta por una
propiedad se usan para responderte por el medio que nos indicaste y para
registrar la consulta y darle seguimiento en nuestro sistema de gestión de
clientes (CRM), cuando corresponda. Cada consulta se notifica internamente por correo
electrónico. No usamos tus datos de contacto para
enviarte comunicaciones no relacionadas con tu consulta sin tu consentimiento.

Para proteger los formularios del spam usamos una verificación de Cloudflare
(Turnstile), que analiza señales técnicas de tu navegador, como la dirección IP.
Funciona aunque rechaces las cookies opcionales.

La suscripción al newsletter es voluntaria. Podés darte de baja en cualquier
momento escribiendo a
[fabiana@garciainversiones.com.ar](mailto:fabiana@garciainversiones.com.ar)
con el asunto «Baja newsletter».

## 5. WhatsApp

Al seleccionar un enlace de WhatsApp de este sitio se prepara un mensaje
relacionado con la propiedad, el desarrollo o la oportunidad que estabas
viendo, con una referencia técnica aleatoria que no incorpora directamente tu
nombre, teléfono ni correo electrónico. Qué registramos depende de tu elección
en el aviso de cookies:

-
**Si aceptaste solo las cookies de analítica:** registramos la
referencia, la propiedad o el desarrollo consultado y la página de origen. No
guardamos datos de campañas ni identificadores publicitarios en ese registro.

-
**Si aceptaste las cookies de publicidad:** además asociamos el
clic con el origen de tu visita y la campaña, incluidos identificadores
técnicos de publicidad.

-
**Si rechazaste ambas:** no registramos el clic. Copiar el enlace
sin abrirlo tampoco genera un registro.

Seleccionar un enlace no significa que hayas enviado un mensaje. Si decidís
iniciar la conversación, se realiza mediante WhatsApp, un servicio de Meta, que
trata la información conforme a sus propias condiciones y política de
privacidad. Las conversaciones se mantienen en la aplicación de WhatsApp
Business, atendida personalmente por la titular. Las consultas comerciales
relevantes se registran manualmente en nuestro CRM (2Clics); no se leen ni se
procesan las conversaciones de forma automática.

## 6. Analítica y publicidad

Utilizamos **Google Analytics 4**, **Google Tag Manager**,
**Meta Pixel** y **Google Ads** para entender cómo se
usa el sitio, medir qué anuncios generan consultas y mejorar nuestras campañas.
Recopilan información técnica y de navegación (páginas visitadas, origen del
tráfico, interacciones, dispositivo y eventos de conversión), de forma
estadística o asociada a identificadores técnicos del navegador.
**No se activan hasta que las aceptás** en el aviso de cookies.

Los datos que escribís en nuestros formularios (nombre, correo, teléfono y
mensaje) no se incorporan a los eventos que enviamos a Google Analytics, Google
Tag Manager ni Meta. Sin embargo, cuando estas herramientas se cargan, sus
proveedores reciben por sí mismos datos técnicos del navegador y de la
conexión, como la dirección IP, y los tratan conforme a sus propias políticas:
[Google](https://policies.google.com/privacy)
y
[Meta](https://www.facebook.com/privacy/policy/)
. Meta puede usar la información que recibe también para sus propios fines.

Si aceptás las cookies de analítica o de publicidad, guardamos en tu
dispositivo, por hasta 90 días, el origen de tu visita (por ejemplo, el anuncio
o la campaña desde la que llegaste y la página de entrada) junto con un
identificador de sesión. Si nos enviás una consulta, asociamos esa información
a la consulta para saber qué campañas generan oportunidades reales; no incluye
tus datos de contacto. Si las rechazás, no guardamos esta información.

## 7. Cookies y contenidos de terceros

-
**Necesarias:** permiten que el sitio y los formularios
funcionen, incluida una cookie propia donde guardamos tu elección sobre las
cookies por hasta 180 días.

-
**Analítica (opcional):** medición del uso del sitio y registro
básico de los clics hacia WhatsApp (sección 5).

-
**Publicidad (opcional):** medición de conversiones y anuncios, y
asociación de los clics hacia WhatsApp con la campaña de origen.

Las opcionales solo se activan si las aceptás en el aviso que aparece al
ingresar. Si las rechazás, el sitio, los formularios, la verificación de
seguridad y los enlaces a WhatsApp siguen funcionando con normalidad. Podés
cambiar tu elección o retirar tu consentimiento en cualquier momento desde
«Preferencias de cookies». Al retirarlo,
eliminamos las cookies de medición y el origen de visita guardado en tu
dispositivo. También podés bloquear o borrar cookies desde tu navegador, lo que
puede afectar el funcionamiento de algunas partes del sitio.

Algunas fichas de propiedades y desarrollos incluyen un mapa de Google Maps. El
mapa no se carga al abrir la página: aparece un aviso con el botón «Cargar
mapa», y se muestra solo cuando lo pedís o si aceptaste las cookies de
publicidad. Al cargarse, Google puede recibir tu dirección IP y datos de tu
navegador y usar sus propias cookies, conforme a sus políticas. Los videos y
recorridos virtuales son enlaces: no se cargan dentro de este sitio.

## 8. Proveedores y transferencias fuera de Argentina

Para operar el sitio nos apoyamos en proveedores tecnológicos. Cada uno recibe la
información necesaria para su función:

-
**Vercel:** alojamiento del sitio. Las funciones del sitio se
ejecutan en Washington D. C., Estados Unidos.

-
**Supabase:** base de datos donde se guardan las suscripciones al
newsletter y los registros técnicos de origen de las consultas y de clics a
WhatsApp (sin tu nombre, correo ni teléfono).

-
**Resend:** envío de los avisos de cada consulta, que incluyen los
datos que ingresaste. Los envíos se realizan desde São Paulo (Brasil); según
el proveedor, los datos de su cuenta se alojan en Estados Unidos.

-
**2Clics:** sistema de gestión de clientes (CRM) donde se
registran las consultas para su seguimiento comercial y, si aceptaste las
cookies correspondientes, una nota con el origen de la consulta.

-
**Cloudflare:** verificación anti-spam de los formularios y DNS.

-
**Upstash:** límite de solicitudes para evitar abusos; procesa de
forma temporal la dirección IP.

-
**Sentry:** monitoreo de errores técnicos; está configurado sin el
envío automático de datos personales.

-
**Google y Meta:** analítica, publicidad y WhatsApp (secciones 5 y
6).

Algunos de estos proveedores tratan información fuera de la Argentina, en
particular en Estados Unidos, donde el nivel de protección de los datos
personales puede ser distinto del argentino. Cada proveedor trata los datos
conforme a sus propias condiciones y políticas de privacidad, que podés
consultar en sus sitios.

## 9. Conservación de los datos

Conservamos los datos solo mientras sean necesarios para las finalidades
descriptas en esta política o para cumplir obligaciones legales:

-
**En tu navegador:** el origen de tu visita, por hasta 90 días, y
tu elección sobre las cookies, por hasta 180 días. Podés borrarlos en
cualquier momento.

-
**Registros técnicos de clics hacia WhatsApp:** mientras sean
necesarios para conocer qué propiedades y campañas generan consultas.

-
**Consultas, contactos y conversaciones:** mientras sean
necesarios para responderte, dar seguimiento a la consulta y mantener la
relación comercial.

-
**Newsletter:** mientras estés suscripto; podés pedir la baja en
cualquier momento.

Cuando dejan de ser necesarios, los eliminamos o dejamos de utilizarlos. Podés
pedir la supresión de tus datos en cualquier momento (sección 11). Los
proveedores de analítica, publicidad y alojamiento conservan la información
según sus propias políticas.

## 10. Seguridad

Aplicamos medidas técnicas y organizativas razonables para proteger tu
información frente a accesos no autorizados, alteración, divulgación o
destrucción: conexión cifrada (HTTPS), validación de los datos de los
formularios, acceso interno limitado y proveedores con estándares de seguridad
reconocidos. Ningún sistema de transmisión de datos por Internet es
completamente seguro, por lo que no podemos asegurar una protección absoluta.

## 11. Tus derechos

De acuerdo con la Ley N.° 25.326 de Protección de los Datos Personales, podés
acceder a tus datos, rectificarlos y actualizarlos, solicitar su supresión,
oponerte a su tratamiento en los casos previstos y revocar el consentimiento que
hayas otorgado. Para ejercerlos, escribinos a
[fabiana@garciainversiones.com.ar](mailto:fabiana@garciainversiones.com.ar)
indicando tu solicitud y los datos necesarios para identificarte.

El acceso es gratuito y puede ejercerse a intervalos no inferiores a seis meses,
salvo que acredites un interés legítimo. Respondemos las solicitudes de acceso
dentro de los diez (10) días corridos y las de rectificación, actualización o
supresión dentro de los cinco (5) días hábiles de recibido tu reclamo.

La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control de
la Ley N.° 25.326 y atiende las denuncias y reclamos de quienes consideren
afectados sus derechos:
[www.argentina.gob.ar/aaip/datospersonales](https://www.argentina.gob.ar/aaip/datospersonales)
.

## 12. Cambios y contacto

Podemos actualizar esta política para reflejar cambios en nuestras prácticas, en
las herramientas que usamos o en la ley; cuando sean sustanciales, actualizaremos
la fecha indicada al inicio. Para cualquier consulta, solicitud o reclamo sobre
tus datos personales:

**Email:**
[fabiana@garciainversiones.com.ar](mailto:fabiana@garciainversiones.com.ar)

**WhatsApp:**
[+54 9 11 6724-0353](https://wa.me/5491167240353)

## 4. Cuestiones para el abogado
Única lista vigente: `docs/ai/PRIVACIDAD_ASESOR_JURIDICO.md` (transferencias, consentimiento, conservación, registro de bases y derechos/datos del responsable).

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
- `lib/retention/whatsapp-clicks.ts` + `app/api/maintenance/retention/route.ts`. **No hay cron programado** (`vercel.json` retirado el 2026-11-11 para que nada se ejecute); al activar la retención se agrega `{"crons":[{"path":"/api/maintenance/retention","schedule":"17 6 * * *"}]}`.
- Borra **solo** `lead_attribution` con `lead_type = 'whatsapp_click'` y `wa_message_received_at IS NULL` y más antiguas que el plazo. **No toca** formularios, contactos, CRM ni otras tablas (hay tests que lo garantizan).
- **Auditable:** cada corrida escribe una fila en `retention_audit` (regla, plazo, corte, filas encontradas y borradas, estado, error) **antes** de borrar; si no puede registrarla, no borra. Consulta: `SELECT … FROM retention_audit ORDER BY ran_at DESC`.
- **Controlado:** modo de prueba (`?dry=1`), plazo mínimo de 30 días, tope de 10.000 filas por corrida, autenticación por `CRON_SECRET`, **deshabilitado** salvo `RETENTION_ENABLED=true`, y **en Preview/Development nunca borra** (comparten base con producción).
- **Para activarlo (con tu autorización):** (1) aprobar el plazo; (2) ejecutar `docs/ai/sql/2026-11-11_retention_audit.sql`; (3) cargar `CRON_SECRET` y `RETENTION_ENABLED=true` en Vercel (producción); (4) agregar el cron en `vercel.json` (el uso de Cron en el plan actual **no se verificó**); (5) correr una vez en modo de prueba y revisar `retention_audit`; (6) recién entonces publicar el compromiso de 90 días en la política.
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

## 7. Derechos, plazos y AAIP (lo que dice la ley, leída del texto original; pendiente de validar vigencia)
- Art. 14: acceso gratuito a intervalos no inferiores a seis meses (salvo interés legítimo); respuesta **dentro de 10 días corridos** de la intimación fehaciente.
- Art. 16: rectificación, actualización o supresión **dentro de 5 días hábiles** del reclamo.
- Art. 6: la información al titular debe incluir la **identidad y el domicilio del responsable** (de ahí el pendiente de la sección 1).
- AAIP: órgano de control (Decreto 1558/2001, art. 29); página de datos personales: `https://www.argentina.gob.ar/aaip/datospersonales`. **No se encontró** la leyenda estándar exigida; no se leyó la Disposición DNPDP 10/2008.
- Reforma: la AAIP describe un proyecto de ley de 2023 (Mensaje 87/2023); **no se pudo confirmar** su estado parlamentario ni que haya reforma vigente.
- El texto original de la ley leído puede no reflejar modificaciones posteriores.

## 8. Estado de cierre y comprobaciones para publicar

### 8.1 Datos del responsable (resueltos)
María Fabiana García (nombre según su DNI, confirmado por la titular); matrícula CMCPSI 6378 contrastada con el padrón oficial (https://cmcpsi.org.ar/colegiados/padron); domicilio de El Talar autorizado, con la aclaración de que no es oficina ni atención al público (el padrón profesional publica otro, Nordelta: no se reemplazó); correo confirmado por la titular. CUIT: no se exhibe; se obtendrá de documentación oficial solo si el abogado decide que corresponde.

### 8.2 Proveedores: evidencia y relevancia
| Proveedor | Comprobado | Sin comprobar | ¿Va en el texto público? |
|---|---|---|---|
| Vercel | funciones en Washington D. C.; plan Hobby (DPA solo Pro/Enterprise) | — | sí, lo comprobado |
| Resend | envío desde São Paulo (DNS); cuenta en EE. UU. según el proveedor | — | sí |
| Cloudflare | Turnstile y DNS; DPA incorporado al acuerdo *self-serve* | — | función |
| Supabase | proyecto `ljpolupsgwtreinuxrdo` | región y DPA (*Project Settings → General*; *Legal*) | solo función |
| Upstash | clave de límite con IP, ventana ≤ 15 min | región y DPA (panel de la base) | solo función |
| Sentry | `sendDefaultPii: false` | región y DPA aceptado (*Settings → Legal & Compliance*) | solo función |
| 2Clics | recibe contactos, mensajes y nota de origen | ver solicitud | solo función |

No hay acceso desde esta sesión a los paneles de Supabase, Upstash ni Sentry; las variables de Vercel son sensibles. **No se infirió ninguna región.** Esta información va al abogado (art. 12), no al texto público, salvo que él indique lo contrario.

> **Solicitud a 2Clics:** «Para la política de privacidad de García Inversiones Inmobiliarias necesitamos que nos confirmen por escrito: (a) en qué país y región se almacenan y procesan los datos de nuestras cuentas (contactos, mensajes, notas); (b) las condiciones contractuales aplicables, incluido el acuerdo de tratamiento de datos o cláusulas de protección de datos; (c) si intervienen subencargados y en qué países; (d) qué plazos de conservación y mecanismos de eliminación ofrece la plataforma; y (e) cómo se atienden los pedidos de acceso, rectificación y supresión.» Hasta recibir respuesta no se da por verificada ninguna garantía.

### 8.3 Comprobaciones técnicas antes de publicar (sin afectar el funcionamiento actual)
Hechas en la rama: `typecheck`, `lint`, 700+ tests, build de producción; consentimiento restrictivo (tests y pruebas en producción del 2026-11-11); mapas con carga controlada (tests de render); retención desactivada y sin filas alcanzadas (verificación de solo lectura). **Al publicar:** (1) PR con CI en verde; (2) tras el despliegue, abrir `/privacidad` y verificar texto, índice, enlace «Preferencias de cookies» y correo; (3) comprobar que el banner vuelve a preguntar una vez (`CONSENT_VERSION = 2`) y que, rechazando, un clic de WhatsApp no escribe filas; (4) comprobar un mapa (aviso, botón «Cargar mapa»). No se ejecuta SQL ni se activa el borrado automático.

### 8.4 Rama
`privacy/review-draft`, sin push ni merge. Para publicar: validación del abogado → quitar la nota de borrador y actualizar la fecha → PR con CI.
