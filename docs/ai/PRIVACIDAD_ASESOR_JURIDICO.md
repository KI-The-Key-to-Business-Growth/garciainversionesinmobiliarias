# Resumen para revisión profesional — privacidad de García Inversiones Inmobiliarias

*(2026-11-11. Borrador para el asesor jurídico. Nada de esto está publicado; no es asesoramiento ni una conclusión legal. Detalle técnico completo: `docs/ai/PRIVACIDAD_REVISION.md`.)*

**Cómo leerlo.** «Hecho verificado» = comprobado en el código, en producción o en la página oficial citada. «Propuesta» = decisión nuestra, **no** una obligación legal confirmada. «Pregunta» = lo que necesitamos que el asesor resuelva.

## Contexto
- Responsable: **Fabiana García, persona humana**, nombre comercial García Inversiones Inmobiliarias; matrícula CMCPSI 6378, **comprobada** en el padrón oficial del colegio (a nombre de «María Fabiana García»; denominación legal exacta pendiente de documentación de identidad o fiscal). Domicilio en El Talar, Tigre, autorizado a publicarse como domicilio informado por la titular, sin atención al público; **el padrón del colegio publica otro domicilio (Nordelta)**. Correo `fabiana@garciainversiones.com.ar` (funcionamiento a comprobar). **CUIT: pendiente.**
- Sitio argentino de inmobiliaria con propiedades en Buenos Aires y Miami; se prevén campañas en Meta y Google (incluidas personas fuera de la Argentina).
- Datos que se tratan: formularios de consulta (nombre, correo, teléfono, mensaje), newsletter, clics hacia WhatsApp (registro técnico sin datos personales directos), medición con consentimiento (GA4, Pixel de Meta, Google Ads).
- Marco leído en fuentes oficiales (AAIP/Infoleg): Ley 25.326, arts. 4 inc. 7, 5, 6, 12, 14, 16, 21, 24, 27. El texto leído puede no reflejar reformas posteriores.

## 1. Transferencias internacionales (art. 12)
- **Hecho verificado:** las funciones del sitio corren en Washington D. C. (Vercel); la AAIP no incluye a EE. UU. en su lista de países con nivel adecuado; la AAIP aprobó cláusulas modelo (Res. 198/2023), con plazos de presentación descriptos de forma distinta en dos páginas.
- **Lo que cada proveedor documenta (no prueba que García lo haya aceptado):** Vercel (DPA solo en Pro/Enterprise; García usa Hobby), Supabase (cláusulas modelo; región **no confirmada**), Resend (cuenta en EE. UU.; envío desde São Paulo), Upstash (región no confirmada), Sentry (región fija al crear la organización; DPA a aceptar de forma expresa; región y aceptación **no confirmadas**), Cloudflare (cláusulas + DPF), Google y Meta (términos propios), 2Clics (sin información).
- **Propuesta:** describir cada proveedor, su función y su ubicación sin afirmar garantías que no estén documentadas.
- **Preguntas:** ¿qué base corresponde por transferencia y qué debe documentar García (contratos, cláusulas)? ¿Alcanza con informar en la política? ¿Es necesaria alguna presentación ante la AAIP?

## 2. Registro de bases ante la AAIP (arts. 21 y 24)
- **Hecho:** las páginas de la AAIP leídas no mencionan listas de contacto ni newsletters de sitios web. No sabemos si García está inscripta.
- **Pregunta:** ¿debe inscribirse la titular como persona humana (consultas, newsletter, CRM)? ¿Con qué alcance?

## 3. Consentimiento y registro de clics
- **Hecho verificado en producción:** sin consentimiento no se registra el clic (rechazar + clic = 0 filas); con solo analítica se guarda referencia aleatoria, activo y página (sin datos de campaña); con publicidad, además datos de campaña. La elección vive solo en una cookie del navegador (180 días); **no hay registro del consentimiento en el servidor**.
- **Propuesta (aprobada técnicamente por García):** modelo restrictivo; `CONSENT_VERSION = 2` para volver a preguntar una vez porque la finalidad informada cambió; Google Maps incrustado solo con clic o con consentimiento de publicidad.
- **Preguntas:** ¿el consentimiento de analítica alcanza para el registro básico del clic? ¿Volver a preguntar a todos es suficiente/necesario? ¿Google exige conservar registros del consentimiento para el EEE/Reino Unido y debería implementarse (hoy no existe)?

## 4. Conservación y eliminación
- **Hecho:** la ley (art. 4 inc. 7) exige destruir los datos cuando dejan de ser necesarios; no fija un plazo único.
- **Propuestas (no obligaciones):** clics de WhatsApp sin mensaje asociado: **90 días** (mecanismo de borrado auditable construido, **desactivado**); origen de la visita en el navegador: 90 días; elección de cookies: 180 días; prospectos sin avance: 24 meses desde la última interacción (referencia: Meta retiene datos de eventos hasta 2 años; no es una norma). GA4 configurado: eventos 2 meses, usuarios 14 meses.
- **Sin propuesta de borrado automático:** contactos de 2Clics y conversaciones de WhatsApp Business.
- **Preguntas:** ¿son razonables esos plazos y su fundamento? ¿Qué plazo corresponde a formularios, newsletter, correos de consulta, CRM y WhatsApp (incluida documentación comercial)? ¿Qué hacer con filas de clics vinculadas luego a un mensaje?

## 5. Tratamiento de contactos comerciales
- **Hecho:** las consultas llegan por correo (Resend) y al CRM 2Clics con una nota de origen cuando hubo consentimiento de publicidad; las conversaciones de WhatsApp se mantienen en la aplicación WhatsApp Business, atendida personalmente por la titular (García responsable; WhatsApp encargado según sus términos vigentes desde 2026-09-23). Las consultas relevantes se cargan **manualmente** en 2Clics hasta que exista una integración oficial autorizada; no se leen conversaciones de forma automática ni se usa IA.
- **Preguntas:** base de licitud para el seguimiento comercial y el newsletter; mecanismo de baja; si el registro manual de consultas de WhatsApp en el CRM requiere informar de otro modo a quien escribe; condiciones para una futura integración oficial.

## 6. Normativa aplicable a campañas internacionales
- **Hecho:** Google exige consentimiento para cookies y personalización en el EEE, Reino Unido y Suiza y conservar registros; los términos de Meta exigen aviso y consentimiento verificable antes de sus cookies en la UE.
- **Pregunta:** ¿las campañas a España/UE o a Estados Unidos (Miami) hacen aplicable otro régimen o exigen texto adicional? Hoy la política está redactada solo conforme a la ley argentina.

## 7. Texto definitivo de derechos
- **En el borrador:** acceso gratuito cada 6 meses; respuesta en 10 días corridos (art. 14) y 5 días hábiles para rectificación, actualización o supresión (art. 16); datos de la AAIP.
- **Preguntas:** ¿siguen vigentes esos plazos? ¿Cuál es la leyenda exacta exigida? ¿Es **obligatorio exhibir el CUIT** en esta política? ¿Es adecuada la identificación como persona humana con matrícula y domicilio (con la aclaración de que no es atención al público)? ¿Cómo debe denominarse el domicilio de El Talar (legal, de contacto o constituido) existiendo otro publicado en el padrón profesional?

## Lo que no necesita criterio jurídico (ya resuelto)
Contenidos incrustados (solo mapas, ya con carga controlada), región de envío de correo, funcionamiento del mecanismo de borrado y verificaciones técnicas.

## Qué impide publicar y qué es complementario
### Impedimentos reales para publicar
1. **Validación jurídica** de los puntos de este resumen (transferencias, conservación, derechos y leyenda de la AAIP, consentimiento, campañas internacionales, registro de bases).
2. **CUIT:** obtenerlo de documentación oficial y decidir con el asesor si debe exhibirse.
3. **Denominación legal completa:** nombre según documento de identidad o constancia fiscal (el padrón profesional registra «María Fabiana García»).
4. **Casilla `fabiana@garciainversiones.com.ar`:** comprobar escritura exacta, recepción y control efectivo (mensaje de prueba enviado y respondido por Fabiana).
5. **Denominación del domicilio** de El Talar (legal, de contacto o constituido): el padrón profesional publica otro domicilio (Nordelta) y no se reemplazó uno por otro.

### Información complementaria (no impide publicar por sí sola)
- **Regiones y DPA de Supabase, Upstash y Sentry:** falta acceso a sus paneles (Supabase: Project Settings → General y Legal; Upstash: panel de la base; Sentry: Settings → Legal & Compliance). Si el asesor decide que la política no debe nombrar regiones, se quitan esos marcadores; si debe nombrarlas, pasan a ser impedimento.
- **2Clics:** respuesta del proveedor a la solicitud (texto en `PRIVACIDAD_REVISION.md`, sección 12.2). Mientras no conteste, la política no afirma ubicación ni garantías de 2Clics.
- Verificación de la matrícula: **ya comprobada** en el padrón oficial (https://cmcpsi.org.ar/colegiados/padron): CMCPSI 6378 figura activa a nombre de María Fabiana García. No se compara aún con documentación de identidad o fiscal.
