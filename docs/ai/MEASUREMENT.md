# Medición, consentimiento y atribución

Estado al 2026-11-10 (commits locales, **sin publicar**). Fuente de verdad del sistema de medición de la web.

## 1. Identificadores verificados

| Activo | Valor | Cómo se verificó |
|---|---|---|
| GTM | `GTM-MBNKBBSW` (versión publicada 7, 13 etiquetas) | `gtm.js` público + `lib/gtm.ts` |
| GA4 | `G-YD6FJKCK3M` | contenedor público (6 apariciones) |
| Meta Pixel / dataset | `1104656670196808` "Píxel de FG Real Estate" (activo, sin CAPI, matching automático off) | contenedor público + MCP Meta 2026-11-10 |
| Cuenta publicitaria | `657032836034925` (business `1990265324418263`) | MCP Meta (auditoría 2026-11-07) |
| Hosts de producción | `www.garciainversionesinmobiliarias.com.ar`, `garciainversionesinmobiliarias.com.ar` | `lib/tracking-hosts.ts` |

Contaminación: el Pixel recibió `localhost` hasta el 2026-11-06; desde el 2026-11-07 solo hosts de producción (MCP Meta, estadística por host).

## 2. Consentimiento (modelo conservador, opt-in previo)

- **Sin elección = sin medición.** GTM (y con él GA4, Meta Pixel, Google Ads) **no se carga** hasta que el visitante acepta algo. El rechazo se guarda y se respeta en cada visita.
- Cookie propia `gi_consent` (`v=1&a=<analítica>&m=<publicidad>&t=<ts>`, 180 días, Lax, Secure). Cambiar la versión (`CONSENT_VERSION`) vuelve a preguntar a todos.
- **Consent Mode v2:** `lib/gtm.ts` define `consent default` = todo `denied` (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`) **antes** de cualquier etiqueta; `update` según la cookie. Analítica → `analytics_storage`; Publicidad → las tres señales de ads.
- **Meta Pixel sin publicidad:** el contenedor v7 carga el Pixel con etiquetas HTML sin condición de consentimiento. Defensa en código: si no hay consentimiento de publicidad se define un `fbq` nulo (el snippet oficial no descarga `fbevents.js`). Al aceptar publicidad después, se recarga la página.
- **Retiro:** borra `_ga*`, `_gid`, `_gcl_*`, `_fbp`, `_fbc` y la atribución guardada; recarga si GTM ya había cargado.
- Se quitó el `<noscript>` de GTM (no se puede condicionar al consentimiento).
- UI: `components/consent/ConsentManager.tsx` (banner + panel), reabrible desde el footer y `/privacidad` ("Preferencias de cookies").
- Siguen funcionando siempre: formularios, Turnstile, WhatsApp, navegación.

## 3. Atribución

Persistencia **solo con consentimiento** (analítica o publicidad); click ids y cookies de Meta **solo con publicidad**. Retención 90 días (provisional, decisión previa).

- Captura (`components/tracking/AttributionCapture.tsx`, `lib/attribution.ts`): UTMs, `campaign_id`, `adset_id`, `ad_id`, `placement`, `site_source_name`, `gclid/gbraid/wbraid/fbclid`, landing (solo path), referrer externo, `session_id` (sessionStorage). First-touch (una vez) y last-touch (solo se reemplaza con señal de campaña o referrer externo). Sin elección, el touch de entrada queda **solo en memoria** y se guarda si el visitante acepta en esa misma visita.
- Envío: campo `attribution` (JSON) en Contacto, Newsletter y consulta de ficha. El servidor lo **valida** (lista blanca, longitudes, consentimiento declarado; descarta click ids sin marketing).
- **Identificación del activo por IDs reales:** `property_app_id` del formulario → desarrollo vía `lib/site-curation.ts`; si no, página de envío; si no, landing de la campaña (`/desarrollos/<slug>`, `/propiedades/<id>`). Nunca por el nombre de la campaña/anuncio. Ej.: 236682 → `domus-brickell-center`; 237474/240593/240587/240588 → `benavidez-village`.
- 2Clics: el mensaje del negocio suma una línea `Atribución web: meta / paid_social · campaña: … (id …) · conjunto id … · anuncio id … · desarrollo: …` (sin datos personales, sin click ids). El `Ref: <event_id>` ya existente cruza con Supabase.
- Supabase: tabla **`lead_attribution`** (sin datos personales; clave `event_id`). SQL en `docs/ai/sql/2026-11-10_lead_attribution.sql` (también en `supabase-schema.sql`). **Aplicada en Supabase (2026-11-11)**; la web funciona igual aunque falle (registro best-effort con timeout de 2 s). Sin consentimiento solo se guarda el registro operativo (tipo, activo, estado CRM) con atribución en NULL.
- No viaja ningún dato personal a GA4, GTM ni Meta (`lib/analytics.ts` descarta claves y valores con forma de email/teléfono).

### Convención de URLs para anuncios de Meta

Parámetros de URL del anuncio (usar macros dinámicas de Meta; los IDs son los que identifican, los nombres son solo legibles):

```
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&utm_id={{campaign.id}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}&site_source_name={{site_source_name}}
```

Destino por activo (la landing también identifica el activo): `/desarrollos/domus-brickell-center`, `/desarrollos/benavidez-village`, `/propiedades/<id>`. Meta agrega `fbclid` solo. Google: `utm_source=google&utm_medium=cpc` + `gclid` automático.

## 4. Eventos (dataLayer → GTM)

Todos salen por `lib/analytics.ts` (`trackEvent`/`trackEventOnce`): solo con consentimiento, solo si existe `dataLayer` (hosts de producción), sin datos personales, sin duplicados por `event_id`.

| Evento | Cuándo | Etiquetas GTM v7 | Notas |
|---|---|---|---|
| `property_view` | ficha de propiedad, desarrollo u oportunidad (`PropertyViewTracker`) | GA4 `property_view` + Meta `ViewContent` | params: `content_type`, `property_id`, `development_slug`, `market`. Si el visitante acepta después, se emite en ese momento. |
| `click_whatsapp` | clic en un enlace a WhatsApp | GA4 + Meta `Contact` | **Intención de contacto, no lead.** WhatsApp sigue en la app Business: un clic no es una conversación. |
| `generate_lead` | consulta **recibida** (Contacto y ficha), una vez, con el `event_id` del servidor | GA4 + Meta `Lead` | El servidor devuelve `event_id` solo tras registrar en 2Clics o respaldar por email. Preview/simulados no lo traen. |
| `newsletter_signup` | alta confirmada | GA4 + Meta `Subscribe` | Secundario; no va a 2Clics ni es `generate_lead`. |
| `thank_you_page_view` | vista de `/gracias-consulta` | ninguna | Informativo. **No cuenta como lead** (recargar o entrar directo no convierte). |
| `consent_update` | cambio de consentimiento | ninguna | Para triggers/variables de consentimiento. |

Removido: `form_submit` (intento de envío; no tenía etiqueta y contaba intentos fallidos).
`select_property` existe en GTM pero el sitio no lo emite (sin cambios).
El `event_id` de `generate_lead` es el mismo `Ref` del CRM y de `lead_attribution`: base para deduplicar con una futura Conversions API.

## 5. GTM publicado — versión 8 (2026-11-11)

Contenedor `GTM-MBNKBBSW` (cuenta 6359369458, contenedor 254669036). **Versión activa: 8** «Medición Meta Ads: consentimiento, parámetros GA4, eventID y PageView único» (14 etiquetas, 6 activadores, 8 variables). Base: v7. **Reversión:** publicar la v7 (`node tools/gtm/gtm.mjs publish 7 --confirm`, con autorización). Respaldos de v7 y v8 en `documentacion/gtm-backups/` (fuera del repo). Administración por la API oficial v2 con cuenta de servicio (`tools/gtm/`, README sin secretos).

Contenido publicado:

1. **Variables de capa de datos (v2):** `DLV - event_id`, `lead_type`, `form_name`, `content_type`, `property_id`, `development_slug`, `market`, `button_location`.
2. **GA4 (etiquetas de evento `generate_lead`, `click_whatsapp`, `newsletter_signup`, `property_view`):** los ocho parámetros anteriores. `event_id` llega a GA4 en el campo nativo `evnid` (no como `ep.event_id`); los parámetros que un evento no trae simplemente no se envían.
3. **Meta (Lead, ViewContent, Contact, Subscribe):** `fbq("track", …, params, {eventID})` con el `event_id` del dataLayer y guardas (nunca envía el texto "undefined"; `content_ids` solo si hay `property_id`). `SelectProperty` sin cambios.
4. **Consentimiento por etiqueta:** `ad_storage` requerido en `Meta - Pixel`, las 4 etiquetas de evento de Meta, `SelectProperty` y el Conversion Linker. GA4 usa `analytics_storage` integrado. Los defaults de Consent Mode se definen solo en el sitio (`lib/gtm.ts`), no en GTM.
5. **Un solo PageView / init por carga:** `Meta - Pixel` (id 4) en `oncePerLoad` (antes `oncePerEvent`: al ser *setup tag* de las demás, repetía `init` + `PageView` en cada evento). Guarda `window.__giMetaLastPath` con la ruta ya contada.
6. **PageView de navegación interna (Next.js):** etiqueta `Meta - PageView navegación interna` con activador `History Change - navegación interna`. Solo envía `PageView` si cambió la **ruta** (`location.pathname`); ignora fragmentos, query, `replaceState` y repeticiones. Respeta `ad_storage`.
7. Sin tocar: activadores de eventos existentes, otros contenedores, campañas, presupuestos.

Verificación (Preview del workspace y luego el contenedor publicado, solicitudes interceptadas → *intentadas*, no recibidas): un `init` por carga, un `PageView` por página (incluida navegación interna Home → Desarrollo → Listado → Ficha → Contacto), `ViewContent` una vez por ficha con `eventID` = `event_id` del dataLayer (también en visitantes recurrentes), sin llamadas a Meta con solo analítica ni tras retirar el consentimiento, sin `PageView` por fragmento/query/`replaceState`. GA4: un `page_view` por URL (GA4 envía el de la página anterior junto al siguiente evento; no hay duplicado). **No verificado:** `Lead` y `Subscribe` (no se generaron leads ni suscripciones artificiales) y la recepción efectiva en Meta/GA4.

**Pendiente (fuera de GTM):** (a) GA4: marcar `generate_lead` como evento clave principal (secundarios `click_whatsapp`, `newsletter_signup`; `property_view` no es conversión); (b) Meta Events Manager: optimizar por `Lead` (`Contact`/`Subscribe` secundarios; `ViewContent` solo audiencias).

### Corrección web asociada (commit 39512be)

`PropertyViewTracker` corría antes de que el script de GTM (`afterInteractive`) creara `window.dataLayer`; los visitantes con consentimiento guardado perdían `property_view`. `lib/when-analytics-ready.ts` reintenta (100 ms, máx. 5 s, solo con consentimiento guardado), dispara una sola vez y se limpia al desmontar.

## 6. Textos legales para validar con un asesor (no son asesoramiento legal)

Actualizados en `/privacidad` (secciones 6 y 10) y requieren validación legal: (a) régimen aplicable (Ley 25.326 AR y, por la audiencia/mercado, normativa de EE. UU.) y si corresponde registrar la base de datos ante la AAIP; (b) texto sobre transferencias internacionales (Google, Meta, Vercel, Supabase, Resend); (c) plazo de 90 días de la información de origen; (d) base de legitimación y derechos de acceso/supresión; (e) fecha "noviembre de 2026"; (f) que el aviso "Rechazar opcionales" tenga el mismo peso visual que "Aceptar todo" (hoy: mismo tamaño y borde, acento dorado solo en aceptar); (g) correo de contacto de privacidad.

## 7. Pendientes / límites conocidos

- Queda una fila de prueba en `lead_attribution` (id 1, `event_id = '__prueba_esquema__'`, sin datos personales); borrarla a mano en el SQL Editor.
- WhatsApp: no hay atribución de la conversación (app Business, sin Cloud API). Solo el clic, con la última campaña guardada.
- No hay Conversions API: el Pixel es 100% navegador; quien rechaza cookies no se mide (esperado en este modelo). `event_id` ya queda listo para deduplicar con una futura CAPI.
- Validación legal de `/privacidad` pendiente (ver `PRIVACIDAD_REVISION.md`); la implementación técnica no equivale a validación jurídica.
- Con «solo analítica» salen pings de Consent Mode de Google (`googlesyndication.com/ccm`, `google.com/g/collect`) sin cookies de publicidad; no son de Meta.
- `Lead` y `Subscribe` sin prueba de extremo a extremo; se verificarán con la primera consulta real.
