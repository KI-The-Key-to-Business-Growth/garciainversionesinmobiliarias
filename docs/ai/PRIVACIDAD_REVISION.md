# /privacidad — texto para revisión (2026-11-11)

Documento de revisión. La implementación técnica **no equivale a validación jurídica**. Lo publicado en `app/privacidad/page.tsx` es el mismo texto de abajo en las secciones modificadas. Las secciones 1–5, 7–9 y 12 no se tocaron.

## Resumen de modificaciones

1. Fecha: "junio de 2026" → "noviembre de 2026".
2. Sección 6: de "puede utilizar" a "utiliza"; se aclara que las herramientas **no se activan hasta que se aceptan**, que se pueden rechazar y retirar, y que no se envían nombre, correo ni teléfono a Google Analytics, Tag Manager ni Meta a través de ellas. Se agrega el bloque "Origen de la visita".
3. Sección 10: las cookies de analítica y publicidad pasan a ser **opcionales**; se explica cómo cambiar o retirar el consentimiento; se agrega el acceso a "Preferencias de cookies".
4. Banner y panel de preferencias (texto en `components/consent/ConsentManager.tsx`).

## Texto final — Sección 6 (agregados/cambios)

> Este sitio utiliza herramientas de medición, analítica y publicidad digital, tales como Google Analytics 4, Google Tag Manager, Meta Pixel y Google Ads, con el objetivo de analizar el uso del sitio, medir conversiones, mejorar la experiencia del usuario y optimizar campañas publicitarias. *(resto de la sección sin cambios: GA4, Meta Pixel, Google Ads)*
>
> Estas herramientas utilizan cookies propias y de terceros para su funcionamiento. **No se activan hasta que las aceptás** en el aviso de cookies, y podés rechazarlas o retirar tu consentimiento en cualquier momento (ver sección 10). No enviamos tu nombre, correo electrónico ni teléfono a Google Analytics, Google Tag Manager ni Meta a través de estas herramientas.
>
> **Origen de la visita.** Si aceptás las cookies de analítica o de publicidad, guardamos en tu dispositivo, por hasta 90 días, el origen de tu visita (por ejemplo, el anuncio o la campaña desde la que llegaste, la página de entrada y el sitio de referencia) junto con un identificador de sesión. Si nos enviás una consulta, asociamos esa información a la consulta para saber qué campañas generan oportunidades reales; no incluye tus datos de contacto. Si rechazás las cookies opcionales, no guardamos esta información.

## Texto final — Sección 10

> Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo. Este sitio utiliza cookies propias y de terceros para los siguientes fines:
> - **Funcionamiento del sitio:** cookies técnicas necesarias para que el sitio funcione correctamente.
> - **Analítica (opcional):** cookies de Google Analytics para medir el uso del sitio de forma estadística y agregada.
> - **Publicidad (opcional):** cookies de Google Ads y Meta Pixel para medir conversiones y mostrar anuncios relevantes.
>
> Las cookies de analítica y de publicidad son opcionales: solo se activan si las aceptás en el aviso que aparece al ingresar al sitio. Si las rechazás, el sitio, los formularios, la verificación de seguridad y los enlaces a WhatsApp siguen funcionando con normalidad.
>
> Podés cambiar tu elección o retirar tu consentimiento en cualquier momento desde «Preferencias de cookies». Al retirarlo, eliminamos las cookies de medición y la información de origen de visita guardada en tu dispositivo.
>
> También podés configurar tu navegador para bloquear o eliminar las cookies. Tené en cuenta que deshabilitar ciertas cookies puede afectar la funcionalidad del sitio.

## Texto del banner

> **Tu privacidad.** Usamos cookies propias y de terceros para medir el uso del sitio y la efectividad de nuestras campañas. Podés aceptarlas, rechazarlas o elegir cuáles permitir. El sitio, los formularios y WhatsApp funcionan igual si las rechazás. [Más información] — *Aceptar todo · Rechazar opcionales · Configurar*

## Afirmaciones que requieren aprobación profesional antes del GO final

Verificadas técnicamente (se pueden sostener con el código actual): no se activan sin aceptación; rechazo y retiro respetados; no se envía nombre/correo/teléfono a GA4/GTM/Meta; retención de 90 días; el origen de visita no incluye datos de contacto.

**A validar por un asesor legal** (no las considero resueltas):
1. Régimen aplicable: Ley 25.326 (AR) y, por el mercado Miami, normativa de EE. UU./Florida; y si corresponde la inscripción de la base ante la AAIP.
2. Base de legitimación del tratamiento y redacción de los derechos de acceso, rectificación y supresión (secciones 3 y 9, no modificadas).
3. Transferencias internacionales de datos (Google, Meta, Vercel, Supabase, Resend): hoy la política no las menciona expresamente.
4. Si guardar el "origen de la visita" asociado a una consulta debe constar como finalidad separada.
5. Plazo de 90 días: es una decisión provisoria nuestra, no un requisito legal.
6. Que "Rechazar opcionales" tenga igual jerarquía visual que "Aceptar todo" (hoy: mismo tamaño y borde; el dorado relleno solo en aceptar).
7. Correo de contacto de privacidad indicado (`contacto@garciainversiones.com.ar`) y la fecha de actualización.
8. Que la afirmación "No vendemos tus datos" (sección 7, sin cambios) siga siendo exacta con Meta/Google Ads activos.
9. Un detalle técnico a conocer: mientras no se aplique el cambio de GTM, la afirmación de que no se envían datos personales se sostiene por el código del sitio, pero Meta recibe además datos propios de su navegador (IP, user agent) como cualquier Pixel.
