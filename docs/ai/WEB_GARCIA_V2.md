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
