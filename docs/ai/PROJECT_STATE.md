# Estado del proyecto — García Inversiones Inmobiliarias

Basado en código real + auditoría read-only del repositorio, 2026-08-21. No es una copia del
handoff — donde el código demuestra que algo ya está implementado, se documenta como
IMPLEMENTADO/APROBADO, no como pendiente.

## Qué funciona hoy (IMPLEMENTADO / APROBADO)

- **Inventario público de propiedades y desarrollos**: 100% migrado a 2Clics External API
  server-side. Ver `ARCHITECTURE.md`.
- **Home, catálogo `/propiedades`, ficha `/propiedades/[id]`, `/desarrollos/[id]`**: implementados
  y con UX aprobada — ver `PROPERTY_UX_DECISIONS.md`.
- **Orden de contenido de la ficha (Descripción → Información básica/Superficies → Amenities →
  Información adicional → Video → Mapa → Relacionadas)**: ya implementado en
  `PropertyDetailView.tsx`, verificado línea por línea. No es una tarea pendiente genérica — las
  próximas mejoras de esa zona serán iteraciones puntuales de contenido/visual que se van a
  definir después, no una reestructuración.
- **Modal de consulta de propiedad**: server-side, `POST /api/lead/message`, portal a
  `document.body`, sin redirigir al Home.
- **Galería con lightbox**: aspect ratio original respetado, `object-fit: contain`.
- **Mapa embebido en ficha**: prioridad coordenadas → dirección → barrio/ciudad/provincia.
- **Whitelist de privacidad**: adapters (`lib/2clics/adapters.ts`) + metadata allowlist/blocklist
  (`lib/2clics/metadata.ts`) filtran todo dato interno antes de llegar a la UI.
- **Caching con revalidación** y manejo de estado explícito ante fallos del proveedor (nunca "0
  propiedades" silencioso).
- **Newsletter** vía Supabase: vigente, sin cambios.

## Web García V2 — navegación por intención (en curso, segunda pasada)

Segunda pasada tras revisión visual real en localhost — reemplaza decisiones de la primera
(documentado como actualización de arquitectura, no corrección silenciosa; detalle completo en
`docs/ai/WEB_GARCIA_V2.md`):

- **Curaduría con exclusión por item**: `lib/site-curation.ts` ahora tiene
  `classification`/`excludeFromStandardCatalog` por propertyId. Faena (187676) y el proyecto
  especial de Miami (206734) quedan fuera de `/comprar`/`/alquilar`, pero siguen completos en
  `/propiedades`.
- **`/comprar` y `/alquilar` son el catálogo completo** (mismo motor/componentes que
  `/propiedades`, operación forzada + exclusión curatorial) — ya no una landing de 3 cards.
- **Home reducido**: sin la grilla "¿Qué estás buscando?" (no aprobada). Hero → buscador
  compacto (`HomeSearch`, Server Action) → Oportunidades seleccionadas → bloque editorial breve
  (Invertir/Vender/Conocé García) → Contacto → Footer.
- **`/nosotros` y `/servicios` son páginas reales** (antes anclas del Home), reutilizando
  contenido institucional ya aprobado sin inventar cifras.
- **`/invertir` replanteado**: sin las 3 cards fijas; landing editorial + oportunidades reales
  confirmadas (`INVESTMENT_OPPORTUNITIES`), hoy una: "Proyecto especial Miami" (206734), con
  nombre/nota editorial neutral (sin definir fondo/coinversión/etc. sin documentación oficial).
- **`/desarrollos`**: presentación editorial de mayor escala para pocos proyectos, sin jerga
  interna de arquitectura en el copy público.

El catálogo maestro (`/propiedades`), la ficha canónica (`/propiedades/[id]`) y el flujo legacy de
desarrollos nativos de 2Clics (`/api/development`) no cambiaron de comportamiento.

### Tercera pasada (2026-09) — sistema coherente, bug de Header, live search

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Resumen:

- **Bug sistémico corregido**: el Header flotaba (sin reservar su alto) sobre TODAS las páginas
  por un `data-page-type="home"` hardcodeado en `app/layout.tsx` que nunca cambiaba — tapaba el H1
  de cualquier hero interior. Corregido en el propio `Header.tsx` (`usePathname()` decide
  floating vs. sticky), no con parches por página.
- **Home Search**: el form de 3 selects (`HomeSearch.tsx`, segunda pasada) se reemplazó por un
  buscador de texto libre integrado al Hero (`HeroSearch.tsx` + `GET /api/search` +
  `searchPublicProperties()` en `lib/2clics/listings.ts`). Busca sobre TODO el inventario público,
  incluidas las propiedades curadas (Faena, proyecto especial) — `excludeFromStandardCatalog`
  sigue aplicando solo a `/comprar`/`/alquilar`, nunca a esta búsqueda global.
  `HomeSearch.tsx`/`HomeEditorialLinks.tsx`/`IntentGrid.tsx`/`actions/home-search.ts` se borraron
  (sin uso remanente).
- **Copy público de 206734 corregido**: se quitó la mención a Marcelo Chami y la frase sobre
  estructura "todavía no confirmada" — nunca estuvo aprobada como comunicación pública. Esa
  información es interna (documentada en `WEB_GARCIA_V2.md`), nunca en código de frontend.
- **`/desarrollos`, `/desarrollos/faena`, `/invertir`, `/vender`**: evolución visual/de contenido
  (ver `WEB_GARCIA_V2.md`) reutilizando siempre datos reales de 2Clics o copy ya aprobado — sin
  inventar developer, retornos, FAQ ni capacidades nuevas.

### Cuarta pasada (2026-09) — Home definitivo (única ruta tocada)

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Resumen:

- **Live Search retirado del Home** — decisión de producto/UX tras revisión visual, NO una falla
  técnica. `HeroSearch.tsx`, `app/api/search/`, `searchPublicProperties()`/`PublicSearchResult`
  (`lib/2clics/listings.ts`), `PublicProperty.code` (adapter/types) y
  `getCurationEditorialNames()` (`lib/site-curation.ts`) se borraron — cero uso remanente. De
  paso se encontró y borró `getOperationInventoryFacets()`, huérfana desde la tercera pasada
  (pertenecía al form de 3 selects de la segunda pasada, ya borrado entonces).
- **Home definitivo**: Header → Hero (limpio, sin buscador) → Trayectoria (nueva, cifras
  reutilizadas de `/nosotros`: +500, +20 años, Buenos Aires + Miami) → Oportunidades
  seleccionadas (sin cambios) → Contacto (compactado) → Newsletter → Footer.
- **Hero**: "Hablar con un asesor" ya no abre WhatsApp — lleva a `/#contacto`.
- **Header**: el botón de la derecha pasó de mostrar el teléfono a decir "Contacto" (mismo
  `/#contacto`). El teléfono sigue visible en Contacto y Footer.
- **Contacto**: mismos 4 canales y mismo formulario/backend, presentación más compacta; se
  retiraron los chips "Atención personalizada/Atención directa/Sin compromiso" sin reemplazo.
- Ninguna otra ruta V2 (`/comprar`, `/alquilar`, `/desarrollos`, `/invertir`, `/vender`,
  `/nosotros`, `/servicios`, fichas) se tocó en esta pasada.

### Quinta pasada (2026-08) — Contacto sale del Home, landing propia `/contacto`

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Ajuste puntual (no una ronda general V2):

- **Contacto deja de ser una sección del Home**: `app/page.tsx` ya no importa/renderiza `Contact`.
  Home definitivo: Header → Hero → Trayectoria → Oportunidades seleccionadas → Newsletter → Footer.
- **`/contacto` es ahora una landing real**: Header → `Contact` (mismos 4 canales + mismo
  formulario/backend, con un encabezado editorial propio "Hablemos") → Footer. Metadata y sitemap
  propios.
- **Header y Hero apuntan a `/contacto`**, no a `/#contacto`. Igual el link de Contacto del Footer,
  el CTA "Quiero vender mi propiedad" de `/vender`, el fallback "Contactar a García" de
  `ListingState.tsx` y el redirect legacy de `InquiryCta.tsx` (desarrollos nativos numéricos).
- Ninguna otra ruta V2 ni el flujo de leads específico de propiedad (`PropertyInquiryPanel.tsx` →
  `POST /api/lead/message`) se tocó en esta pasada.

### Sexta pasada (2026-08) — Comprar/Alquilar cerrados visualmente

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Ajuste puntual sobre `/comprar` y `/alquilar`
únicamente — arquitectura del motor de catálogo sin cambios, `/propiedades` no se tocó:

- **Bug real corregido**: el grid de filtros (`.twoclics-filters`, 5 columnas) asumía siempre 5
  ítems (incluida Operación); en Comprar/Alquilar (Operación oculta) el auto-placement de CSS Grid
  corría Precio/Acciones a columnas equivocadas — causa real de "Precio fragmentado" y "Aplicar
  filtros con demasiado protagonismo". Corregido con el modifier `.twoclics-filters--locked`.
- **`.market-page`**: sistema visual propio de página (contenedor de filtros más editorial, hero
  y secciones más compactas) aplicado solo en `/comprar`/`/alquilar` — `/propiedades` no lo recibe.
- **Copy**: eyebrow + bajada factual en ambos Hero. Alquilar deliberadamente no menciona Miami
  (hoy sin inventario real de alquiler en ese mercado).
- Header, Footer, `PropertyCard`, filtros secundarios y `/propiedades` sin cambios de componente.

### Séptima pasada (2026-08) — Comprar/Alquilar, segunda ronda visual/UX

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Arquitectura sin cambios; `/propiedades` no se
tocó.

- **Hero sin eyebrow duplicado**: nuevo H1 + bajada ("Propiedades para comprar/alquilar"). La
  bajada de Alquilar no nombra ningún mercado a propósito (inventario dinámico).
- **LocationPicker propio** (`components/properties/LocationPicker.tsx`): combobox accesible que
  reemplaza el `<select>` nativo de Ubicación SOLO en Comprar/Alquilar, agrupado por mercado
  (Buenos Aires/Miami) con nombres cortos por opción, 100% derivado de las location facets reales
  (`groupOptions()`, sin lista hardcodeada). Mismo `name="ubicacion"`/contrato de `searchParams`.
- **Panel de filtros acoplado al Hero** (margin-top negativo, sin glassmorphism), CTA renombrado a
  "Buscar propiedades" (gold/navy), chips de "filtros activos" removibles individualmente
  (`removeFilterHref()`).
- `/propiedades`, `PropertyCard`, leads, CRM, Supabase, integración 2Clics: sin cambios.

### Octava pasada (2026-08) — Comprar/Alquilar sin Hero interior

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Ajuste puntual sobre la séptima pasada (todo lo
demás de esa ronda —LocationPicker, filtros, Precio, CTA, chips— quedó aprobado sin cambios).

- Se retiró el Hero navy (H1 + bajada) de `/comprar` y `/alquilar`: son páginas funcionales de
  búsqueda, no landings editoriales. La sección activa ya la comunica el Header.
- Composición: Header → filtros → "Propiedades + N resultados" → grid → Footer.
- SEO intacto (`title`/`description`/`canonical` sin cambios); cada página mantiene un
  `<h1 className="sr-only">` para accesibilidad/semántica sin mostrar título visible.
- CSS de "docking" (margin-top negativo del panel contra el Hero) retirado por completo, sin
  reglas muertas — el panel ahora es el primer bloque bajo el Header con aire fijo.

### Novena pasada (2026-08) — Desarrollos/Faena, cierre visual y funcional

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Trabajo exclusivo sobre `/desarrollos` y
`/desarrollos/faena` — arquitectura sin cambios (curaduría editorial sobre propertyIds reales,
sin `/api/development`, `/propiedades/[id]` sigue siendo la ficha canónica).

- `/desarrollos`: bajada dinámica (`activeMarketsPhrase()` en `lib/desarrollos.ts`) — dice "Miami"
  hoy (único proyecto real), nunca "Buenos Aires y Miami" sin un proyecto real en cada mercado.
- Faena: nuevo Hero con fotografía protagonista (`.project-hero`) en vez de reutilizar el hero
  navy sin foto de la ficha. "Datos del proyecto" ya no muestra Tipo/Superficie de la unidad fuente
  como si fueran atributos del desarrollo — solo "Unidades disponibles". CTA final corregido de
  WhatsApp directo a `/contacto`.
- **Limitación real encontrada y reportada en esta pasada** (`[FABIANAGA-456]`): **corregida en la
  décima pasada**, ver abajo.

### Décima pasada (2026-08) — `/desarrollos` sin Hero, catálogo visual + saneamiento del tag interno

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Corrección puntual sobre `/desarrollos` y el
saneamiento público de descripción; `/desarrollos/faena` no se rediseñó (solo se benefició del
saneamiento compartido).

- Hero navy de `/desarrollos` eliminado por completo, sin reemplazo — `<h1 className="sr-only">`
  para SEO/accesibilidad. Composición: Header → catálogo visual → Footer.
- Índice pasa a un único sistema de grilla (`.development-grid`, 2 columnas desktop / 1 mobile)
  para cualquier cantidad de proyectos — se eliminó la rama `FeaturedSpotlight` (1-2) / grilla
  (3+). `FeaturedSpotlight` sigue en uso en `/invertir`, no se borró.
- `CuratedDevelopmentCard` rediseñada (imagen protagonista, sin extracto largo, sin conteo de
  unidades, solo imagen/nombre/ubicación/link). Sin mapa. Sin filtros de status (no hay datos
  confirmados todavía).
- Helpers net-new sin uso eliminados de `lib/desarrollos.ts`: `activeMarketsPhrase()`,
  `shouldUseFeaturedLayout()`, `excerpt()` (todos de la novena pasada, reemplazados por esta).
- **`[FABIANAGA-<número>]` corregido**: nueva `stripInternalDescriptionTags()`
  (`lib/2clics/metadata.ts`), aplicada en el único punto donde se resuelve `metadata.description`
  para toda propiedad — cubre `/propiedades/[id]`, `/desarrollos` y `/desarrollos/[slug]` a la vez,
  sin tocar la respuesta cruda de 2Clics. Patrón estrecho, no borra corchetes legítimos.
  Verificado en build de producción real (no solo dev) que no queda ningún rastro del tag ni de
  `meta_data` crudo en las tres superficies públicas.

### Undécima pasada (2026-08) — /desarrollos y /desarrollos/faena, landing editorial compacta

Detalle completo en `docs/ai/WEB_GARCIA_V2.md`. Corrección sobre la décima pasada: la card de
Faena en el índice era demasiado grande y la landing seguía sintiéndose como una ficha
inmobiliaria fragmentada. Fuente de datos sin cambios (187676, sin `/api/development`).

- `/desarrollos`: sin contador de proyectos; grilla reutiliza `.twoclics-grid` (mismo sistema que
  Comprar/Alquilar/propiedades — una card no se estira aunque sea la única); `CuratedDevelopmentCard`
  reducida a huella de card de catálogo.
- `/desarrollos/faena`: hero full-width de 60vh retirado, reemplazado por `.project-intro`
  (introducción compacta cream, texto + imagen real en dos columnas). Contenido editorial
  reutiliza `.twoclics-ficha-section` (mismo lenguaje "sin caja" ya aprobado en
  `PropertyDetailView.tsx`). "Datos del proyecto" eliminado. Amenities con umbral (2+ = sección,
  1 = mención discreta, 0 = nada), nunca inferidos de la descripción libre. Mapa eliminado por
  completo de esta landing únicamente — fichas canónicas y `/propiedades/[id]` sin cambios.
- Sin cambios: `PropertyCard`, `PropertyDetailView`, saneamiento de `[FABIANAGA-*]`, integración
  2Clics, mapas de fichas.

### Duodécima pasada (2026-08) — /desarrollos y /desarrollos/faena, landing 100% editorial

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Reescritura
sobre la undécima pasada: la introducción-en-caja + galería/descripción tipo ficha seguía sin
sentirse una presentación de desarrollo. Fuente de datos sin cambios (187676, sin
`/api/development`). Decisión rectora: **las landings de desarrollos son una capa editorial
construida sobre datos reales de propiedades curadas de 2Clics — no replican la UX de una ficha
inmobiliaria ni inventan estructura inmobiliaria que la fuente no provea.**

- **Nombre público real**: se dejó de usar `curation.name` ("Proyecto Faena", nombre editorial
  interno) para mostrar el desarrollo. El nombre público ahora es `sourceProperty.title`, resuelto
  desde 2Clics — para 187676 es **"Faena Residences Miami"**. `curation.name` se mantiene en
  `lib/site-curation.ts` solo como referencia administrativa interna (comentario agregado),
  ningún componente lo vuelve a usar para texto visible.
- `CuratedDevelopmentCard`: eyebrow "Proyecto"→"Desarrollo", título real (no "Proyecto Faena"),
  CTA "Conocer desarrollo →".
- `/desarrollos/faena`: reescrita como landing editorial (`lib/desarrollos.ts`:
  `selectEditorialImages`/`editorialDescriptionParagraphs`) — imagen protagonista + apertura,
  luego bloques alternados imagen/texto con fotos reales únicas (sin repetir portada) y
  fragmentos reales de la descripción (sin resumir/inventar). Retirados por completo:
  `PropertyGallery` (sin thumbnails/contador "1/N"/flechas), el CTA "Ver propiedades disponibles",
  y el mapa (ya venía retirado). "Propiedades disponibles" ahora es condicional
  (`units.length > 1`) — con Faena representado hoy por un único registro real (187676), la
  sección no se muestra (evita redundancia con su propio registro maestro); la arquitectura queda
  lista para cuando existan unidades reales independientes. Amenities: mismo umbral que la
  undécima pasada (2+ = sección, 1 = mención discreta, 0 = nada).
- **"Consultar desarrollo"** reutiliza sin modificar `PropertyInquiryPanel`
  (`components/properties/PropertyInquiryPanel.tsx`) — el mismo mecanismo ya aprobado de
  `PropertyDetailView.tsx` (`POST /api/lead/message`, `property_app_id`). Nunca `/contacto`. La
  consulta queda asociada a `sourceProperty.propertyId` (187676 para Faena). Sin integración
  2Clics nueva.
- **Exclusión deliberada y documentada** (no silenciosa): la descripción real de 187676 también
  trae precios por tipología ("... desde U$D ...") y un cronograma de señas con fechas de obra
  estimadas ("DEPOSITOS Y FECHAS", "at top-off/closing"). Es contenido real, pero las reglas de
  esta landing prohíben mostrar precio/plazos/estado de obra como dato público confirmado —
  `editorialDescriptionParagraphs()` excluye esos bloques puntuales por patrón de contenido; el
  resto del texto real se conserva intacto. Detalle en `docs/ai/PROPERTY_UX_DECISIONS.md`.
- Sin cambios: `PropertyCard`, `PropertyDetailView`, `PropertyInquiryPanel` (reutilizado, no
  modificado), saneamiento de `[FABIANAGA-*]`, integración 2Clics, `/comprar`/`/alquilar`.

### Decimocuarta pasada (2026-08) — /invertir y /invertir/proyecto-especial-miami, capa de curaduría propia

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Reescritura
completa sobre la tercera pasada: la landing de la oportunidad reutilizaba el layout de ficha
inmobiliaria y mostraba datos del registro técnico placeholder (206734: "Casa en venta en Miami",
tipo "Casa", 1000 m2, U$D 100.000) como si fueran las características de la inversión.

- **Hallazgo clave**: 206734 es un registro placeholder — su `description` real incluye promesas
  de rentabilidad ("retorno estimado... superior al 15% anual") no aptas para copy público. A
  diferencia de Faena, acá NINGÚN texto público puede extraerse de `sourceProperty.description`.
  Toda la landing es curaduría explícita nueva (`lib/investments.ts`), con contenido real provisto
  directamente por García esta pasada (specs de los dos proyectos, developer, riesgos, etc.).
- **Fuga de datos corregida**: pasar el `PublicProperty` completo como prop a un componente
  serializa igual sus campos (título/descripción/dirección) en el payload RSC que llega al
  navegador, aunque el JSX nunca los pinte — visible en "ver código fuente". Corregido: el
  componente recibe un `source` mínimo (`propertyId`/`region`/`images`), nunca el objeto completo.
- **Auditoría de 18 imágenes reales**: descartadas por copy promocional incrustado en el archivo
  ("100% RENTA PASIVA", "INVERSIÓN MÍNIMA USD 100.000"), por pertenecer a otra dirección impresa en
  la propia imagen ("1000 89 St, Surfside"; "5345 SW 84th St"; "445 N Shore, Miami Beach"), o por no
  poder atribuirse con certeza a ninguna de las dos casas (edificio multi-unidad, no coincide con
  ninguna casa unifamiliar descripta). Dos imágenes con la dirección impresa (idx 16/17) permitieron
  confirmar qué estilo arquitectónico corresponde a cada domicilio — resultado contrario al texto
  tipeado inicialmente (se corrigió consultando a la usuaria antes de publicar).
- **Condiciones vigentes**: estructura de datos dinámica (`InvestmentCurrentConditions` en
  `lib/investments.ts`) separada del relato editorial fijo — hoy sin confirmación pública fechada,
  se muestra "Consultar" en vez de montos/plazos hardcodeados.
- **CTA único**: `PropertyInquiryPanel` reutilizado sin modificar, `property_app_id` = 206734, solo
  en el cierre (sin CTA en la apertura). Nunca WhatsApp directo, nunca `/contacto`.
- **`FeaturedSpotlight.tsx`**: sin consumidores tras esta pasada (ni Desarrollos ni Invertir lo
  usan ya) — se dejó sin borrar, documentado como componente compartido momentáneamente huérfano.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
  no modificado), integración 2Clics, `/desarrollos`/`/desarrollos/faena`.

### Decimoquinta pasada (2026-08) — /invertir y /invertir/proyecto-especial-miami, refuerzo educativo

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Refinamiento
sobre la decimocuarta pasada (dirección visual aprobada, se refuerza educación y se compacta).

- **`/invertir` (índice)**: nueva intro educativa ("Invertir en real estate no significa siempre
  comprar una propiedad"), "Formas de participar" pasó de una frase por alternativa a 2-3 puntos
  concretos por alternativa, nueva tabla comparativa editorial ("Qué cambia entre una alternativa y
  otra" — 6 factores × 3 alternativas), "Cómo analiza García" ampliado de 4 a 6 factores. La card de
  la oportunidad se redujo de escala: dejó de reutilizar `.project-open` completo (la misma huella
  que la apertura de una landing propia) y pasó a `.invest-opportunity-*`, una pieza contenida
  (max-width 860px, imagen 4/3, menos padding) — clases nuevas, no acopladas a Faena.
- **Oportunidad Coconut Grove**: "Los dos proyectos" se movió justo después de "Qué es esta
  oportunidad" (antes de Coconut Grove/microubicación) para dejar inequívoco lo antes posible que
  son dos residencias distintas. Cada bloque se etiqueta ahora "Residencia 1 de 2"/"Residencia 2 de
  2" además de su propia dirección/imagen/lista de datos — nunca mezclados. Apertura y secciones de
  texto pasaron a variantes compactas (`--compact`/`--tight`, exclusivas de esta vista) — Faena
  sigue usando las clases base sin modificador, sin cambios de tamaño.
- **Estilo arquitectónico retirado**: la única fuente disponible para atribuir "Caribbean
  Colonial"/"contemporáneo" a cada dirección son dos imágenes de 2Clics con el domicilio impreso
  (re-auditadas esta pasada, mismo resultado que la anterior); la usuaria señaló que esto contradice
  una ficha estratégica externa que esta sesión no puede auditar. Regla aplicada: ante atribución en
  disputa sin fuente inequívoca accesible, se omite — nunca se resuelve por memoria/inferencia.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
  no modificado), `/desarrollos`, `/desarrollos/faena`, integración base 2Clics.

### Decimosexta pasada (2026-08) — clasificación editorial "desarrollo" ampliada a 4 property_app_id

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Decisión de
negocio confirmada (captura de CRM): además de Faena (187676), se clasificaron como "desarrollo"
**Icon Beach (187677)**, **Flow House Miami Worldcenter (187681)** y **One Hollywood (187682)** —
auditados contra la 2Clics External API real antes de clasificar. Un quinto id de la captura
(FAB-187694) **no se clasificó**: la External API devuelve "Not found" en AR y US — confirmado en
vivo, no es un problema de nuestro código. Se encontró un candidato real (187684, "¡Bienvenido a
PALMA Miami Beach!") que coincide con el título de CRM del quinto desarrollo, pero queda **sin
clasificar** hasta confirmación explícita — no se resuelve por inferencia.

- **Clasificación por property_app_id, nunca por palabras del título** — `CURATED_PROPERTIES` y
  `DEVELOPMENTS` (`lib/site-curation.ts`) siguen siendo la única fuente de esta clasificación. No
  se usa `/api/development` ni el módulo "Emprendimientos" de 2Clics — los 4 desarrollos siguen
  siendo registros PROPERTY normales.
- **Los 3 desarrollos nuevos quedan excluidos de `/comprar`** vía el mismo mecanismo ya existente
  (`excludePropertyIds` en `getPropertyCatalog`, resuelto en la capa de datos antes de renderizar,
  afecta también `propertyTotalCount`) — cero cambios de código adicionales en `/comprar`.
- **Nombre público**: a diferencia de Faena (donde `sourceProperty.title` ya era el nombre público
  correcto), el título real de 2Clics de estos 3 es un aviso genérico o, en el caso de Flow House,
  trae una promesa de rentabilidad incrustada ("...Renta Garantizada 6 %") — nunca publicable. Se
  agregó `DevelopmentCuration.publicName` (nombre confirmado por curaduría, verificado contra el
  saludo real de la propia descripción de 2Clics — "¡Bienvenido a ICON BEACH", etc. — nunca
  inventado), con prioridad sobre el título crudo.
- **Fuga de datos en el payload RSC — encontrada y corregida al generalizar**: el mismo patrón de
  fuga ya corregido en Invertir (decimocuarta pasada) apareció también en Desarrollos al
  generalizar a datos más crudos — confirmado en vivo que pasar el título/descripción reales como
  prop (aunque el JSX nunca los pinte) los dejaba en el HTML servido. Corregido en
  `CuratedDevelopmentCard`/`CuratedDevelopmentDetailView` (props mínimas) y en
  `app/desarrollos/[id]/page.tsx` (título y descripción se resuelven a su versión segura ANTES de
  convertirse en prop, nunca dentro del componente) — Faena no cambia de comportamiento porque su
  curaduría editorial completa sigue usando el texto íntegro, ya aprobado.
- Los 3 desarrollos nuevos usan el mismo fallback ya existente de `CuratedDevelopmentDetailView`
  (apertura con imagen/nombre/ubicación/primer fragmento real + CTA) — sin curaduría editorial
  propia todavía (`lib/desarrollos.ts` no tiene entradas para ellos), sin inventar secciones.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
  no modificado), ficha/contenido editorial de Faena, `/invertir`, integración base 2Clics.

### Decimoséptima pasada (2026-09) — ficha editorial completa de Icon Beach (187677)

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Icon Beach
pasó del fallback genérico (apertura + CTA) a una ficha editorial propia, con la misma calidad y
jerarquía que Faena pero sin copiar mecánicamente sus secciones — arquitectura propia derivada
únicamente de información real verificada para Icon Beach.

- **Auditoría previa obligatoria antes de tocar código**: título/descripción/ubicación/amenities/
  metadata/17 imágenes de 187677 auditados en vivo contra la 2Clics External API. Metodología P/S/D/C
  (permanente/semipermanente/dinámico/crítico) aplicada a cada dato del CRM — nunca se asumió que
  info de CRM (350 unidades, precios, cronograma de depósitos, agente) siguiera vigente sin fuente
  verificable independiente.
- **Nueva estrategia de contenido "curado original"** (`curatedText`/`curatedList`, nuevas variantes
  de `SourceTextSegment` en `lib/desarrollos.ts`): a diferencia de Faena (cuyo texto real de 2Clics
  se extrae en runtime con `firstParagraphLead`/`firstParagraphRest`/`markerBlockItems`), la
  descripción cruda de Icon Beach mezcla precios, cronograma de depósitos y datos de agente — no es
  copy usable. Se optó por prosa/listas editoriales originales, basadas en hechos verificados, nunca
  copiadas del CRM ni inventadas. Ambas estrategias conviven en el mismo pipeline de render
  (`sections`/`renderSection`), sin páginas hardcodeadas por fuera de la arquitectura de curaduría.
- **Verificación externa (WebSearch/WebFetch)**: developer Related Group (en asociación con BH
  Group), arquitectura CFE Architects, interiorismo Meyer Davis, paisajismo Witkin Hults + Partners,
  ubicación real Hollywood Beach (entre Miami y Fort Lauderdale) — corroborados por ≥2 fuentes
  independientes cada uno salvo arquitecto/paisajista (única fuente, Commercial Observer, medio
  especializado). Contradicción encontrada y resuelta por peso de evidencia: una fuente
  (iconbeachresidences.com vía WebFetch) atribuyó el desarrollo a "Fortune and Dezer Development",
  contradicho por la página oficial de Related Group + 4 notas de prensa independientes — se usó
  Related Group. Dirección exacta también en disputa entre 3 fuentes (3660/3724/3824 S. Ocean
  Drive) — se omitió cualquier número de calle específico, se usó solo la ubicación general
  corroborada.
- **Amenities — nuevo mecanismo opt-in por desarrollo** (`DevelopmentEditorialCuration.amenities`
  en `lib/desarrollos.ts`, sección nueva en `CuratedDevelopmentDetailView.tsx`): solo se activa
  explícitamente por desarrollo y solo se muestra con 2+ amenities reales **estructurados** de
  2Clics (nunca inferidos de texto libre). Faena no lo activa — sin cambios de comportamiento
  (decisión ya aprobada de no mostrar amenities con un solo dato real se mantiene intacta).
- **Auditoría de imágenes** (17 imágenes, dimensiones nativas parseadas con parsers binarios
  propios): descartadas por contenido no publicable (idx15, eslogan comercial incrustado en los
  píxeles) o por ser una página de folleto completa (idx16, usada solo como fuente de datos para el
  texto de "Ubicación", nunca mostrada como imagen). Descartados duplicados/casi-duplicados
  (idx10≈idx3, idx9≈idx5). 6 imágenes finales únicas (apertura, momento visual, ubicación, edificio,
  residencias, amenities), cada una verificada por debajo de su resolución nativa en el `sizes` usado.
- **Nombre público**: `publicName: 'Icon Beach'` (ya existente desde la decimosexta pasada en
  `lib/site-curation.ts`, sin cambios) — nunca el título crudo de 2Clics ("Oportunidad Unica En
  Hollywood...").
- **Hallazgo de transparencia, no una fuga real**: durante el control de seguridad de esta pasada
  apareció `meta_data` cruda de 2Clics en el HTML del índice `/desarrollos` — pero solo en `next dev`.
  Confirmado con un build+start de producción real que el índice en producción está limpio (0
  ocurrencias). Es un artefacto exclusivo del modo desarrollo de Next.js, no una vulnerabilidad de
  producción ni causado por código de esta pasada — no se "arregló" nada porque no hay nada que
  arreglar en lo que se despliega.
- Tests nuevos en `tests/2clics/site-curation.test.ts` (14 casos): property_app_id 187677, nombre
  público, sin título/precios/promesas del CRM, CTA único con 187677, amenities opt-in, sin
  repetición de imágenes, sin `sizes="100vw"` forzado, degradación con gracia sin curaduría,
  regresión de Faena y de la exclusión en Comprar. Suite completa 358/358, typecheck y lint limpios,
  build de producción sin errores.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado, no
  modificado), ficha de Faena, `/invertir`, `/comprar`, `/alquilar`, Flow House, One Hollywood (no
  avanzados esta pasada, por pedido explícito).

### Decimoctava pasada (2026-09) — sistema editorial definitivo de Desarrollos (4 fichas)

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Auditoría
transversal de Faena + Icon Beach y curaduría editorial completa nueva para Flow House Miami
Worldcenter (187681) y One Hollywood (187682) — los 4 desarrollos curados comparten ahora la misma
infraestructura declarativa y el mismo lenguaje visual, cada uno con sus propias secciones según el
material real disponible (Flow House, por ejemplo, no tiene "El edificio": no existe ninguna foto
de exterior de torre limpia en su set de 21 imágenes — las únicas están incrustadas en un brochure
con la promesa de renta garantizada impresa en los píxeles).

- **Fuga real de RSC corregida en Faena**: `resolveSafeDescription` pasaba la descripción cruda
  COMPLETA (tabla de precios por tipología + cronograma de depósitos) como prop cuando la
  curaduría necesitaba extraer texto real — nadie lo renderizaba, pero viajaba igual en el payload
  servido al navegador. Corregido: ahora solo se incluyen los párrafos que la curaduría
  efectivamente usa (intro + el párrafo con los markers "El edificio"/"Residencias").
- **Bug de heading huérfano corregido**: un bloque `image-left`/`image-right` con un párrafo
  curado (`curatedText`) nunca pintaba ese párrafo — el componente solo sabía renderizar listas en
  ese layout. Afectaba a "Hollywood Beach y la ubicación" de Icon Beach (heading + imagen, sin
  texto debajo). Corregido en `CuratedDevelopmentDetailView.tsx`.
- **"Project Snapshot" nuevo** (FASE 3): resumen editorial discreto (developer, ubicación,
  unidades, pisos, tipologías, arquitectura) después de la apertura, con línea fina y aire — nunca
  una card inmobiliaria. Opt-in por sección (`layout: 'snapshot'`), solo campos confirmados.
- **Sistema de aspect-ratio de imágenes suavizado**: defaults `5/3`/`3/4` (demasiado extremos, con
  contenido corto dejaban franjas vacías notorias) pasan a `3/2`/`4/5`; Faena mantiene sus ratios
  reales originales vía override explícito (`imageAspect`) para no alterar el crop ya aprobado.
- **Listas cortas (≤3 ítems) usan una variante compacta** de una columna — evita la celda huérfana
  de una grilla de 2 columnas con un ítem impar (ej. Icon Beach, 2 amenities después del filtro).
- **"Permite mascotas" retirado de toda sección de amenities**: auditoría confirmó que es idéntico
  en los 4 desarrollos (4 developers distintos) — no es un dato diferenciador, lee como casilla de
  política de CRM. Filtro sistémico (`filterEditorialAmenities`), no un caso especial de Icon Beach.
- **Icon Beach — imagen de "El edificio" reemplazada**: la anterior (índice 14) era una composición
  gráfica tipo brochure (render recortado dentro de un marco sobre una textura de olas a pantalla
  completa) — reemplazada por el índice 2, un exterior real limpio.
- **Flow House verificado**: developer Flow (Adam Neumann) + Merrimac Ventures (Hoodline, nota de
  prensa 2026-04, y resident.com). El título/descripción reales de 2Clics traen la promesa "Renta
  Garantizada... 6% de retorno neto anual" — confirmado que no aparece en ninguna capa pública
  (HTML, metadata, payload, objeto de curaduría).
- **One Hollywood verificado**: developer Star Developers Group (onehollywoodresidences.us/.com +
  nota de South Florida Business & Wealth). Arquitectura BC Architects con confianza media (ambas
  fuentes asociadas al propio desarrollo). Interiorismo NO publicado: dos fuentes dan nombres
  contradictorios ("Domus Aurea Interiors" vs. "Adriana Hoyos Design Studio") sin fuente oficial
  que dirima. Dirección exacta también en conflicto (1817 Taylor St. vs. 1939 Hollywood Blvd.) — se
  omite cualquier número de calle, mismo criterio ya usado para Icon Beach.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
  no modificado), `/invertir`, `/comprar`, `/alquilar` (salvo la exclusión de datos ya vigente).

### Vigésima pasada (2026-09) — Developer fuera de lo público, rango de precio real, "Interiores"

Detalle completo en `docs/ai/WEB_GARCIA_V2.md` y `docs/ai/PROPERTY_UX_DECISIONS.md`. Pasada
transversal sobre las 4 fichas curadas (Faena, Icon Beach, Flow House, One Hollywood).

- **"Developer" retirado del snapshot público de las 4 fichas** — decisión editorial explícita,
  no un problema de fuente (el dato seguía siendo correcto y verificado). Arquitectura/
  interiorismo/paisajismo se mantienen: son créditos de diseño, no datos institucionales sobre
  quién financia el proyecto. Confirmado en producción que el nombre del developer ya no viaja ni
  siquiera en el payload RSC (se eliminó del objeto de curaduría, no solo del render).
- **"Rango de precio" agregado al snapshot de las 4**, con el precio estructurado REAL de 2Clics
  (`price`/`currency`/`hidePrice`), calculado en runtime — nunca hardcodeado. Auditoría confirmó
  que 2Clics no expone un campo de rango (min/max) para un property_app_id, solo un único `price`
  — que en los 4 casos coincide con la cifra "desde" más baja de la propia descripción real. Se
  representa como "Desde {moneda} {precio}", nunca como un rango con máximo inventado. Si
  `hidePrice` es true o no hay precio válido, el campo se omite (nunca "Consultar precio").
- **Nueva sección "Interiores"/"Interiores y residencias"** (`interiors`, mismo patrón opt-in que
  `amenities`, siempre el último bloque antes del CTA): Faena (2 imágenes, título completo — ambas
  interiores reales de una unidad), Icon Beach (1 imagen, título "Interiores" — la única interior
  de unidad sin usar en el resto de la ficha), Flow House (3 imágenes, título "Interiores" — sin
  ninguna foto de residencia individual en todo su set, son espacios compartidos reales),
  One Hollywood (1 imagen, título "Interiores"). Ninguna imagen se repite entre secciones cuando
  había alternativa real disponible.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
  no modificado), `/invertir`, `/comprar`, `/alquilar`, Home.

## Pendiente de decisión (no confundir con "roto")

- **Formulario de contacto general** (`lib/crm/leads.ts`, host `api.2clics.com.ar` legacy):
  ACTUAL Y EN USO, pendiente de revisión arquitectónica. Ver `LEGACY.md`. No tocar sin pedido.
- **Webhook `/api/2clics/webhook`**: legacy, todavía cableado, estado real en producción sin
  verificar. Ver `LEGACY.md`.
- **Filtros server-side**: precio/moneda (Fase 1), dormitorios/ambientes/apto crédito (Fase 2) y
  tipo de propiedad dinámico según inventario público ya están implementados y aprobados en
  `/propiedades` — ver `PROPERTY_UX_DECISIONS.md`. Solo **amenities** sigue soportado por la API
  pero no expuesto en la UI. No implementar el filtro de amenities sin autorización.
- **Mapa interactivo del catálogo** (`MAPA | LISTADO`): no implementado, requiere una solución
  distinta al embed simple de ficha (Google Maps JS API / Mapbox / Leaflet).
- **`tour_url`**: 0/21 propiedades auditadas tienen tour usable — no implementar todavía.

## No confirmado / requiere verificación en otra etapa

- Si 2Clics todavía llama activamente al webhook legacy en producción.
- Si conviene migrar el formulario de contacto general al mismo flujo que la consulta de propiedad.

## Snapshot de inventario auditado (2026-08-21 — no es dato en vivo)

21 propiedades (AR 11 / US 10), 0 desarrollos. Detalle completo de campos y cobertura en
`2CLICS_EXTERNAL_API.md`. Para el estado real y actualizado, consultar la API, no este documento.
