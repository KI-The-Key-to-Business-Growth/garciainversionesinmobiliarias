# Preguntas para la revisión del abogado — Política de Privacidad de García Inversiones Inmobiliarias

*(2026-11-11. Revisión puntual de la política que se va a publicar; no se pide una auditoría general. Texto a revisar: `app/privacidad/page.tsx` en la rama `privacy/review-draft`, copiado en `docs/ai/PRIVACIDAD_REVISION.md`, sección 3. Esta es la única lista de cuestiones jurídicas.)*

**Convención.** **[Ley]** = surge del texto oficial de la Ley 25.326 leído (AAIP/infoleg; puede no reflejar reformas). **[Plataforma]** = exigencia contractual de Google/Meta, no ley. **[Propuesta]** = decisión o criterio nuestro, no obligación confirmada.

## Alcance real
- Responsable: **María Fabiana García**, persona humana, titular de García Inversiones Inmobiliarias; matrícula CMCPSI 6378 (verificada en el padrón del colegio, a nombre de María Fabiana García; nombre completo confirmado según su DNI). Domicilio informado (El Talar, Tigre; sin atención al público) autorizado a publicarse. Correo `fabiana@garciainversiones.com.ar` confirmado.
- Campañas iniciales **solo para personas en Argentina**; posible ampliación a Latinoamérica más adelante. No hay campañas previstas a EE. UU. ni España (aunque haya propiedades en Miami). La política **no incluye** apartados sobre otras jurisdicciones.
- Datos: formularios, newsletter, clics hacia WhatsApp (referencia aleatoria sin datos personales directos), analítica y publicidad **solo con consentimiento** (GA4, Pixel de Meta, Google Ads). WhatsApp Business lo atiende la titular; consultas relevantes se cargan **manualmente** en 2Clics; sin lectura automática.

## Preguntas que afectan el cumplimiento

### 1. Transferencias internacionales
- **[Ley]** Art. 12: restringe transferir datos a países sin nivel adecuado; EE. UU. no figura en la lista de la AAIP, que aprobó cláusulas modelo (Res. 198/2023).
- **Hecho:** las funciones del sitio corren en Washington D. C. (Vercel); el envío de correos sale desde São Paulo con cuenta en EE. UU. (según el proveedor). Para Supabase, Upstash, Sentry y 2Clics **no hay región ni contrato verificados**; la política **no los afirma**.
- **Texto público actual:** informa la función de cada proveedor, que algunos tratan datos fuera del país (en particular EE. UU.), que el nivel de protección puede ser distinto y que cada proveedor aplica sus propias condiciones.
- **Preguntas:** ¿es suficiente esa información para el art. 12, o debe contarse con consentimiento específico, cláusulas u otro mecanismo documentado por García? ¿Debe nombrarse el país o la región de cada proveedor? (Criterio propuesto: no; no confirmado.) ¿Qué contratos con proveedores debe conservar García?

### 2. Consentimiento
- **[Ley]** Art. 5: consentimiento libre, expreso e informado; art. 6: información previa (finalidad, destinatarios, datos del responsable).
- **Hecho verificado:** modelo restrictivo. Sin consentimiento no se registra el clic hacia WhatsApp; con analítica: referencia, activo y página; con publicidad: además datos de campaña. El consentimiento se guarda en una cookie del navegador (180 días); no hay registro en el servidor. `CONSENT_VERSION = 2` vuelve a preguntar una vez por el cambio de finalidad informada. Google Maps no carga sin clic o consentimiento de publicidad.
- **Preguntas:** ¿el consentimiento de analítica alcanza para el registro básico del clic? ¿Basta la cookie como prueba del consentimiento o conviene un registro del lado del servidor?

### 3. Conservación y eliminación
- **[Ley]** Art. 4 inc. 7: los datos se destruyen cuando dejan de ser necesarios para su finalidad; no hay plazo legal único.
- **Texto público actual:** criterio por finalidad («mientras sean necesarios…»); solo se anuncian los plazos ya implementados (90 días el origen de visita en el navegador; 180 días la elección de cookies). **No** se anuncia plazo ni eliminación automática para clics de WhatsApp, 2Clics, formularios, correos ni conversaciones.
- **[Propuesta] pendiente de aprobación:** 90 días para clics de WhatsApp sin mensaje asociado (mecanismo auditable construido, **desactivado**); 24 meses para prospectos sin avance en el CRM (referencia: Meta retiene eventos hasta 2 años; no es una norma). Sin borrado automático de 2Clics ni WhatsApp Business.
- **Preguntas:** ¿es adecuado el criterio por finalidad o conviene fijar plazos concretos? ¿Son razonables 90 días y 24 meses? ¿Qué plazo mínimo debe conservarse por documentación comercial u otras obligaciones?

### 4. Registro de bases de datos
- **[Ley]** Arts. 21 y 24 prevén la inscripción de archivos o bases; **no está confirmado** que alcance a una persona humana que lleva consultas, newsletter y un CRM (las páginas leídas de la AAIP no mencionan listas de contacto de sitios web).
- **Pregunta:** ¿debe inscribirse la titular? ¿Con qué alcance?

### 5. Derechos de los titulares y datos del responsable
- **[Ley]** Art. 14: acceso gratuito a intervalos no menores a seis meses, respuesta en 10 días corridos; art. 16: rectificación, actualización o supresión en 5 días hábiles. La política los reproduce.
- **Preguntas:** ¿siguen vigentes esos plazos y mecanismos? ¿Es necesaria alguna leyenda específica de la AAIP más allá del enlace y la mención del órgano de control? ¿Cómo denominar el domicilio de El Talar (legal, de contacto o constituido) existiendo otro publicado en el padrón profesional (Nordelta)? ¿Es obligatorio exhibir el **CUIT**? (Hoy no figura; se obtendrá de documentación oficial solo si corresponde.)

## Relevancia de otros datos (para no agregar información innecesaria al texto público)
- **Regiones y contratos de Supabase, Upstash, Sentry y 2Clics:** se documentan para el abogado y para el cumplimiento del art. 12, pero **no se publican** salvo que el abogado lo indique. Pendiente: acceso a sus paneles y respuesta de 2Clics.
- **Campañas fuera de Argentina:** fuera de alcance hoy; si se amplía a Latinoamérica u otros países se revisará antes.

## Control de publicación
La página lleva la nota «BORRADOR PARA REVISIÓN JURÍDICA»; mientras exista, `PRIVACY_PUBLISH_CHECK=1 npm test` falla. Se quita solo con la validación del abogado.
