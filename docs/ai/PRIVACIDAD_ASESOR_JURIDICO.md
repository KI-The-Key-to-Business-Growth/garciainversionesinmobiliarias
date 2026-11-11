# Resumen para revisión profesional — privacidad de García Inversiones Inmobiliarias

*(2026-11-11. Borrador para el asesor jurídico; no es asesoramiento ni una conclusión legal. Nada está publicado. Texto propuesto: `docs/ai/PRIVACIDAD_REVISION.md`, sección 3. Estado técnico y evidencia: misma fuente, secciones 6 y 12.)*

**Convención.** **[Ley]** = obligación que surge del texto oficial leído (Ley 25.326 en infoleg/AAIP; puede no reflejar reformas posteriores). **[Plataforma]** = exigencia contractual de Google/Meta/proveedor, no una ley. **[Propuesta]** = decisión o recomendación nuestra, **no** obligación confirmada.

## Contexto
- Responsable: **María Fabiana García**, persona humana, nombre comercial García Inversiones Inmobiliarias; matrícula CMCPSI 6378 (verificada en el padrón del colegio); domicilio informado por la titular, autorizado a publicarse, en El Talar, Tigre, sin atención al público; correo `fabiana@garciainversiones.com.ar` (confirmado por la titular). El padrón profesional publica **otro domicilio (Nordelta)**; no se reemplazó uno por otro.
- Sitio argentino de inmobiliaria con propiedades en Buenos Aires y Miami; campañas previstas en Meta y Google, incluidas personas fuera de la Argentina.
- Datos: formularios (nombre, correo, teléfono, mensaje), newsletter, registro técnico de clics hacia WhatsApp (sin datos personales directos), medición con consentimiento (GA4, Pixel, Google Ads). WhatsApp Business: atendido por la titular; consultas relevantes cargadas **manualmente** en 2Clics; sin lectura automática ni IA.

## Cuestiones que requieren resolución

### 1. Consentimiento y registro de clics
- **[Ley]** El tratamiento requiere consentimiento libre, expreso e informado (art. 5) salvo excepciones; la información previa incluye finalidad, destinatarios y datos del responsable (art. 6).
- **Hecho verificado:** sin consentimiento no se registra el clic; con solo analítica: referencia aleatoria, activo y página; con publicidad: además datos de campaña. La elección vive solo en una cookie (180 días): no hay registro del consentimiento en el servidor.
- **[Propuesta aprobada técnicamente]** modelo restrictivo, `CONSENT_VERSION = 2` (volver a preguntar una vez), mapas de Google con carga bajo clic o consentimiento de publicidad.
- **[Plataforma]** Google exige consentimiento y conservar registros de consentimiento en EEE/Reino Unido/Suiza; Meta exige aviso y consentimiento verificable en la UE.
- **Preguntas:** ¿el consentimiento de analítica alcanza para el registro básico del clic? ¿Es necesario o suficiente volver a preguntar a todos? ¿Debe conservarse un registro del consentimiento en el servidor?

### 2. Transferencias internacionales
- **[Ley]** Art. 12: prohíbe transferir datos a países sin nivel adecuado, salvo excepciones. La AAIP no incluye a EE. UU. entre los adecuados y aprobó cláusulas modelo (Res. 198/2023; dos páginas de la AAIP describen distinto su presentación).
- **Hecho verificado:** funciones en Washington D. C. (Vercel); Resend envía desde São Paulo con cuenta en EE. UU. (según el proveedor).
- **Lo que cada proveedor documenta (no prueba que García lo aceptó):** Vercel (DPA solo en Pro/Enterprise; García está en Hobby), Supabase (cláusulas modelo), Resend (cláusulas + DPF), Upstash (DPF/SCC), Sentry (DPA a aceptar de forma expresa), Cloudflare (cláusulas + DPF), Google y Meta (términos propios). **Región y DPA de Supabase, Upstash, Sentry y 2Clics: no verificados** (falta acceso a los paneles / respuesta del proveedor); la política **no nombra regiones** ni afirma garantías.
- **Preguntas:** ¿qué base de transferencia corresponde y qué debe documentar García? ¿Basta informar en la política que algunos proveedores tratan datos fuera del país? ¿Debe nombrarse región o país por proveedor? (Criterio propuesto: no es necesario para el art. 6 mientras se informe la existencia de transferencias; **no confirmado**.)

### 3. Conservación y eliminación
- **[Ley]** Art. 4 inc. 7: destruir los datos cuando dejan de ser necesarios para su finalidad. No fija plazos.
- **[Propuesta]** clics de WhatsApp sin mensaje asociado: **90 días** (mecanismo auditable construido, **desactivado**); origen de la visita en el navegador: 90 días; elección de cookies: 180 días; prospectos sin avance: 24 meses (referencia: Meta retiene eventos hasta 2 años; no es una norma). GA4 configurado: eventos 2 meses, usuarios 14 meses.
- **Sin borrado automático:** contactos de 2Clics y conversaciones de WhatsApp Business.
- **Preguntas:** ¿son adecuados esos plazos? ¿Qué plazo corresponde a formularios, newsletter, correos de consulta, CRM y conversaciones (incluida documentación comercial)? ¿Qué hacer con clics luego vinculados a un mensaje?

### 4. Derechos de los titulares y leyenda de la AAIP
- **[Ley]** Art. 14: acceso gratuito a intervalos no menores a seis meses, respuesta en 10 días corridos; art. 16: rectificación, actualización o supresión en 5 días hábiles.
- **Borrador:** reproduce esos plazos y el enlace de la AAIP; marcados como pendientes de validación (vigencia y leyenda exacta; no se leyó la Disposición DNPDP 10/2008).
- **Preguntas:** ¿siguen vigentes los plazos? ¿Cuál es la leyenda exacta? ¿Cómo denominar el domicilio informado (legal, de contacto o constituido), existiendo otro en el padrón profesional? ¿Es obligatorio exhibir el **CUIT** (hoy no figura en la política; se obtendrá de documentación oficial si corresponde)?

### 5. Registro de bases de datos y contactos comerciales
- **[Ley]** Arts. 21 y 24: registro de archivos o bases; **no está confirmado** que aplique a esta actividad (las páginas leídas de la AAIP no mencionan listas de contacto ni newsletters de sitios web).
- **Preguntas:** ¿debe inscribirse la titular (consultas, newsletter, CRM)? ¿Cuál es la base de licitud del seguimiento comercial y del newsletter, y el mecanismo de baja? ¿Requiere informar algo más el registro manual de consultas de WhatsApp en el CRM?

### 6. Campañas internacionales
- **[Plataforma]** ver punto 1.
- **Pregunta:** ¿las campañas a España/UE o a EE. UU. (Miami) hacen aplicable otro régimen o exigen texto adicional? Hoy la política está redactada solo conforme a la ley argentina.

## Qué impide publicar y qué no
**Impide publicar (siete marcadores `[A CONFIRMAR]` en la página, todos de criterio jurídico):** validación del asesor sobre plazos de derechos y leyenda de la AAIP; redacción de transferencias internacionales; plazo de 90 días de clics de WhatsApp; plazos de formularios/newsletter, CRM y de conversaciones/correos. El control `PRIVACY_PUBLISH_CHECK=1 npm test` sigue bloqueando la publicación.

**No impide publicar (información complementaria):** región y DPA de Supabase, Upstash, Sentry y 2Clics (se documentan con evidencia cuando haya acceso o respuesta; la política no los afirma); denominación jurídica del domicilio y exhibición del CUIT (decisión del asesor). Si el asesor decide que la política **debe** nombrar regiones o exhibir el CUIT, pasan a ser impedimentos.
