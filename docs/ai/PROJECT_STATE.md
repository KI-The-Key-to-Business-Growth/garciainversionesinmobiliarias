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
