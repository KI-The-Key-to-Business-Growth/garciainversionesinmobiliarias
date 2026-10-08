# Web García V2 — arquitectura y navegación por intención

Segunda pasada (2026-09), después de revisión visual real en localhost de la primera. Este
documento registra la arquitectura ACTUAL vigente — la primera pasada (Home con grilla "¿Qué
estás buscando?", `/comprar`/`/alquilar` como landings de 3 cards, `/invertir` de 3 cards fijas)
quedó reemplazada, no es una corrección silenciosa: se documenta acá qué cambió y por qué.

## Qué cambia y qué no (sin cambios respecto a la primera pasada)

- 2Clics sigue siendo la única fuente de verdad del inventario (título, precio, imágenes,
  descripción, ubicación, moneda, características). Nada de esto se duplica en Supabase.
- La ficha canónica de una propiedad sigue siendo, siempre, `/propiedades/[id]`.
- El motor de catálogo (`lib/2clics/listings.ts`, `getPropertyCatalog`, filtros de
  `/propiedades`) sigue siendo uno solo — ahora también lo usan `/comprar` y `/alquilar`
  directamente (ver más abajo), no una copia.
- NO se usa el módulo pago `/api/development` de 2Clics como arquitectura V2.

## Regla de curaduría — actualizada (segunda pasada)

**Antes:** toda propiedad publicada pertenecía siempre a Comprar/Alquilar, aunque también
estuviera curada como Desarrollo/Proyecto especial.

**Ahora:** `lib/site-curation.ts` tiene una lista central, `CURATED_PROPERTIES`, con
`propertyId` + `classification` (`'desarrollo'`, `'proyecto-especial'`, `'oportunidad-inversion'`,
extensible a futuras categorías) + `excludeFromStandardCatalog` (booleano, por item). Hoy:

- `187676` (FAB-187676) → `desarrollo` → excluida.
- `206734` (FAB-206734) → `proyecto-especial` → excluida.

La exclusión aplica **solo** a `/comprar` y `/alquilar` (el "catálogo estándar"). Nunca a
`/propiedades` (catálogo maestro técnico/canónico, sigue mostrando todo) ni a "Oportunidades
seleccionadas" del Home (sin cambios, sigue usando `webListing = DESTACADO`).

Implementación en `lib/2clics/listings.ts`: `getPropertyCatalog(searchParams, { excludePropertyIds })`
y `getOperationInventoryFacets(operation, { excludePropertyIds })` — ambos parámetros opcionales,
sin pasarlos el comportamiento es idéntico al de antes de esta pasada (así `/propiedades` no
cambió). La exclusión se resuelve sobre el resultado ya adaptado (no es un filtro de 2Clics), y
`propertyTotalCount` se ajusta consultando si la propiedad excluida matchea los filtros activos
(`propertyMatchesActiveFilters`) — nunca queda un número inflado ni se inventa uno.

## `/comprar` y `/alquilar` — ahora son el catálogo completo, no una landing de 3 cards

Reemplazan la implementación anterior (3 propiedades + botón "Ver todas" → `/propiedades`, NO
aprobada). Ahora reutilizan el mismo componente que `/propiedades`
(`components/properties/CatalogView.tsx`, extraído de `app/propiedades/page.tsx` para poder
compartirlo sin duplicar filtros/cards/paginación) con la operación forzada server-side
(`{...searchParams, operacion: 'venta' | 'alquiler'}`, ignora cualquier `?operacion=` manual) y
`excludePropertyIds: getExcludedPropertyIds()`.

Para que el usuario pueda quedarse en `/comprar`/`/alquilar` sin terminar en `/propiedades`, se
agregaron dos props opcionales y retrocompatibles a `PropertyFilters.tsx` (sin pasarlas, `/propiedades`
funciona exactamente igual que antes):

- `actionPath` — a dónde postea el `<form>` GET (default `/propiedades`).
- `lockedOperation` — oculta el `<select>` de Operación (queda implícita por la página) y la manda
  como campo oculto, para no dejar un control que, cambiado, no tendría efecto real.

`nextPageHref()` (paginación "Ver más") también acepta un `basePath` opcional por el mismo motivo.

Mercados/tipos de los `<select>` de Ubicación/Tipo en `/comprar`/`/alquilar` salen del MISMO
mecanismo que ya usa `/propiedades` (universo público completo, sin recortar por el resto de
filtros activos — decisión ya documentada en `PROPERTY_UX_DECISIONS.md` para evitar que un
`<select>` "mienta"), ahora excluyendo además lo marcado `excludeFromStandardCatalog`.

## Home — reducido y sin la grilla de intención

La sección "¿Qué estás buscando?" (5 cards Comprar/Alquilar/Desarrollos/Invertir/Vender) NO fue
aprobada por duplicar la navegación del Header — se eliminó (`components/sections/IntentNav.tsx`
se borró, no quedó código muerto). El Hero mantiene su copy y "Hablar con un asesor"; ya no tiene
el CTA genérico "Ver propiedades" (removido en la primera pasada, sigue así).

Composición actual del Home (`app/page.tsx`): Hero → **buscador compacto** → Oportunidades
seleccionadas (sin cambios de lógica) → **bloque editorial breve** (Invertir / Vender / Conocé
García) → Contacto → Newsletter → Footer.

Se retiraron de la composición del Home (sin borrar los componentes — siguen existiendo y
reutilizables, solo cambiaron de lugar): `Services` (ahora vive en `/servicios`), `About` y `Why`
(ahora en `/nosotros`, junto con `Markets`). `CtaBand` quedó sin usar en ningún lado por ahora
(no se borró).

## Buscador del Home (`components/sections/HomeSearch.tsx`)

Un único `<form>` con 3 `<select>` (Operación, Mercado, Tipo) + botón "Buscar", posteando a una
Server Action (`actions/home-search.ts`, `submitHomeSearch`) que decide `/comprar` o `/alquilar`
según la Operación elegida y arma la URL con `ubicacion`/`tipo` — mismo contrato de searchParams
que ya resuelve `getPropertyCatalog`. Funciona sin JavaScript (post real de formulario), sin
duplicar el motor de filtros. Mercado/Tipo salen de `getOperationInventoryFacets('all', { excludePropertyIds })` —
universo elegible completo (ambas operaciones), excluyendo lo curado.

## `/nosotros` y `/servicios` — páginas reales

Antes, "Nosotros"/"Servicios" eran anclas del Home (`/#nosotros`, `/#servicios`). Ahora son rutas
reales que reutilizan el contenido institucional YA APROBADO, reorganizado (no reescrito, no se
inventó ninguna cifra/año/cantidad de operaciones nueva):

- `/nosotros`: `About.tsx` (quiénes somos, Fabiana García) + `Why.tsx` (filosofía/mirada
  comercial-patrimonial, diferenciales) + `Markets.tsx` (mercados vigentes Buenos Aires/Miami).
- `/servicios`: `Services.tsx` (asesoramiento en inversiones, compra/venta/alquiler, propietarios,
  desarrollos seleccionados) — contenido sin cambios.

El Header ("Nosotros" → `/nosotros`) y el Footer ("Nosotros" → `/nosotros`, "Servicios" →
`/servicios`, "Mercados" → `/nosotros#mercados`) se actualizaron. `/servicios` no está en el
Header principal (pedido explícito) — accesible desde Footer/sitemap/links contextuales.

## `/desarrollos` — presentación editorial, sin jerga interna

La card chica perdida en espacio vacío (primera pasada, NO aprobada) se reemplazó por
`components/properties/FeaturedSpotlight.tsx` — presentación grande (foto + copy) cuando hay 1-2
proyectos; con 3+ vuelve a la grilla estándar (`CuratedDevelopmentCard`). Se eliminó del copy
público toda explicación interna de arquitectura ("agrupaciones editoriales de propiedades
reales", "no sobre un módulo aparte de emprendimientos") — ese tipo de explicación vive solo acá,
en `docs/ai/`, nunca en el frontend. Copy público: "Proyecto Faena", ubicación real, CTA "Conocer
proyecto" → `/desarrollos/faena`.

`/desarrollos/[id]` sigue resolviendo slug curado (nuevo) o id numérico legacy (`/api/development`,
sin cambios) en la misma carpeta — sin cambios respecto a la primera pasada, ver detalle abajo.

## `/invertir` — replanteado completamente

Se eliminó el enfoque de 3 cards fijas (Desarrollos seleccionados / Proyectos especiales /
Oportunidades de inversión, NO aprobado). Ahora `/invertir` es una landing editorial que explica
que García trabaja caso por caso (a veces vía proyectos seleccionados, link inline a
`/desarrollos`; a veces vía oportunidades puntuales) y lista únicamente las oportunidades
REALES confirmadas (`INVESTMENT_OPPORTUNITIES` en `lib/site-curation.ts`) con la misma
`FeaturedSpotlight` que `/desarrollos` — nunca una card vacía para completar layout.

**Oportunidad real actual:** `proyecto-especial-miami` → propertyId `206734` (FAB-206734),
nombre editorial neutral **"Proyecto especial Miami"**. La nota editorial (`note`, el único texto
no derivado de 2Clics) menciona que García lo trabaja junto con Marcelo Chami y que la estructura
de participación todavía no está confirmada — deliberadamente **no** se usa ningún término legal/
comercial (fondo, coinversión, inversión fraccionada, franquicia, crowdfunding) hasta que exista
documentación oficial. Test de regresión (`tests/2clics/site-curation.test.ts`) verifica que
ninguno de esos términos aparezca en `name`/`note`.

### Landings de inversión (`/invertir/[slug]`)

Arquitectura preparada para múltiples oportunidades futuras: cada slug en
`INVESTMENT_OPPORTUNITIES` resuelve una landing (`InvestmentOpportunityDetailView`) con foto/
descripción/ubicación reales de la propiedad fuente + la nota editorial confirmada — nunca una
ficha inmobiliaria duplicada, siempre linkea a `/propiedades/[id]` como propiedad relacionada. La
ruta vieja `/invertir/proyectos-especiales` (primera pasada) quedó como **redirect** de
compatibilidad hacia `/invertir/proyecto-especial-miami` (o a `/invertir` si no hubiera ninguna
oportunidad cargada) — ya no es la experiencia principal.

## `/vender` — mismo contenido, presentación editorial mejorada

Los 6 pasos (sin cambios de contenido/alcance) pasaron de una lista de cajas a una línea de
tiempo editorial: número Cormorant grande + línea conectora entre pasos, más aire, mismo cierre
(CTA "Quiero vender mi propiedad" → `/#contacto`).

## Footer — normalizado

Padding vertical reducido (72px→48px desktop, 52px→36px mobile) para que no domine visualmente
páginas cortas — contenido/links sin cambios salvo Nosotros/Servicios/Mercados (ver arriba).

## Contenido interno — nunca en el frontend

Cualquier explicación de arquitectura (cómo funciona 2Clics, que no se usa `/api/development`,
que una agrupación es editorial, decisiones de CRM/API) vive solo en `docs/ai/` — se auditó y
retiró del copy público de `/desarrollos` en esta pasada (ver arriba). Nuevo copy público siempre
comercial/neutral, sin inventar datos.

## Desarrollos nativos (`/api/development`) vs. por curaduría — sin cambios respecto a la primera pasada

Sigue vigente lo documentado en la primera pasada: el código legacy de `/api/development`
(`DevelopmentDetailView.tsx`, `getDevelopments`/`getDevelopmentById`) no se tocó, sigue accesible
por id numérico directo en `/desarrollos/[id]`, pero la navegación V2 nunca lo enlaza.

## Caching / propagación

Sin cambios: `lib/2clics/cache.ts`, `TWOCLICS_REVALIDATE_SECONDS` (piso 30s, default 300s) — igual
en `/propiedades`, `/comprar`, `/alquilar` y el resto de las rutas nuevas.

---

# Tercera pasada (2026-09) — sistema coherente, bug de Header y live search

Después de una revisión visual real completa en localhost. Registrado como actualización de
arquitectura, no como corrección silenciosa.

## Bug sistémico corregido — Header tapando el H1 interior

**Causa raíz confirmada:** `app/layout.tsx` hardcodea `<body data-page-type="home">` para TODAS
las rutas (nunca cambia). `globals.css` tenía `body[data-page-type='home'] .site-header {
position: fixed; ... }`, así que el Header flotaba SIN reservar sus 92px de alto en absolutamente
todas las páginas — nunca era visible en el Home real porque su Hero ocupa el viewport completo a
propósito, pero tapaba el H1 de cualquier hero interior (Comprar, Alquilar, Desarrollos, Invertir,
Vender, Nosotros, Servicios, y también `/propiedades`, aunque no estaba nombrado en el reporte
original).

**Hallazgo adicional:** los otros valores de `data-page-type` en `globals.css`
(`property_detail`, `property_listing`, `thank_you`) son código muerto de la migración desde el
sitio legacy — nunca se setean en ningún componente Next.js. No se tocaron (fuera de alcance,
no relacionados con el bug reportado).

**Solución sistémica (un componente, no parches por página):** `components/layout/Header.tsx`
ahora decide su propio modo con `usePathname()` (evaluado correctamente ya en el primer render
server-side, sin flash) — la clase `.site-header--floating` (antes colgada de
`body[data-page-type='home']`) se aplica solo cuando `pathname === '/'`. Toda página interior usa
el `.site-header` sticky por defecto, que SIEMPRE reserva su espacio real (92px desktop / 80px
tablet / 68px mobile) — ningún H1 puede quedar tapado, sin depender de un atributo que nunca
cambiaba. De paso, se aprovechó el mismo `usePathname()` para resaltar el link activo del nav
(`.hdr-active`, `aria-current="page"`) — no pedido explícitamente, pero gratis con el mismo hook.

**Sistema de hero interior unificado:** con el Header corregido, el padding-top que compensaba el
solapamiento (86-92px) quedó sobrante — se recalibró a un tamaño de aire visual real (no de
escape): `.twoclics-catalog-hero`/`.twoclics-detail-hero` pasaron de ~84-86px a 48px top desktop
(28px mobile), `--compact` a 36px (24px mobile). `/propiedades/[id]` (ficha, sin Header global) no
se tocó — ya tenía su propio override `.twoclics-detail-hero--property` independiente.

## Home Search — buscador libre integrado al Hero

Reemplaza al form de 3 selects (Operación/Mercado/Tipo/Buscar, segunda pasada) — ese componente
(`HomeSearch.tsx`) y el bloque de 3 links editoriales (`HomeEditorialLinks.tsx`, y el genérico
`IntentGrid.tsx` que solo él usaba) se **borraron del repo**, sin uso remanente. Composición nueva
del Home: Header → Hero (con buscador integrado, orden Header→Buscador→Título→CTA humano) →
Oportunidades seleccionadas (sin cambios) → Contacto → Newsletter → Footer.

**`components/sections/HeroSearch.tsx`** — input único de texto libre ("¿Qué propiedad estás
buscando?"), sin JS de selects. Debounce 320ms + `AbortController` (cancela la request anterior si
el usuario sigue escribiendo) + guarda mínimo de 2 caracteres. Backdrop navy translúcido +
`backdrop-filter: blur` sobre toda la página (`position: fixed`, confinado dentro del stacking
context de `.hero-content` — nunca necesita superar al Header, que sigue arriba de todo) + panel de
resultados anclado debajo del input (`position: absolute`). Teclado: `Escape` cierra, `ArrowUp`/
`ArrowDown` navegan el listbox, `Enter` navega al resultado activo (`window.location.href`, sin
`useRouter()` — deliberado: `useRouter()` requiere un contexto de router montado y rompe en tests
SSR sin ese contexto; `usePathname()`, que sí tiene fallback, se usa en Header sin problema).
Cierra solo (backdrop + resultados) cuando el input vuelve a quedar vacío o al click afuera.

**`app/api/search/route.ts`** (`GET /api/search?q=`) — capa server-side liviana: recorta la query a
80 caracteres, exige mínimo 2 caracteres antes de tocar 2Clics, aplica rate limit (60 req / 30s por
IP, `checkRate` ya existente) y devuelve siempre `{ results: [] }` ante cualquier error (nunca
rompe el Hero, ni con 2Clics caído). Llama a `searchPublicProperties()` — nunca reenvía la
propiedad completa, solo el DTO mínimo (`propertyId`, `title`, `location`, `operation`, `type`,
`price`, `thumbnailUrl`, `href`).

**`searchPublicProperties()`** (`lib/2clics/listings.ts`) — reutiliza el mismo universo "todo lo
publicado" que ya arma `locationFacetRequest()` (mismo cliente/cache/adapters que el resto del
sitio, sin segunda integración). Normalización (minúsculas, sin acentos vía NFD, espacios
colapsados) + tokens: una propiedad matchea si TODOS los tokens de la búsqueda aparecen en algún
lado del "haystack" combinado (título + ubicación + tipo + operación + código/ID + nombre
editorial de curaduría) — así "casa miami" encuentra sin que la frase exacta exista. Ranking por
relevancia ponderada (título/nombre editorial ×5, ubicación ×4, tipo ×3, código/ID ×2, operación
×1), tope de 8 resultados. **Importante:** el buscador global IGNORA `excludeFromStandardCatalog`
a propósito — esa exclusión es solo de `/comprar`/`/alquilar`; Faena (187676) y el proyecto
especial (206734) siguen siendo perfectamente buscables acá. Verificado contra la API real:
"faena" encuentra 187676 (su título real en 2Clics ya es "Faena Residences Miami"), "FAB-206734"
encuentra 206734 por su código de referencia.

**Campo nuevo en el DTO público:** `PublicProperty.code` (mapeado desde `folder` de 2Clics, ej.
"FAB-206734") — agregado al adapter (`lib/2clics/adapters.ts`) siguiendo el mismo whitelist de
siempre; es un código de archivo del CRM, no dato privado (ya viaja en la respuesta pública de
2Clics tal cual).

## Copy público de 206734 — corregido

La nota editorial que mencionaba a Marcelo Chami y explicaba que "la estructura todavía no está
confirmada" **se eliminó del frontend** — nunca estuvo aprobada como comunicación pública. Ese
conocimiento (con quién se trabaja el proyecto, estado del acuerdo) es información interna; vive
acá, en este documento, nunca en `lib/site-curation.ts` ni en ningún componente. El campo `note`
de `InvestmentOpportunityCuration` pasó a ser opcional — hoy no tiene valor para
"proyecto-especial-miami"; la landing (`/invertir/proyecto-especial-miami`) se arma enteramente
con datos reales de la propiedad (descripción, tipo, superficie, ubicación) + una introducción
genérica ("García está trabajando activamente esta oportunidad..."). Test de regresión verifica
que ni "Marcelo" ni "Chami" aparezcan en ningún componente público.

**Arquitectura extensible para futuras alternativas (sin inventarlas):**
`InvestmentOpportunityCuration` ahora tiene `category` (categoría editorial libre),
`order` (orden de aparición) y `active` (boolean — permite pausar una oportunidad sin borrar el
registro). Sigue sin guardar precio/rentabilidad/fotos/stock — eso sigue viniendo de la fuente
oficial (2Clics) cuando exista. `getActiveInvestmentOpportunities()` filtra+ordena para que
`/invertir` nunca muestre algo pausado ni en desorden arbitrario.

## `/desarrollos` y `/desarrollos/[slug]` — evolución visual

Copy público de `/desarrollos` auditado y limpiado de jerga interna ("agrupaciones editoriales de
propiedades reales", "no sobre un módulo aparte de emprendimientos" — frases de la segunda pasada
que eran, en rigor, explicación de arquitectura, no comunicación comercial). `/desarrollos/faena`
reestructurado para sentirse como landing de proyecto, no ficha reciclada: hero con CTA "Ver
propiedades disponibles" (ancla a la sección de unidades), bloque "Datos del proyecto" (tipo,
superficie total, cantidad de unidades — todo derivado de la propiedad fuente real, nunca
inventado), y CTA final humano ("Hablar con un asesor") reutilizando el componente `.cta-band` ya
existente (antes sin uso desde que `CtaBand.tsx` salió de la composición del Home).

## `/invertir` — más educativa

Se agregó un bloque breve "Cómo analizamos cada oportunidad" (objetivo, mercado, horizonte,
características — criterios generales, sin números ni promesas de retorno) antes de las
oportunidades reales configuradas. Reutiliza la misma `FeaturedSpotlight` que `/desarrollos` para
consistencia visual del sistema.

## `/vender` — landing completa

Se agregaron, reutilizando exclusivamente contenido ya aprobado: intro breve ("el trabajo empieza
antes de publicar"), "Qué hacemos por tu propiedad" (lista tomada literalmente de la tarjeta
"Propietarios" de `Services.tsx` — Tasación profesional, Análisis de mercado, Presentación y
difusión, Seguimiento) y un bloque de diferenciales (3 chips con principios ya usados en el Hero/
Why.tsx). La timeline de 6 pasos se rediseñó como línea de tiempo editorial (número Cormorant +
línea conectora) en vez de lista de cajas. **No se creó FAQ** — no hay contenido oficial vigente
para respaldar preguntas/respuestas jurídicas o comerciales sin inventar información.

## Footer — links completos según arquitectura V2

Columna "Navegación" ahora lista Comprar/Alquilar/Desarrollos/Invertir/Vender; nueva columna
"García" con Nosotros/Servicios/Contacto/Propiedades (el bullet-list estático de servicios que
duplicaba `Services.tsx` como texto plano se reemplazó por un link real a `/servicios`, ahora que
esa página existe). Mercados se mantiene como columna informativa (Argentina/Buenos Aires,
Estados Unidos/Miami — sin agregar otros mercados). Padding vertical sin cambios respecto a la
segunda pasada (ya se había normalizado).

## Componentes eliminados esta pasada (net-new de V2, sin uso remanente)

`components/sections/HomeSearch.tsx`, `components/sections/HomeEditorialLinks.tsx`,
`components/ui/IntentGrid.tsx`, `actions/home-search.ts`. Ninguno era código legacy — todos habían
sido creados en la segunda pasada y quedaron reemplazados por decisión explícita de esta ronda.

---

# Cuarta pasada (2026-09) — Home definitivo tras revisión visual humana

Trabajo acotado exclusivamente al Home. Ninguna otra ruta V2 se modificó.

## Live Search retirado — decisión de producto/UX, no falla técnica

El buscador libre del Hero (`HeroSearch.tsx`, tercera pasada) **no quedó aprobado** para esta
etapa tras la revisión visual. Se retiró por completo, sin dejar código net-new sin uso:

- `components/sections/HeroSearch.tsx` — borrado.
- `app/api/search/route.ts` (y la carpeta `app/api/search/`) — borrado.
- `lib/2clics/listings.ts`: `searchPublicProperties`, `PublicSearchResult` y sus helpers privados
  (`normalizeSearchText`, `searchTokens`, `searchFieldScore`, `buildPublicSearchResult`) —
  borrados.
- `PublicProperty.code` (campo agregado en la tercera pasada solo para que el buscador matcheara
  por código de referencia, ej. "FAB-206734") — borrado del DTO y del adapter; no tenía ningún
  otro consumidor.
- `lib/site-curation.ts`: `getCurationEditorialNames` (solo la usaba el buscador) — borrado.
- **Hallazgo adicional durante la limpieza:** `getOperationInventoryFacets` (y sus tipos
  `OperationInventoryMarket`/`OperationInventoryFacets`), creada en la **segunda** pasada para el
  form de 3 selects (`HomeSearch.tsx`, ya borrado en la tercera pasada), había quedado huérfana
  desde entonces — cero consumidores en todo el repo. Se borró también acá, por ser
  inequívocamente "código net-new del buscador del Home sin uso", aunque técnicamente pertenecía
  a una pasada anterior.
- Tests específicos (`tests/api/search.test.ts`, y los describe blocks de `searchPublicProperties`/
  `HeroSearch` en `tests/2clics/site-curation.test.ts`) — borrados junto con el código que
  probaban. Se agregó en su lugar un test que confirma que ninguno de estos archivos existe.

No se tocó nada de `lib/2clics/client.ts`, `adapters.ts` (salvo el campo `code`), `cache.ts` ni
`config.ts` — la integración de 2Clics en sí no cambió, solo se retiró la capa de agregación que
existía únicamente para el buscador.

## Home — estructura definitiva

`app/page.tsx`: Header → Hero (limpio) → **Trayectoria** (nueva) → Oportunidades seleccionadas →
Contacto (compacto) → Newsletter → Footer.

## Hero — vuelve a la versión limpia, CTA reapuntado

Mismo título, misma bajada, misma fotografía/overlay — sin buscador. **Cambio de comportamiento
explícito:** "Hablar con un asesor" ya no abre WhatsApp — lleva a `/#contacto` (el bloque de
Contacto del Home), igual que el botón "Contacto" del Header. `data-whatsapp-location`/
`target="_blank"` se quitaron de ese botón (ya no aplica: `WhatsAppTracking.tsx` solo instrumenta
clicks a `wa.me`/`whatsapp.com`, así que ese tracking simplemente dejó de dispararse ahí, sin
necesidad de tocar `WhatsAppTracking.tsx`). El WhatsApp directo sigue disponible en Contacto,
Footer y el botón flotante — no desapareció de la web.

## Header — botón "Contacto" reemplaza al teléfono

`.hdr-phone-link` (con el split `.hdr-phone-full`/`.hdr-phone-short` para mobile) se renombró a
`.hdr-contact-link`, ahora un link simple a `/#contacto` con el texto "Contacto" (ya no necesita
variante corta/larga). El teléfono sigue visible en Contacto y Footer. En mobile, "Contacto" se
agregó también a la lista de `MOBILE_LINKS` del menú hamburguesa (antes solo vivía en el botón de
la barra), para llegar por las dos vías esperables en un menú mobile.

## Trayectoria — cifras institucionales reutilizadas de /nosotros

Nuevo componente `components/sections/Trayectoria.tsx`, deliberadamente **sin importar
`Why.tsx`** (para no acoplar este bloque del Home a la sección congelada de `/nosotros` — así
cualquier ajuste futuro acá nunca puede afectar por accidente esa página). Reutiliza tal cual las
tres cifras ya aprobadas en `Why.tsx` (`why-stats`): "+500 Operaciones realizadas", "+20 años En
la industria del real estate", "Buenos Aires + Miami Mercados activos" — mismo número, mismo
label, mismo contexto, sin reinterpretar ni agregar una cuarta métrica. La intro breve ("Comprar,
vender o invertir en real estate requiere criterio, no solo catálogo") es la primera oración de
`About.tsx`, recortada. Diseño: fondo `--ivory`, cifras en Cormorant con gold de acento, labels en
Jost, separadores finos (`border-left`) en vez de cards — sin sombras, sin íconos.

## Contacto — compactado

Mismos 4 canales (WhatsApp/Email/Instagram/Ubicación) y mismo formulario completo (7 campos +
envío), mismo backend/validación (`actions/contact.ts` sin tocar). Cambios solo visuales:

- Sección pasó de `.section` (100px) a `.section-sm` + `.contact--compact` (padding/gaps/radios
  reducidos en panel, form, inputs y textarea — textarea de 150px a 84px de alto mínimo).
- La columna izquierda dejó de ser 4 "cards" (`.contact-item` con fondo/borde/radio propios) para
  ser una lista editorial compacta (`.contact-list--compact`): separador inferior fino en vez de
  card, sin fondo propio.
- Los 3 chips "Atención personalizada / Atención directa / Sin compromiso" (`.trust-badges`) se
  retiraron de la composición — no se reemplazaron por otros badges. CSS de `.trust-badges`/
  `.trust-badge`/`.trust-icon` borrado (único consumidor era este bloque).

## Documentación de la limpieza — dónde vive cada pieza retirada

Ninguna decisión de esta pasada se registra como "bug"/"falla técnica" del buscador o de la API —
es una decisión de producto/UX tomada después de revisión visual, igual que las anteriores.

## Quinta pasada (2026-08) — Contacto sale del Home, landing propia `/contacto`

Ajuste puntual, no una ronda general: única ruta nueva es `/contacto`; el resto de la V2
(`/comprar`, `/alquilar`, `/desarrollos`, `/invertir`, `/vender` salvo el link general, `/nosotros`,
`/servicios`, fichas) no se tocó.

- **Home — estructura definitiva actualizada**: `app/page.tsx` ya no importa ni renderiza
  `Contact`. Orden final: Header → Hero → Trayectoria → Oportunidades seleccionadas → Newsletter →
  Footer. Ninguna sección nueva la reemplaza.
- **`/contacto` — landing nueva** (`app/contacto/page.tsx`): Header → `Contact` → Footer, nada más.
  Metadata propia (`title: 'Contacto | García Inversiones Inmobiliarias'`,
  `alternates.canonical: '/contacto'`). `TurnstileScript` se movió del Home a esta página, porque
  ahora es la única ruta con formulario.
- **`Contact.tsx` sin cambios de lógica/backend**: mismos 4 canales, mismo `ContactForm`
  (`actions/contact.ts` intacto). Único cambio de contenido: se agregó un encabezado editorial
  corto dentro del propio panel (eyebrow "Contacto" ya existente + nuevo `<h1>Hablemos</h1>`), ya
  que ahora es lo primero que se ve en una página propia y no la 4ª sección de un Home largo. Se
  reutilizaron las reglas CSS `.contact-panel h3` (antes sin consumidor real) para el `h1` en vez
  de crear reglas nuevas.
- **Padding recalibrado para página propia**: `.contact--compact` estaba tuneado para vivir a mitad
  de un Home largo (72px de `.section-sm`). Nueva regla `.section-sm.contact--compact` (40px arriba
  / 64px abajo en desktop, 24/40px en mobile) para que el primer viewport bajo el Header muestre el
  encabezado y ambas columnas sin sentirse cortado ni con aire de sobra.
- **Todos los links generales hacia el contacto se actualizaron de `/#contacto`/`#contacto` a
  `/contacto`**: botón "Contacto" del Header (desktop + `MOBILE_LINKS`), CTA "Hablar con un asesor"
  del Hero, link "Contacto" del Footer, CTA "Quiero vender mi propiedad" de `/vender`, fallback
  "Contactar a García" de `ListingState.tsx` (catálogo/ficha/desarrollo/featured vacíos o con
  error), y el redirect legacy de `InquiryCta.tsx` (usado solo por `DevelopmentDetailView.tsx`,
  vista nativa `/api/development` de desarrollos numéricos) — preserva el forwarding de
  `property_app_id`/`development_app_id` por query string, ahora hacia `/contacto?...` en vez de
  `/?...#contacto`. `CtaBand.tsx` (componente sin uso en ninguna página) también se actualizó por
  consistencia.
- **Excepción reportada — sin cambios**: `WhatsAppTracking.tsx` sigue usando
  `link.closest('#contacto')` para clasificar clicks de WhatsApp por ubicación. No requiere cambio
  porque el `id="contacto"` del componente `Contact` se mantiene igual, ahora dentro de `/contacto`
  en vez de dentro del Home — el selector sigue matcheando.
- **Leads específicos de propiedad — sin cambios**: `PropertyDetailView.tsx`/
  `PropertyInquiryPanel.tsx` (modal "Consultar esta propiedad" → `POST /api/lead/message`) no
  referencian `/contacto` ni `/#contacto` y no se tocaron.
- **Sitemap**: se agregó `/contacto` a `app/sitemap.ts`.

## Séptima pasada (2026-08) — Comprar/Alquilar, segunda ronda visual/UX

Segunda pasada visual sobre las mismas dos páginas de la sexta pasada, tras revisión humana en
vivo. Arquitectura sin cambios (misma operación forzada, exclusión curatorial, `getPropertyCatalog`,
contrato de `searchParams`); `/propiedades` no se tocó.

- **Hero sin repetición**: se quitó el eyebrow lateral (duplicaba el H1). Nuevo H1 + bajada:
  "Propiedades para comprar" / "Explorá propiedades disponibles en Buenos Aires y Miami." y
  "Propiedades para alquilar" / "Explorá las propiedades disponibles actualmente." — la bajada de
  Alquilar NO nombra ningún mercado a propósito (el inventario real de alquiler en Miami puede
  cambiar; nombrarlo hoy sería una promesa pública que el inventario dinámico no sostiene).
- **Panel de filtros "acoplado" al Hero**: `.market-page .twoclics-filters` ahora sube con
  `margin-top` negativo sobre el padding-bottom extra del Hero (`.market-page
  .twoclics-catalog-hero--compact`) — el panel blanco queda visualmente montado entre el navy y el
  cream, mismo ancho que la grilla de resultados, sin aumentar la altura total de la página. Sin
  glassmorphism (fondo blanco sólido + sombra normal).
- **CTA renombrado**: "Aplicar filtros" → "Buscar propiedades" en Comprar/Alquilar, reutilizando
  `.btn-primary` (gold/navy, ya aprobado en Hero/CTAs del resto del sitio) en vez de `.btn-dark`.
  `/propiedades` conserva "Aplicar filtros" en navy sin cambios.
- **LocationPicker propio** (`components/properties/LocationPicker.tsx`, Client Component) —
  reemplaza el `<select>` nativo de Ubicación SOLO en Comprar/Alquilar (`/propiedades` sigue con el
  `<select>` tal cual). Combobox accesible (`role="listbox"`/`role="option"`, `aria-haspopup`,
  `aria-expanded`, `aria-activedescendant`, teclado ArrowUp/ArrowDown/Enter/Escape, click-outside)
  con un `<input type="hidden" name="ubicacion">` que viaja en el mismo `<form>` GET de siempre —
  mismo contrato de `searchParams`, mismo `getPropertyCatalog`, sin segundo motor de filtrado.
  - **Agrupación por mercado**: las opciones (`ListingLocationOption`, ahora con `region` y
    `shortLabel` agregados de forma aditiva — `/propiedades` no se ve afectada) se agrupan bajo
    "Buenos Aires"/"Miami" (mismo par ya aprobado en Footer/Trayectoria, no un dato nuevo de
    2Clics). El nivel "state" (Mercado técnico, ej. "Argentina"/"Bs.As. G.B.A. Norte") ya no se
    ofrece como opción — el propio encabezado de grupo lo reemplaza.
  - **Label corto por opción**: cada ubicación muestra solo su nombre "hoja" (`shortLabel`, ej.
    "Tigre", "Benavídez", "Miami") en vez del label compuesto completo (`label`, ej. "Tigre ·
    Argentina") que sí sigue usando el `<select>` de `/propiedades` — el mercado ya es el
    encabezado del grupo, repetirlo en cada opción era la fuente de la confusión reportada.
  - **100% dinámico**: `groupOptions()` (exportada para tests) deriva grupos/opciones directo de
    `availableLocations` (las facets reales ya resueltas server-side) — cero lista hardcodeada de
    barrios/localidades. Si 2Clics agrega una localidad nueva, aparece sola.
  - **Búsqueda interna** ("Buscar ubicación…"): filtra localmente sobre las opciones ya recibidas
    (normalizando mayúsculas/acentos) — sin llamar a 2Clics por tecla, sin API nueva.
  - **Value técnico preservado**: el value que se envía (`state:`/`city:`/`neighborhood:<id>`) no
    cambió — solo la presentación. Un value ya activo que no esté entre las opciones clickeables
    (ej. una URL manual con un `state:` id) igual se conserva en el hidden input y resuelve un
    label razonable para el trigger cerrado.
- **Filtros activos — chips** (`.twoclics-active-filters`, Comprar/Alquilar únicamente): debajo del
  panel, un chip por filtro activo (Ubicación/Tipo/Precio/Dormitorios/Ambientes/Apto crédito, nunca
  Operación —forzada, no removible—) con su label público y un ×. Cada chip es un `<Link>` real a
  `removeFilterHref()` (nueva función en `lib/2clics/listings.ts`, mismo patrón que `nextPageHref`)
  que reconstruye la URL de `searchParams` sin ESE filtro puntual — sin JS, sin segundo estado
  cliente/servidor, mismo motor de siempre.
- **Precio**: sin cambios de semántica/contrato. Con el LocationPicker (compacto) liberando ancho,
  `.market-page .twoclics-filters--locked` amplía la columna de Precio (`minmax(320px,1.9fr)`,
  antes `280px,1.7fr`) para que Desde/Hasta dejen de sentirse mínimos — ajuste solo en Comprar/
  Alquilar, `/propiedades` no lo recibe.
- **"Más filtros"**: misma lógica (`<details>`/`<summary>`, Dormitorios/Ambientes/Apto crédito),
  solo se le quitó el border-top grueso y se cambió el marcador ▸ por +/− en Comprar/Alquilar
  (`/propiedades` conserva el marcador y el borde original).
- **PropertyCard, `/propiedades`, leads, mapas, CRM, Supabase, integración 2Clics**: sin cambios —
  verificado con tests dedicados (overlay/gradient/badges/CTA de la card, y que `/propiedades`
  nunca recibe LocationPicker, chips ni el CTA "Buscar propiedades").

## Octava pasada (2026-08) — Comprar/Alquilar sin Hero interior

Ajuste puntual sobre la misma segunda ronda visual, tras revisión humana en localhost: todo lo de
la séptima pasada (LocationPicker, agrupación por mercado, panel de filtros, Precio, CTA "Buscar
propiedades", Más filtros, filtros activos, grid, exclusión curatorial) quedó **aprobado**. Único
cambio de esta pasada:

- **Se retiró por completo el Hero interior** de `/comprar` y `/alquilar` (bloque navy con H1 +
  bajada). Decisión de producto: estas dos páginas son herramientas de búsqueda funcionales, no
  landings editoriales — la sección activa ya la comunica el Header (Comprar/Alquilar en dorado,
  `.hdr-active`, sin cambios). Composición final: Header → panel de filtros → "Propiedades + N
  resultados" → grid → Footer, nada entre Header y filtros.
- **SEO preservado sin H1 visible**: `title`/`description`/`alternates.canonical` de ambas páginas
  no se tocaron. Para no perder la semántica de encabezado de página, cada una mantiene un
  `<h1 className="sr-only">` (mismo texto que tenía el H1 visible: "Propiedades para
  comprar"/"Propiedades para alquilar") — utilidad `.sr-only` ya existente en `app/globals.css`
  (agregada en la quinta pasada para Contacto).
- **CSS de docking retirado, no dejado muerto**: el `margin-top` negativo de la séptima pasada
  (pensado para que el panel de filtros se "acoplara" al Hero) y el padding-bottom extra del Hero
  ya no tenían sentido sin Hero del que despegar — se eliminaron por completo. El panel de filtros
  ahora es simplemente el primer bloque de `.market-page .twoclics-catalog-section`, con
  `padding-top: 40px` (desktop) / `24px` (mobile ≤680px) de aire fijo respecto al Header — mismo
  criterio de "primer bloque bajo el Header" ya usado en `/contacto` (quinta pasada).
- **Sin cambios**: LocationPicker, agrupación por mercado, Precio, "Más filtros", chips de filtros
  activos, grid de resultados, `PropertyCard`, exclusión curatorial, `/propiedades`, Header global,
  Footer.

## Sexta pasada (2026-08) — Comprar/Alquilar cerrados visualmente, sin tocar arquitectura

Ajuste puntual sobre `/comprar` y `/alquilar` únicamente. Arquitectura sin cambios: mismo motor de
`/propiedades` (`getPropertyCatalog`, `CatalogView`, `PropertyFilters`, `PropertyCard`), operación
forzada server-side, exclusión curatorial, filtros, paginación y fichas canónicas intactos.
`/propiedades` no recibió ningún cambio de esta pasada.

- **Bug real encontrado y corregido — grid de filtros con Operación oculta**: `.twoclics-filters`
  usa un `grid-template-columns` de 5 pistas (`repeat(3, 1fr) minmax(280px,1.7fr) auto`) pensado
  para 5 ítems (Ubicación/Operación/Tipo/Precio/Acciones). En `/comprar` y `/alquilar`, el `<select>`
  de Operación no se renderiza (`lockedOperation`), así que quedan 4 ítems — el auto-placement de
  CSS Grid corría Precio a la 3ª columna (1fr, angosta) y Acciones a la 4ª (1.7fr, botón estirado en
  una columna pensada para Precio). Esto explicaba directamente los síntomas reportados en la
  revisión visual ("Precio se ve fragmentado/estrecho", "Aplicar filtros con demasiado protagonismo
  navy separado de la fila"). **Corregido** con un modifier `.twoclics-filters--locked` (aplicado
  por `PropertyFilters.tsx` solo cuando hay `lockedOperation`) que redefine el grid a 4 columnas
  explícitas en desktop (`repeat(2, 1fr) minmax(280px,1.7fr) auto`) — Ubicación/Tipo comparten las
  dos primeras, Precio conserva su ancho, Acciones queda al final de la fila. `/propiedades` nunca
  recibe la clase (siempre tiene las 5 columnas originales) — cero cambio ahí.
- **Sistema visual de página propio — `.market-page`**: clase en el `<main>` de `app/comprar` y
  `app/alquilar` (no en `/propiedades`) que redecora el contenedor de filtros (fondo blanco, radio
  14px, sombra suave, más aire interno, inputs/selects con radio 10px y foco dorado) y ajusta
  densidad (hero compacto y sección de resultados con menos padding vertical) para que ambas
  páginas entren de forma razonable en los primeros ~800-900px de un desktop. Mismo componente/CSS
  base que `/propiedades` — nada de esto duplica `PropertyFilters`/`CatalogView`/`PropertyCard`, y
  `/propiedades` sigue exactamente igual porque nunca recibe `.market-page`.
- **Hero interior — mismo sistema entre Comprar y Alquilar**: ambas usan el mismo
  `.twoclics-catalog-hero--compact` (ya existente, compartido con Desarrollos/Invertir/Vender/
  Nosotros/Servicios, sin tocar). Se agregó un eyebrow corto ("Comprar"/"Alquilar") sobre el H1
  existente. Copy factual, sin jerga técnica:
  - Comprar: "Explorá propiedades en venta en Buenos Aires y Miami." (venta sí tiene inventario real
    en ambos mercados).
  - Alquilar: "Explorá propiedades en alquiler disponibles en Buenos Aires." — **sin mencionar
    Miami a propósito**: el inventario real de alquiler hoy no tiene ninguna propiedad en Estados
    Unidos (ver bug de Precio/Ubicación documentado en `PROPERTY_UX_DECISIONS.md`, sección
    "Bug real corregido — el estado del usuario nunca debe desaparecer"). Nombrar Miami en el copy
    de Alquilar habría sido una promesa pública incorrecta contra el inventario real y dinámico.
  - Metadata (`description`) de ambas páginas actualizada en el mismo sentido (sin "con filtros por
    mercado, tipo y precio" — lenguaje de implementación, no de cara al usuario).
- **Header/Footer**: sin cambios — el estado activo de Comprar/Alquilar en el Header
  (`.hdr-nav a.hdr-active { color: var(--gold); }`) ya estaba implementado desde una pasada
  anterior; se confirmó que sigue funcionando, no se tocó.
- **`PropertyCard`, `ListingState`, filtros secundarios (Dormitorios/Ambientes/Apto crédito),
  "Limpiar filtros", paginación "Ver más"**: sin cambios de componente — solo se benefician del
  nuevo contenedor `.market-page` cuando corresponde (radio/foco de inputs), sin tocar su lógica ni
  su markup interno.

## Novena pasada (2026-08) — Desarrollos/Faena, cierre visual y funcional

Trabajo exclusivo sobre `/desarrollos` y `/desarrollos/faena`. Arquitectura conceptual sin
cambios: García NO usa el módulo pago de Emprendimientos de 2Clics; `/desarrollos/[slug]` sigue
siendo curaduría editorial sobre propertyIds reales (`lib/site-curation.ts`, solo relaciones —
slug/nombre/propertyIds/orden, nunca precio/superficie/amenities/fotos duplicados); `/propiedades/[id]`
sigue siendo la ficha canónica; el legacy `/api/development` (`getPublicDevelopmentById`,
`DevelopmentDetailView`) sigue sin borrarse, solo sin usarse desde la navegación V2.

- **`/desarrollos` — bajada dinámica, nunca overclaim de mercado**: la bajada del índice decía
  siempre "Buenos Aires y Miami" sin importar qué proyectos hubiera publicados — con Faena como
  único proyecto (Miami), eso era una promesa pública incorrecta. Nueva función
  `activeMarketsPhrase()` (`lib/desarrollos.ts`) deriva el texto de los proyectos REALES presentes
  (mismo par mercado→nombre ya aprobado en Footer/Trayectoria/LocationPicker, no un dato nuevo de
  2Clics): hoy dice "Miami"; si mañana se agrega un proyecto en Buenos Aires, dice "Buenos Aires y
  Miami" solo — sin editar código. `shouldUseFeaturedLayout()` (mismo archivo) extrae el umbral
  1-2 proyectos → spotlight editorial / 3+ → grilla, ya implementado en una pasada anterior, ahora
  testeable de forma directa. Ambas funciones viven en `lib/desarrollos.ts` (no en
  `app/desarrollos/page.tsx`) porque un archivo `page.tsx` de Next solo admite exports con nombre
  reservado — cualquier otro named export rompe el typegen de rutas.
- **Faena — Hero de proyecto con fotografía protagonista**: antes reutilizaba
  `.twoclics-detail-hero`, el mismo hero navy sin foto que la ficha de propiedad — se sentía "la
  ficha 187676 con otro template". Nuevo `.project-hero` (mismo lenguaje visual que el Hero de
  Home: imagen real + degradé navy, escala controlada `min-height:58vh / max-height:620px` para no
  volverse pantalla completa tipo brochure) usa la foto de portada real de 187676. CTA primario
  "Ver propiedades disponibles" (ancla a la sección de unidades, sin cambios) + CTA secundario
  nuevo "Consultar proyecto" → `/contacto`. Fallback defensivo: sin foto de portada, cae al hero
  navy de texto anterior (no se espera en Faena, cubre el caso general).
- **"Datos del proyecto" — corrección real**: mostraba "Tipo" y "Superficie total" tomados directo
  de la propiedad fuente — eso describe LA UNIDAD 187676, no el desarrollo. Se retiraron. El único
  highlight legítimo a nivel proyecto es cuántas unidades reales tiene la curaduría
  (`units.length`) — describe la agrupación editorial en sí, no una propiedad puntual. Regla para
  cualquier campo nuevo que se quiera agregar acá: si el dato describe solo la ficha fuente (dorm./
  baños/superficie/precio de ESA unidad), no es un highlight de proyecto.
- **CTA final → `/contacto`**: el cierre de la landing ("¿Querés conocer más sobre Faena?") abría
  WhatsApp directo (`wa.me`) — inconsistente con el resto del sitio desde que Contacto es una
  landing propia. Corregido a `/contacto`, mismo criterio que Header/Hero/Footer/`ListingState`/
  `InquiryCta` de pasadas anteriores (esta vista específica había quedado afuera de esa barrida).
- **Galería/Amenities/Video/Mapa**: sin cambios de componente (`PropertyGallery`, `PropertyMap`
  reutilizados tal cual — no duplican lógica). Amenities solo si `amenities.length` (hoy: "Permite
  mascotas", el único dato estructurado real). Video solo si `metadata.videoUrl` (hoy: ninguno, sin
  placeholder). Sección "Sobre el proyecto" usa la descripción real de 2Clics verbatim, sin editar
  sentido.
- **Limitación real encontrada, reportada, NO corregida en silencio**: la descripción pública de
  187676 empieza con `[FABIANAGA-456]`, una referencia interna de CRM/broker que 2Clics filtró
  dentro del texto público. Se verificó que este mismo artefacto **ya aparece hoy en la ficha
  canónica `/propiedades/187676`** — no es algo nuevo de esta pasada. Corregirlo requiere tocar el
  pipeline compartido de descripción (`PropertyDescription.tsx`/`formatPublicDisplayValue`), que
  está explícitamente fuera de scope ("no tocar PropertyDetail") — se documenta acá para decisión
  explícita en una pasada futura, no se parchea de forma aislada solo en Desarrollos (dejaría la
  ficha y la landing de proyecto inconsistentes entre sí sobre el mismo dato).
- **Header/Footer**: sin cambios — Desarrollos ya se marca activo en dorado (`.hdr-active`) tanto
  en `/desarrollos` como en `/desarrollos/faena` (matching por prefijo de path, implementado en una
  pasada anterior).

## Décima pasada (2026-08) — `/desarrollos` sin Hero, catálogo visual + saneamiento del tag interno

Corrección puntual sobre `/desarrollos` y el saneamiento público de descripción. `/desarrollos/faena`
NO se rediseñó — solo se benefició automáticamente del saneamiento compartido (ver más abajo).
Arquitectura conceptual sin cambios: sin `/api/development`, curaduría editorial sobre propertyIds
reales, `/propiedades/[id]` sigue siendo la ficha canónica.

- **Hero eliminado por completo**: el bloque navy (eyebrow "DESARROLLOS" + H1 "Proyectos
  seleccionados" + bajada dinámica de mercados) no fue aprobado en la revisión visual. Se retiró
  sin reemplazo — nada de Hero, fondo navy intermedio, eyebrow grande ni bajada. La sección activa
  del Header ("Desarrollos" en dorado) ya comunica dónde está el usuario. Queda un
  `<h1 className="sr-only">Desarrollos</h1>` solo para accesibilidad/SEO, sin equivalente visual.
- **Catálogo visual, un único sistema de grilla**: se eliminó la rama que alternaba entre
  `FeaturedSpotlight` (1-2 proyectos) y una grilla aparte (3+) — reemplazada por
  `.development-grid` (2 columnas desktop, 1 mobile) que funciona igual con 1 proyecto que con 10,
  sin necesitar rediseño al sumar el segundo/tercero. `FeaturedSpotlight` **no se borró como
  componente** — sigue en uso en `/invertir`, fuera de esta pasada.
- **`CuratedDevelopmentCard` rediseñada** (única consumidora, se adaptó en el lugar en vez de crear
  un componente nuevo): imagen protagonista, eyebrow pequeño "Proyecto", nombre editorial,
  ubicación pública, CTA discreto "Conocer proyecto →" — toda la card es un único `<Link>`
  (mismo patrón ya aprobado de `PropertyCard` overlay: "toda la card es un único link"). Se quitó
  el extracto largo de descripción y el conteo de "N propiedades asociadas" que mostraba antes —
  la página debe ser más visual, sin bloques de texto largos ni datos no pedidos. Nunca
  precio/unidades/año/estado/developer/fecha de entrega/rentabilidad/payment plan — García no
  tiene esos datos oficialmente confirmados hoy.
- **Sin mapa, sin split-screen**: decisión explícita — toda el área disponible es para la grilla.
- **Sin filtros de status todavía**: no existen datos estructurados/confirmados de
  pre-construction/under construction/completed — no se construyó esa UI a la espera de tenerlos.
  La grilla queda diseñada para poder agregar búsqueda/filtros en el futuro sin rediseño mayor.
- **Limpieza de helpers net-new sin uso** (`lib/desarrollos.ts`): `activeMarketsPhrase()` y
  `shouldUseFeaturedLayout()` (creadas en la novena pasada, de esta sesión, para lógica que esta
  pasada reemplaza) quedaron definitivamente sin consumidor real — se eliminaron. `excerpt()`
  (para el extracto largo, también retirado del index) también se eliminó. `CuratedEntry` (el tipo)
  se mantiene — sigue siendo necesario. Nada legacy tocado.
- **Saneamiento del tag interno `[FABIANAGA-<número>]`** — problema crítico de presentación
  encontrado en la pasada anterior: la descripción pública de 187676 traía literalmente
  `[FABIANAGA-456]\n\n` como prefijo (verificado byte a byte contra la respuesta real; se
  confirmaron además variantes reales del mismo identificador con otros números — 185, 490, 455,
  427, 430, 428 — en otras propiedades del dataset). Resuelto en la **capa pública compartida más
  angosta posible**: `stripInternalDescriptionTags()` (nueva, exportada desde
  `lib/2clics/metadata.ts`) se invoca dentro de `cleanMetaValue()` — el único punto donde
  `metadata.description` se resuelve para TODA propiedad, antes de llegar a `adaptPublicProperty`/
  `adaptPublicDevelopment`. Como `/propiedades/[id]`, `/desarrollos` y `/desarrollos/[slug]` leen
  todos el mismo `sourceProperty.description` ya adaptado, los tres quedan saneados automáticamente
  sin tocar cada página por separado. Patrón **deliberadamente estrecho**
  (`/\[FABIANAGA-\d+\]/g`) — nunca "borrar todo lo que esté entre corchetes"; texto legítimo con
  corchetes (ej. "[año 2020]") se conserva intacto, verificado con test dedicado. No se tocó la
  respuesta cruda de 2Clics, no se escribió en el CRM — la fuente original queda intacta, la web
  simplemente no expone el token interno. Efecto colateral esperado y deseado: `/propiedades/187676`
  (ficha canónica) también queda saneada, ya que comparte el mismo pipeline — no se tocó
  `PropertyDetailView.tsx` ni `PropertyDescription.tsx` directamente, el saneamiento ocurre antes,
  en la capa de datos.
- **Investigación adicional (aclaración, no un hallazgo de producción)**: durante esta pasada se
  observó en `next dev` un payload con `meta_data` crudo (múltiples propiedades, varios tags
  `[FABIANAGA-*]`) dentro del HTML servido. Se verificó explícitamente contra un build de
  producción real (`next build && next start`) que **ese payload NO existe en producción** — es un
  artefacto del inspector de requests del modo desarrollo de Next.js 15, no una fuga real de datos
  server→cliente. Confirmado con `grep` sobre el HTML productivo de `/propiedades/187676`,
  `/desarrollos` y `/desarrollos/faena`: cero occurrencias de `meta_data`, `metaKey` o
  `FABIANAGA` en los tres.

## Undécima pasada (2026-08) — /desarrollos y /desarrollos/faena, landing editorial compacta

Ajuste puntual sobre las mismas dos rutas de la décima pasada, tras revisión visual: la card de
Faena en el índice quedó demasiado grande, y la landing seguía sintiéndose como una ficha
inmobiliaria larga y fragmentada (hero de 60vh + cajas `.twoclics-detail-panel` apiladas). Fuente
de datos sin cambios — Faena sigue viniendo 100% de la propiedad real 187676; ninguna de estas dos
rutas usa `/api/development`; `lib/site-curation.ts` sigue guardando solo relaciones editoriales.

**`/desarrollos`:**
- Se retiró el contador "1 proyecto" / "N proyectos" — información innecesaria, la propia grilla
  ya lo comunica.
- La grilla dejó de usar `.development-grid` (clase propia, 2 columnas) y pasó a reutilizar
  **directamente `.twoclics-grid`**, el mismo sistema de 3 columnas/densidad que ya usan
  `/comprar`, `/alquilar` y `/propiedades` — con un único proyecto, la card ocupa una celda normal
  (no se estira a media página); con 2, 3 o 10, escala sola sin rediseño.
- `CuratedDevelopmentCard` se redujo a la huella visual de una card de catálogo: imagen
  `aspect-ratio: 1.62/1` (antes 4/3), body de 14-16px de padding (antes 24-28px), H3 en 1.18rem
  (antes 1.55rem). Mismo contenido que antes: imagen, eyebrow "Proyecto", nombre, ubicación, CTA
  "Conocer proyecto →" — toda la card sigue siendo un único `<Link>`.

**`/desarrollos/faena` — reescrita como landing editorial:**
- **Hero full-width de 60vh retirado** (`.project-hero*`, de la novena pasada — sin consumidores,
  CSS eliminado). Reemplazado por `.project-intro`: una sección compacta sobre cream, dos columnas
  en desktop (texto + imagen real de portada, orden invertido en mobile) — eyebrow "PROYECTO", H1
  "Proyecto Faena", ubicación, mención discreta de amenity único (si aplica), un adelanto real de
  la descripción (nunca inventado — mismo texto que "Sobre el proyecto" más abajo, recortado en un
  límite de palabra), CTA primario "Consultar proyecto" → `/contacto`, CTA secundario "Ver
  propiedades disponibles" → ancla interna. Sin imagen de portada, la columna de imagen
  simplemente no se renderiza (degradación con gracia, sin hero navy de reemplazo).
- **Contenido editorial "sin caja"**: Galería (`PropertyGallery`, sin modificar) → "Sobre el
  proyecto" → Amenities/Video reutilizan `.twoclics-ficha-section` — la misma clase ya aprobada en
  `PropertyDetailView.tsx` (secciones separadas por un divisor fino, sin `.twoclics-detail-panel`
  con borde/fondo propio) — mismo lenguaje editorial que la ficha, CSS compartido sin duplicar,
  ahora con dos consumidores.
- **"Datos del proyecto" eliminado por completo**: el único dato que mostraba
  ("Unidades disponibles: 1") no justificaba una sección propia — la grilla de "Propiedades
  disponibles" ya lo comunica.
- **Amenities — umbral explícito**: 2+ amenities estructurados reales → sección "Amenities y
  servicios" (`.twoclics-ficha-section--minor`, h3). Exactamente 1 (hoy: "Permite mascotas") → se
  integra como mención discreta junto a la ubicación en la introducción, sin caja completa. 0 →
  nada. Nunca se infieren amenities desde la descripción libre (menciones de "marina", "club",
  "parque" en el texto NO se convierten en chips) — verificado con test dedicado.
- **Mapa eliminado por completo de esta landing**: sin `PropertyMap`, sin embed de Google Maps, sin
  botón "Abrir en Google Maps". La ubicación textual ("Miami · Florida · Estados Unidos") se
  mantiene en la introducción. Alcance exclusivo de `/desarrollos/faena` — `/propiedades/[id]` y el
  resto de las fichas conservan su mapa sin cambios (verificado en vivo).
- **Propiedades disponibles**: sin cambios de componente — `PropertyCard` (`variant="overlay-catalog"`)
  intacta, link canónico `/propiedades/[id]`. Solo se compactó el padding vertical de la sección
  (`.project-units`) para reducir aire cuando hay pocas unidades.
- **CTA final**: mismo contenido y destino (`/contacto`, sin WhatsApp directo), banda envolvente
  más compacta (`.project-cta-final`, 40px de padding vertical en vez de 72px).
- **Densidad general**: sección de contenido editorial (`.project-body`) con padding vertical
  mínimo entre bloques — la separación real la dan los divisores finos de `.twoclics-ficha-section`,
  no el padding de la sección contenedora.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, mapas de fichas canónicas, integración
2Clics, saneamiento de `[FABIANAGA-*]` (verificado que sigue funcionando, no se tocó el
sanitizador), Header/Footer globales, `/invertir`, `/vender`, `/nosotros`, `/servicios`,
`/comprar`, `/alquilar`, `/propiedades`.

## Duodécima pasada (2026-08) — /desarrollos y /desarrollos/faena, landing 100% editorial

Reescritura sobre la undécima pasada: la introducción-en-caja + galería tradicional + "Sobre el
proyecto" en bloque único seguía sintiéndose una ficha inmobiliaria con otro template, no una
presentación de desarrollo. Alcance exclusivo de estas dos rutas — no se tocó Invertir, Vender,
Nosotros ni ninguna otra parte del sitio. Fuente de datos sin cambios: Faena sigue viniendo 100%
de la propiedad real 187676, sin `/api/development`. Referencia usada solo para **arquitectura de
información y ritmo narrativo** (páginas de desarrollo con imagen protagonista y texto que se
descubre mientras se baja) — nunca para copiar diseño/colores/componentes.

**Decisión rectora (verbatim, documentada también en `docs/ai/PROPERTY_UX_DECISIONS.md`):** las
landings de desarrollos son una capa editorial construida sobre datos reales de propiedades
curadas de 2Clics. No replican la UX de una ficha inmobiliaria ni inventan estructura inmobiliaria
que la fuente no provea.

**Nombre público real, no editorial inventado**: `curation.name` ("Proyecto Faena") resultó ser un
nombre editorial armado internamente por esta curaduría, no un dato de 2Clics — se investigó la
fuente real (`sourceProperty.title`, ya sanitizado por `adaptPublicProperty`) y para 187676 2Clics
devuelve **"Faena Residences Miami"**. Ese es el nombre que ahora se usa en todo lo público: card,
H1, `<title>`/OG, CTA de cierre. `curation.name` se mantiene en `lib/site-curation.ts` solo como
referencia administrativa (mismo rol que `humanRef`), con comentario explícito de que ya no es
dato público. `developmentParent` de 2Clics (campo real, para propiedades con vínculo formal a un
desarrollo) se investigó como fuente alternativa — para 187676 es `null` (sin vínculo formal hoy),
así que no aplica en este caso, pero queda como señal legítima para desarrollos futuros que sí
tengan ese vínculo.

**`/desarrollos` — sin redundancia "Proyecto"/"Proyecto X"**: eyebrow "Proyecto"→"Desarrollo" (ya
no tenía sentido repetir "Proyecto" como eyebrow y "Proyecto Faena" como título). Título = nombre
real de la fuente. CTA "Conocer proyecto →"→"Conocer desarrollo →". Sin cambios de tamaño/huella
de card (ya reducida en la undécima pasada).

**`/desarrollos/faena` — de bloques apilados a narrativa editorial** (helpers nuevos en
`lib/desarrollos.ts`, sin tocar `app/desarrollos/page.tsx` más allá de reexportar tipos):

- **Apertura** (`.project-open`): imagen real protagonista en composición 50/50 con el copy — ni
  el hero de 60vh (novena pasada) ni la introducción-en-caja de la undécima. Eyebrow "Desarrollo",
  H1 = nombre real, ubicación, amenity único como mención discreta (si aplica), primer párrafo real
  de la descripción, un único CTA: "Consultar desarrollo" (`PropertyInquiryPanel`, ver abajo). Sin
  imagen, la columna de imagen simplemente no se renderiza.
- **Sin galería tradicional**: `PropertyGallery` (thumbnails, contador "1/N", flechas) retirado por
  completo de esta landing. Las fotos reales pasan a ser bloques de imagen propios del scroll
  (`.project-editorial-image`, variantes `--full`/`--wide`) — cada imagen es una sección editorial.
- **`selectEditorialImages()`** (`lib/desarrollos.ts`): selecciona fotos reales y únicas, excluye
  la portada, distribuye espaciado a lo largo de todo el array real de imágenes (no las primeras
  N, que en 2Clics suelen venir agrupadas por ambiente/toma similar). Nunca genera/descarga/inventa
  una imagen; con menos fotos reales que las pedidas, devuelve menos, nunca repite.
- **`editorialDescriptionParagraphs()`** (`lib/desarrollos.ts`): divide la descripción real por los
  saltos de línea dobles que la propia fuente ya trae — nunca resume ni reescribe. Saltos simples
  dentro de un bloque (ej. lista de amenities en texto) se preservan vía `white-space: pre-line`,
  sin convertirlos en `<li>`/chips no validables. El primer párrafo acompaña la apertura; el resto
  se alterna con las imágenes editoriales en su orden original. Con Faena, tras la exclusión de
  abajo, sobreviven 2 bloques reales — la landing es corta porque el contenido real disponible es
  corto (regla explícita del pedido: no alargar artificialmente).
- **Exclusión deliberada de precios/plazos, no silenciosa**: la descripción real de 187676 incluye
  también precios por tipología ("... desde U$D ...") y un cronograma de señas con fechas de obra
  estimadas ("DEPOSITOS Y FECHAS", "at top-off/closing"). Contenido real, pero mostrarlo como dato
  público confirmado viola las reglas de esta landing — se excluye por patrón de contenido
  puntual, documentado acá y en `PROPERTY_UX_DECISIONS.md`, el resto del texto real queda intacto.
- **"Ver propiedades disponibles" eliminado** de la apertura.
- **"Propiedades disponibles" — ahora condicional (`units.length > 1`)**: antes se mostraba
  siempre, aunque hoy Faena tenga un único registro real (187676) y terminara mostrando una card de
  la misma propiedad dentro de su propia landing — redundante. Ahora solo aparece con más de un
  `propertyId` real en `curation.propertyIds`; con Faena hoy no aparece. Arquitectura lista para
  cuando existan unidades reales independientes, sin tocar el componente ese día.
- **Amenities**: mismo umbral que la undécima pasada, sin cambios (2+ = sección, 1 = mención
  discreta, 0 = nada).
- **Mapa**: sigue eliminado, sin cambios sobre la undécima pasada.
- **"Consultar desarrollo" reutiliza `PropertyInquiryPanel` sin modificarlo** — el mismo componente
  que `PropertyDetailView.tsx` usa para "Solicitar asesoramiento", con
  `propertyId={sourceProperty.propertyId}` (187676). Envía por `POST /api/lead/message` con
  `property_app_id` = 187676 (verificable vía `data-property-app-id="187676"` en el botón). Nunca
  `/contacto`, nunca WhatsApp directo — a diferencia de la undécima pasada, donde el CTA sí iba a
  `/contacto`. Sin integración 2Clics nueva. No se afirma nada sobre notificaciones por email.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), mapas de fichas canónicas, integración base 2Clics, saneamiento de
`[FABIANAGA-*]`, Header/Footer globales, `/invertir`, `/vender`, `/nosotros`, `/servicios`,
`/comprar`, `/alquilar`, `/propiedades`.

## Decimocuarta pasada (2026-08) — /invertir y /invertir/proyecto-especial-miami, capa de curaduría propia

Reescritura completa de ambas rutas — alcance exclusivo de Invertir, no se tocó ninguna otra
sección. `sourcePropertyId` de la oportunidad sigue siendo `206734` (FAB-206734, sin cambios en
`lib/site-curation.ts` salvo el `name` público) — **no** 187676 (Faena): se confirmó con la
usuaria al detectar la contradicción antes de empezar a escribir código.

**Diagnóstico de la versión anterior**: `InvestmentOpportunityDetailView.tsx` reutilizaba el layout
de ficha inmobiliaria (`twoclics-detail-*`) y mostraba, como si fueran datos de la inversión, los
campos del registro técnico placeholder 206734 — título "Casa en venta en Miami", tipo "Casa",
1000 m2, U$D 100.000, 1 dormitorio — más un CTA "Ver ficha de la propiedad" y una sección
"Propiedad relacionada" con esa misma card. La oportunidad real (participación en el desarrollo de
dos residencias waterfront en Coconut Grove) no tenía ninguna representación propia.

**Por qué esta landing NO puede extraer texto de `sourceProperty.description` (a diferencia de
Faena)**: la descripción real de 206734 es copy de venta con promesas de rentabilidad explícitas
("Retorno estimado para el inversor: superior al 15% anual del capital invertido", ciclos de "18
meses", "USD 100.000" como aporte mínimo) — nada de eso es apto para copy público bajo las reglas
de esta landing. Por eso `lib/investments.ts` no tiene ningún extractor de descripción — es 100%
curaduría explícita, con contenido real provisto directamente por García en esta pasada (specs de
los dos proyectos, developer, riesgos, tesis, tal como se detalla en `PROPERTY_UX_DECISIONS.md`).

**Fuga de datos en el payload RSC — encontrada y corregida durante esta misma pasada**: aunque el
componente nunca renderizaba `sourceProperty.title`/`description`/`address` como texto visible,
pasar el objeto `PublicProperty` completo como prop igual los serializa en el payload que Next.js
manda al navegador para hidratar el árbol de Client Components (acá, `PropertyInquiryPanel`) —
visible en el HTML fuente aunque nunca se pinte. Se verificó en vivo (`curl` + grep sobre el HTML
servido) que "Casa en venta en Miami" y el texto de rentabilidad aparecían en el payload antes de
la corrección. Fix: `InvestmentOpportunityDetailView` ahora recibe un `source` mínimo
(`{ propertyId, region, images }`), nunca el `PublicProperty` completo — verificado de nuevo tras
el fix que ninguno de esos strings aparece más en el HTML servido.

**Auditoría de imágenes reales (18 en 2Clics para 206734)**: descartadas 8 imágenes por contener
copy promocional incrustado en el propio archivo ("100% RENTA PASIVA", "ALTA RENTA 100% PASIVA EN
MIAMI", "INVERSIÓN MÍNIMA USD 100.000") o por pertenecer a una dirección completamente distinta
impresa en la imagen misma ("1000 89 St, Surfside, FL"; "5345 SW 84th St, Miami, FL 33143"; "445 N
Shore, Miami Beach, FL 33141") — mismo criterio que las páginas de brochure descartadas en Faena.
Dos imágenes más (edificio multi-unidad con balcones apilados) se descartaron por no poder
atribuirse con certeza a ninguna de las dos casas unifamiliares de 6-7 dormitorios descriptas. Dos
imágenes con la dirección real impresa (1710/1716 S. Bayshore Dr) permitieron **confirmar** qué
estilo arquitectónico corresponde a cada domicilio — el resultado contradijo el texto tipeado
inicialmente por la usuaria (que tenía Caribbean Colonial/contemporáneo invertidos); se preguntó
antes de publicar y se confió en la imagen etiquetada. Selección final: portada de obra real (sin
texto) para la apertura, y una foto limpia por proyecto (sin repetir, sin exceder su resolución
nativa auditada — ninguna imagen usa `sizes="100vw"`).

**Condiciones vigentes — estructura dinámica nueva**: `InvestmentCurrentConditions` en
`lib/investments.ts` declara `status`/`availability`/`minimumInvestment`/`estimatedHorizon`/
`projectStage`/`lastUpdated`/`capitalRemaining`/`projectedReturn*`/`cta` — ningún bloque narrativo
de la landing hardcodea montos/plazos/porcentajes/fechas. Hoy, sin confirmación pública fechada, se
muestran mensajes "Consultar" en vez de inventar un número o una fecha.

**CTA único**: `PropertyInquiryPanel` reutilizado sin modificar — mismo mecanismo que Faena y que
`PropertyDetailView.tsx`, `property_app_id` = 206734, solo en el cierre de la landing (sin CTA en
la apertura, sin botón "Invertir ahora").

**`/invertir` (índice)**: Hero reescrito (nuevo H1/bajada), "Cómo analizamos cada oportunidad" (4
cards idénticas en cajas) reemplazado por "No todas las inversiones son iguales" + "Formas
distintas de participar en real estate" (grillas editoriales con divisores finos, sin cards), y la
card de la oportunidad pasó de `FeaturedSpotlight` (card boxeada chica) a reutilizar
`.project-open*` (la misma apertura editorial de Faena) — sin ticket mínimo visible.
`FeaturedSpotlight.tsx` queda sin consumidores tras esta pasada (ni Desarrollos ni Invertir lo usan
ya) — no se borró, documentado como componente compartido momentáneamente huérfano.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), integración base 2Clics, `/desarrollos`, `/desarrollos/faena`, `/vender`,
`/nosotros`, `/servicios`, `/comprar`, `/alquilar`, `/propiedades`, Header/Footer globales.

## Decimoquinta pasada (2026-08) — /invertir y /invertir/proyecto-especial-miami, refuerzo educativo

Refinamiento sobre la decimocuarta pasada — dirección visual ya aprobada, se pidió reforzar
educación en `/invertir` y compactar/reordenar la ficha de la oportunidad. Alcance exclusivo de
estas dos rutas.

**`/invertir` (índice) — nueva arquitectura de contenido:**
- A. Intro educativa nueva: "Invertir en real estate no significa siempre comprar una propiedad."
- B. "Formas de participar" — las tres alternativas (Propiedad terminada / Unidad dentro de un
  desarrollo / Participación en un proyecto) pasaron de una frase genérica cada una a 2-3 puntos
  concretos, reutilizando `.invest-audience-list` (ya existente) para las viñetas.
- C. Tabla comparativa nueva ("Qué cambia entre una alternativa y otra"): `<table>` real
  (semántica/accesible) con 6 factores (qué se adquiere, cómo se genera valor, horizonte, liquidez,
  riesgos, nivel de control) × las 3 alternativas — CSS despojado de todo chrome corporativo (sin
  fondo de encabezado, sin bordes por celda, solo divisores finos), con scroll horizontal propio en
  mobile para no desbordar la página.
- D. "Cómo analiza García una inversión" (antes "No todas las inversiones son iguales", 4 factores)
  ampliado a 6: Objetivo, Capital y exposición, Horizonte y necesidad de liquidez, Mercado/
  microubicación/producto, Riesgo y variables de ejecución, Estrategia de salida — más un mensaje de
  cierre conceptual ("no buscamos encajar a todos los clientes en una misma inversión").
- E. Card de la oportunidad — reducida de escala: dejó de reutilizar `.project-open` (la misma
  huella que la apertura completa de una landing propia) y pasó a clases nuevas y propias
  (`.invest-opportunity-section/-card/-media/-copy`) — max-width 860px, imagen 4/3 contenida, menos
  padding, un solo CTA "Conocer la oportunidad", sin ticket mínimo.
- F. Cierre sin cambios de concepto ("Antes de mirar una oportunidad, miramos a la persona.").

**`/invertir/proyecto-especial-miami` — reorden y compactación:**
- "Los dos proyectos de Coconut Grove" se movió justo después de "Qué es esta oportunidad" (antes
  de "Coconut Grove y el valor de una microubicación") — con una oración explícita nueva ("La
  oportunidad está vinculada a dos residencias waterfront diferentes, concebidas como productos
  independientes sobre terrenos contiguos en S. Bayshore Drive.") y cada bloque etiquetado
  "Residencia 1 de 2"/"Residencia 2 de 2" (además de su dirección, imagen propia y lista de datos
  propia — nunca mezclados entre sí) para que la distinción quede inequívoca.
- Apertura y las secciones de texto pasaron a variantes de densidad EXCLUSIVAS de esta vista
  (`.project-open--compact`, `.project-editorial-text--tight`, `.invest-process-steps--compact`) —
  Faena sigue usando las clases base `.project-open`/`.project-editorial-text` sin modificador, sin
  ningún cambio de tamaño ni de comportamiento.
- "Para quién puede tener sentido": encabezados reescritos a tono de análisis en vez de veredicto de
  aptitud financiera — "Puede tener sentido analizarla para alguien que..." /"Probablemente convenga
  considerar otro tipo de alternativa para alguien que...".
- **Estilo arquitectónico (Caribbean Colonial/contemporáneo) retirado de ambos proyectos**: la única
  fuente disponible para atribuirlo a cada dirección son dos imágenes reales de 2Clics con el
  domicilio impreso (idx 16 → 1710, idx 17 → 1716) — re-auditadas de nuevo esta pasada (descargadas
  y revisadas otra vez, no por memoria), mismo resultado que la decimocuarta. La usuaria señaló que
  esto contradice una ficha estratégica/handoff de Olivia Harper Homes a la que esta sesión no tiene
  acceso directo, así que no hay forma de confirmar cuál fuente es correcta. Regla aplicada
  explícitamente: ante una atribución en disputa sin fuente inequívoca disponible, se omite antes
  que publicar algo dudoso — el resto de los datos por proyecto (superficies, ambientes, amenities)
  no está en disputa y se mantiene sin cambios.
- Resto del contenido (Coconut Grove, Cómo funciona, Tesis, Riesgos, Developer, Condiciones
  vigentes, CTA final) sin cambios de concepto — solo el recorte de aire vertical descripto arriba.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), integración base 2Clics, `/desarrollos`, `/desarrollos/faena`, Header/Footer
globales, el resto de las rutas V2.

## Decimosexta pasada (2026-08) — "Desarrollos" es una clasificación editorial, no un dato de 2Clics

Decisión de negocio confirmada (captura de CRM interna): además de Faena, García clasificó tres
registros PROPERTY más de 2Clics como "desarrollo" — **Icon Beach** (187677), **Flow House Miami
Worldcenter** (187681) y **One Hollywood** (187682). Alcance exclusivo de `/desarrollos` y
`/comprar` — no se tocó `/invertir`, `/vender`, `/nosotros`, Home, `PropertyDetailView.tsx` ni
`PropertyCard.tsx`.

**Principio rector, documentado explícitamente:** "Desarrollos" es una clasificación editorial de
determinados `property_app_id` de 2Clics — no depende del módulo pago "Emprendimientos"/
`/api/development` de 2Clics. Los registros clasificados como desarrollo se excluyen de Comprar.
Cada desarrollo tiene (o tendrá) curaduría editorial propia. La ficha de Faena funciona como patrón
estructural/visual para las demás, nunca como fuente de su contenido.

**Auditoría previa (read-only, antes de clasificar):**
- **187677 (Icon Beach)**: título real de 2Clics = "Oportunidad Unica En Hollywood. Muy Cerca De
  Las Playas." (aviso genérico, compartido textualmente con 187682 — no es un nombre de proyecto).
  Departamento, Venta, Miami/Florida/US, 17 imágenes. La descripción real confirma el nombre real
  ("¡Bienvenido a ICON BEACH") pero también trae precios, cronograma de depósitos con fechas, y
  datos de agente/matrícula — no publicable tal cual.
- **187681 (Flow House Miami Worldcenter)**: título real = "Oportunidad Unica En Downtown Miami.
  Renta Garantizada 6 %" — **trae una promesa de rentabilidad incrustada en el propio título**, no
  solo en la descripción. Departamento, Venta, Miami/Florida/US, 21 imágenes. Descripción confirma
  "¡Bienvenido a Flow House Miami Worldcenter!" como nombre real, con precios/garantía de renta
  extensos alrededor.
- **187682 (One Hollywood)**: mismo título genérico que 187677 (coincidencia real, no error).
  Departamento, Venta, Miami/Florida/US, 13 imágenes. Descripción confirma "ONE HOLLYWOOD" como
  nombre real, con specs de edificio/amenities reales pero también precios/cronograma de depósitos.
- **187694** (código de CRM FAB-187694, título esperado "Miami Beach Financiado A Estrenar Y Cerca
  Del Mar 600 - Piso: 9 Depto: Suite Junior"): la External API devuelve **"Not found" en AR y US**
  — confirmado en vivo con una llamada directa al cliente 2Clics, no es un problema de caching ni
  de nuestro código. Se buscó por texto en el catálogo completo (14 propiedades en venta) y se
  encontró **187684** ("¡Bienvenido a PALMA Miami Beach!", address "Miami Beach Financiado A
  Estrenar Y Cerca Del Mar 600", `metadata.unit` = "Suitte Junior") como candidato con evidencia
  fuerte — pero **no se clasificó**: la usuaria pidió explícitamente no asumir el candidato sin
  confirmación, así que 187684 queda documentado como candidato, no como desarrollo.

**Clasificación (`lib/site-curation.ts`):** `CURATED_PROPERTIES` gana 3 entradas
(`classification: 'desarrollo'`, `excludeFromStandardCatalog: true`) y `DEVELOPMENTS` gana 3
entradas (`icon-beach`, `flow-house-miami-worldcenter`, `one-hollywood`) con el mismo shape que
Faena. Se agregó `DevelopmentCuration.publicName: string | null` — cuando existe, tiene prioridad
sobre `sourceProperty.title` (necesario acá porque, a diferencia de Faena, el título real de estos
tres es genérico o trae un claim no publicable). `publicName` viene confirmado por la captura de
CRM y verificado contra el saludo real de la propia descripción — nunca inventado. Para Faena,
`publicName` es `null` (sin cambio de comportamiento: sigue usando `sourceProperty.title`).

**Exclusión de `/comprar`:** cero código nuevo — `app/comprar/page.tsx` ya llamaba
`getExcludedPropertyIds()` (capa de datos, antes de renderizar, afecta también
`propertyTotalCount`); agregar los 3 ids a `CURATED_PROPERTIES` fue suficiente. Verificado en vivo
que ninguno aparece como card ni en conteos.

**Generalización de la ficha de Faena a arquitectura reutilizable:** `CuratedDevelopmentCard` y
`CuratedDevelopmentDetailView` ya estaban escritos de forma genérica (leen `curation`/`source`, no
"Faena" hardcodeado) — no necesitaron reescritura estructural. Lo que si se generalizó: el
fallback de "sin curaduría editorial propia" (ya existía desde la decimotercera pasada, pensado
justamente para este caso) ahora tiene 3 consumidores reales además de Faena — apertura con
imagen/nombre público/ubicación/primer fragmento REAL de la descripción + CTA único, sin inventar
secciones, sin "El edificio"/"Residencias" (esos títulos son específicos de la curaduría de
Faena). La curaduría editorial completa de cada desarrollo nuevo (imágenes por bloque, contenido
propio) queda pendiente, desarrollo por desarrollo, en una pasada futura.

**Fuga de datos en el payload RSC — encontrada y corregida al generalizar (no existía como
problema visible con Faena, cuya data siempre fue segura):** confirmado en vivo que pasar
`sourceProperty: PublicProperty` completo como prop — aunque el JSX nunca renderice más que el
nombre/ubicación/primer fragmento — deja el título/descripción CRUDOS (con la promesa de
rentabilidad de Flow House, precios, datos de agente) serializados en el HTML servido de
`/desarrollos` y `/desarrollos/[slug]`, visibles en "ver código fuente" aunque nunca se pinten.
Mismo mecanismo ya corregido para Invertir en la decimocuarta pasada. Corregido en tres capas:
- `CuratedDevelopmentCard`/`CuratedDevelopmentDetailView` reciben un `source` mínimo
  (`DevelopmentCardSource`/shape equivalente en el detalle) — nunca `PublicProperty` completo.
- El título seguro (`publicName` o el real) y la descripción segura se resuelven ANTES de armar
  ese objeto, en `app/desarrollos/page.tsx`/`app/desarrollos/[id]/page.tsx` — nunca dentro del
  componente. Nueva función compartida `resolveSafeDescription()` (`lib/desarrollos.ts`): con
  curaduría editorial propia (Faena), usa el texto íntegro (ya aprobado); sin ella, reduce a la
  primera oración real — nunca la descripción comercial completa.
- La metadata SEO/OpenGraph (`generateMetadata`) usa la misma descripción segura — antes exponía
  la descripción cruda completa como `<meta name="description">` y como OG description.
- Verificado en vivo antes/después: cero apariciones de "Renta Garantizada", precios, o datos de
  agente en el HTML servido tras el fix.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), ficha y contenido editorial de Faena, `/invertir`, `/vender`, `/nosotros`, Home,
`/comprar`/`/alquilar` (salvo la exclusión de datos, sin cambios de código), integración base
2Clics.

### Decimoséptima pasada — ficha editorial completa de Icon Beach (187677)

Icon Beach dejó de usar el fallback genérico y pasó a tener curaduría editorial propia en
`lib/desarrollos.ts`, segundo desarrollo (después de Faena) con este nivel de detalle. Arquitectura
generalizada, no una página aislada: `EDITORIAL_CURATIONS` ahora resuelve `faena` e `icon-beach`
con el mismo pipeline `sections`/`renderSection` de `CuratedDevelopmentDetailView.tsx`.

**Segunda estrategia de contenido — texto curado original:** la descripción real de 187677 en
2Clics mezcla precio, cronograma de depósitos y datos de agente — no es copy usable como el de
Faena. Se agregaron dos variantes nuevas a `SourceTextSegment`: `curatedText` (párrafo editorial
original) y `curatedList` (lista editorial original), con contenido basado en hechos verificados
—nunca copiado del CRM, nunca inventado— que vive directo en el objeto de curaduría en vez de
extraerse en runtime de `sourceProperty.description`. `resolveSourceTextSegment()` resuelve ambas
variantes sin depender de la descripción cruda; `resolveSafeDescription()` (misma función ya
existente desde la decimosexta pasada) se ajustó con un nuevo helper `segmentNeedsRawDescription()`
para no pasar NUNCA la descripción cruda como prop cuando la curaduría no la necesita (evita
reintroducir la fuga de RSC ya corregida para Flow House/One Hollywood).

**Amenities — nuevo bloque opt-in, generaliza aún más la arquitectura:** `DevelopmentEditorialCuration.amenities`
se activa por desarrollo, solo con 2+ amenities reales estructurados de `source.amenities` (nunca
inferidos del texto libre). Faena no lo activa — su comportamiento previo (sin sección de
amenities) queda exactamente igual.

**Verificación externa con fuentes oficiales (WebSearch/WebFetch), priorizadas sobre portales y
brokers:** developer Related Group (con BH Group), arquitectura CFE Architects, interiorismo Meyer
Davis, paisajismo Witkin Hults + Partners, ubicación real Hollywood Beach. Dos contradicciones
entre fuentes resueltas por peso de evidencia (developer) u omisión explícita (dirección exacta) —
detalle completo en `docs/ai/PROPERTY_UX_DECISIONS.md`.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), ficha de Faena, `/invertir`, `/comprar`, `/alquilar`, Flow House, One Hollywood (no
avanzados esta pasada, por pedido explícito).

### Decimoctava pasada — sistema editorial definitivo (4 fichas curadas)

Flow House Miami Worldcenter y One Hollywood pasan a tener curaduría editorial propia completa
(antes degradaban al fallback genérico) — los 4 desarrollos curados (Faena, Icon Beach, Flow
House, One Hollywood) comparten ahora una única infraestructura declarativa
(`DevelopmentSection`/`DevelopmentSectionLayout` en `lib/desarrollos.ts`), extendida con un nuevo
layout `'snapshot'` (resumen editorial de datos confirmados) y overrides opcionales de
`imageAspect` por bloque — sin crear páginas hardcodeadas independientes. Cada ficha tiene
únicamente las secciones que su material real sostiene (Flow House no tiene "El edificio": sin
foto de exterior de torre limpia en su set de imágenes). Se corrigieron dos bugs reales
encontrados en la auditoría transversal: una fuga de RSC en Faena (la descripción cruda completa,
con tabla de precios y cronograma de depósitos, viajaba en el payload aunque nunca se renderizaba)
y un heading huérfano en Icon Beach (un bloque con párrafo curado no pintaba el párrafo). Detalle
completo — fuentes verificadas de cada developer, auditoría de imágenes, tabla P/S/D/C — en
`docs/ai/PROJECT_STATE.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`.

**Sin cambios**: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), `/invertir`, `/comprar`, `/alquilar` (salvo la exclusión de datos ya vigente).

### Vigésima pasada — Developer fuera de lo público, rango de precio real, "Interiores"

`DevelopmentEditorialCuration` gana un nuevo bloque opt-in `interiors` (mismo patrón que
`amenities`, siempre el último antes del CTA) y el snapshot de las 4 fichas pierde el campo
"Developer" (retirado por decisión editorial, no por problema de fuente). "Rango de precio" se
agrega como primer campo del snapshot, calculado 100% en runtime contra el precio estructurado
real de 2Clics (`formatDevelopmentPriceRange()` en `lib/desarrollos.ts`) — nunca guardado en la
curaduría estática, nunca un rango con máximo inventado. Detalle completo, auditoría de imágenes y
fuentes de precio en `docs/ai/PROJECT_STATE.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`.

### Vigesimosegunda pasada — Pacheco Central, primer desarrollo de Argentina

`DEVELOPMENTS` gana su primer entry con `market: 'AR'` (property_app_id 233719, slug
`pacheco-central`) — aparece automáticamente en `/desarrollos` → Argentina, sin tocar el selector
US/AR. Primer caso real donde el precio estructurado de 2Clics es el de una unidad puntual, no del
desarrollo — nuevo campo obligatorio `priceRepresentsProjectRange` en
`DevelopmentEditorialCuration` (`true` para los 4 de Miami, `false` acá) gatea si
`formatDevelopmentPriceRange()` llega a calcularse. Detalle completo — identificación, fuentes,
auditoría de imágenes — en `docs/ai/PROJECT_STATE.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`.

### Vigesimotercera pasada — mapa de ubicación, "reasons"/"para-quien", groups y cardImageIndex

Pasada integral sobre las 5 fichas vigentes de Desarrollos, convirtiéndolas en presentaciones más
completas y comerciales sin salirse del lenguaje editorial de García. `DevelopmentSection` gana dos
campos opcionales nuevos: `map` (`{ queryLabel, lat?, long? }`) y `groups`
(`{ title, items }[]`, agrupación editorial de una lista cuando el material real la sostiene — hoy
solo Flow House la usa, para sus 3 ejes reales de amenities). `DevelopmentEditorialCuration` gana
un campo obligatorio nuevo, `cardImageIndex`, para que cada desarrollo declare su propia imagen de
portada en `/desarrollos` en vez de asumir `images[0]` (corrigió la portada rota de Pacheco Central
y mejoró las de Icon Beach y One Hollywood). Nuevo `layout: 'reasons'` reutilizable ("Por qué
considerar {nombre}") y un bloque `text-only` "Puede ser una alternativa para", presentes en las 5.

El mapa reutiliza `googleMapsEmbedUrl`/`googleMapsSearchUrl`, ya aprobadas y en producción en
`PropertyMap.tsx` (el mismo componente que usa `PropertyDetailView.tsx`) — sin duplicar lógica y
sin tocar ese archivo. Auditoría en vivo de `lat`/`long` para los 5 property_app_id: los 4 de Miami
devuelven `(0, 0)` — "Null Island", un placeholder del CRM — nunca coordenadas reales; se agregó
`hasSaneCoordinates()` para descartarlas explícitamente, con fallback al texto de ubicación ya
curado y la nota "Ubicación aproximada". Pacheco Central es el único con coordenadas reales
verificadas. CTA único sin cambios de mecanismo, con copy nueva ("Consultar disponibilidad").
Detalle completo — auditoría de mapa, banco de razones por desarrollo, groups de Flow House — en
`docs/ai/PROJECT_STATE.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`.

### Vigesimocuarta pasada — Domus Brickell Center, sexto desarrollo (Estados Unidos)

`DEVELOPMENTS` gana una sexta entry, `sourcePropertyId` **236682** (CONFIRMADO explícitamente por
García — nunca 236646, un segundo registro real del mismo proyecto cargado el mismo día). Ficha
más profunda que las 5 anteriores (el producto de Domus combina real estate + hospitality y
necesita más explicación) pero construida con el mismo sistema declarativo, sin plantilla
distinta. `DevelopmentEditorialCuration` gana cinco campos opcionales nuevos para CTA/modal
contextual (`ctaTitle`/`ctaSubtitle`/`ctaLabel`/`ctaModalTitle`/`ctaInitialMessage`, con default
idéntico al copy genérico para los desarrollos que no los declaran) y `DevelopmentLocationMap`
gana `addressIsExact` (nota "Dirección confirmada" para una calle y número reales sin lat/long,
en vez de "Ubicación aproximada"). Primera ficha con sección "Información comercial"
(texto fijo "Precio: consultar."/"Disponibilidad: consultar información vigente.", sin montos).

**Hallazgo de seguridad real, corregido para las 6 fichas**: el precio estructurado crudo del
registro fuente viajaba en el payload RSC incluso con `hidePrice: true` — el JSX nunca lo pintaba,
pero el número seguía en "ver código fuente". Corregido en `app/desarrollos/[id]/page.tsx`
(`price: sourceProperty.hidePrice ? null : sourceProperty.price`), sin impacto en las 5 fichas
anteriores (ninguna tiene `hidePrice` real). Detalle completo — auditoría de los dos registros de
Domus, auditoría de imágenes, el resto de las secciones nuevas — en `docs/ai/PROJECT_STATE.md` y
`docs/ai/PROPERTY_UX_DECISIONS.md`.

### Vigesimosexta pasada — "Estructura de ingreso" comercial (supera la vigesimocuarta pasada)

El registro 236682 cambió en 2Clics: `hidePrice` pasó a `false` y la descripción vigente trae,
aprobada junto con Fabiana, una comunicación comercial completa (monto de ingreso, unidad de
referencia, calendario de depósitos). Nuevo layout reusable `'commercial-entry'` en
`DevelopmentSection` (`lib/desarrollos.ts`) — el monto se resuelve en runtime contra
`source.price`/`hidePrice` (vía el nuevo `formatCurrencyAmount()`, sin el prefijo "Desde" de
`formatDevelopmentPriceRange()`, para no leerse como precio total), el resto (unidad de referencia,
calendario `DevelopmentDepositStep[]`) es curado y verificado contra la descripción actual. Se
confirmó además, auditando en vivo, que 236646 (el registro duplicado) sigue devolviendo HTTP 404
en el endpoint de detalle pero todavía aparecía como card en el endpoint de listado que alimenta
`/comprar` — agregado a `CURATED_PROPERTIES` con exclusión explícita y una clasificación propia
(nunca `'desarrollo'`) para que no vuelva a filtrarse. Detalle completo en
`docs/ai/PROJECT_STATE.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`.
