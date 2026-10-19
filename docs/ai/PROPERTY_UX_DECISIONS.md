# Property UX — decisiones aprobadas

Verificado contra código real (`components/properties/*`) el 2026-08-21. Estos bloques están
**aprobados y congelados**: no se modifican sin pedido explícito, aunque parezcan mejorables.

## Home (`app/page.tsx`)

Orden: Hero → Oportunidades seleccionadas → Servicios → Nosotros → Mercados → Por qué García →
Contacto → Newsletter → Footer.

- Hero: título "Real estate con visión estratégica.", CTA "Ver propiedades" → `/propiedades`.
- Oportunidades seleccionadas: **reemplazado en pre-launch V2 (2026-10)** — ahora es una curaduría
  manual inmediatamente después del Hero (`lib/home-selection.ts` +
  `components/home/SelectedOpportunities.tsx`), no `webListing = DESTACADO`. Ver `PROJECT_STATE.md`.
  (Histórico: antes consumía `FeaturedProperties.tsx` → `getFeaturedPublicProperties`.)

## Catálogo `/propiedades`

- Hero centrado, H1 "Propiedades seleccionadas" en dorado de marca, sin eyebrow "PROPIEDADES".
- Orden: `DESTACADO` antes que `SIMPLE` — `PUBLIC_CATALOG_WEB_LISTINGS = ['DESTACADO', 'SIMPLE']`
  en `lib/2clics/listings.ts`, con buckets/paginación que preservan esa prioridad
  (`propertyListingPrioritySegments`).
- Filtros de UI actuales: ubicación, operación, tipo, **precio**, **dormitorios / ambientes / apto
  crédito** (`PropertyFilters.tsx`). Sigue siendo un `<form>` GET server-driven, sin JS ni Client
  Component — cada envío es una navegación completa con query params
  (`ubicacion`/`operacion`/`tipo`/`moneda`/`precioMin`/`precioMax`/`dormitorios`/`ambientes`/`aptoCredito`/`offset`/`limit`).
- Filtros server-side confirmados en la API pero **no expuestos aún en la UI**: amenities. No
  agregarlos sin autorización.

### Filtros — layout compacto mobile (Fase 0, 2026-08-21)

Mismo `<form>`, mismos inputs, mismo contrato de `searchParams` en desktop y mobile — solo cambia
la ubicación en el grid vía CSS (`.twoclics-filter-group--location`, media query ≤680px en
`app/globals.css`). En ≤680px: Ubicación ocupa el ancho completo, Operación y Tipo comparten una
fila de 2 columnas, "Aplicar filtros" ocupa el ancho completo. Bloque de filtros medido en vivo a
390×844 (sin Precio, Fase 0): **~204px sin filtros activos / ~242px con filtro activo** (antes:
~410px). Sin drawer, sin modal, sin bottom sheet, sin Client Component — sigue funcionando sin
JavaScript.

### Precio — filtro real, siempre visible, un solo submit (Fase 1 2026-08-21; revisado 2026-08-24)

**Arquitectura (sin cambios en lo esencial):** Precio nunca permite un rango ambiguo mezclando
Venta/Alquiler o U$D/AR$ — `resolvePriceFilter`/`priceApiFilters` (`lib/2clics/listings.ts`) siguen
decidiendo qué es seguro mandar a 2Clics, todo server-driven, sin JS, cada transición un submit más
del mismo `<form>` GET.

**Revisado 2026-08-24 (pasada visual/UX):** antes, Precio quedaba oculto detrás de un texto
("Elegí una operación") hasta un primer submit que solo fijaba Operación — el usuario necesitaba
un **segundo** submit recién para completar el rango. Ahora **Moneda/Desde/Hasta están siempre
visibles**, incluso con Operación="Todas", así que Operación+Precio se completan y aplican juntos
en un **único submit**. Para esto, `fetchPriceFacet` ya no se salta cuando `operation==='all'`: se
pide siempre, y como `baseApiFilters` omite `operation_type` en ese caso, la consulta devuelve la
faceta **global** (unión de monedas de todas las operaciones, respetando ubicación/tipo/
dormitorios/ambientes activos) — así el selector de Moneda tiene opciones reales desde el primer
render. Su rango numérico global (que mezclaría escalas de Venta y Alquiler) deliberadamente
**no** se usa como placeholder en ese estado.

`ResolvedPriceFilter` pasó de 4 a 5 estados, todos con `rawMin`/`rawMax` (y `currencies` cuando
aplica) para que la UI nunca pierda lo que el usuario ya escribió, sin importar el estado:

1. **`no-operation` (Operación="Todas"):** Moneda/Desde/Hasta se muestran igual (Moneda con las
   opciones de la faceta global, Desde/Hasta con placeholder neutral "Desde"/"Hasta" — nunca un
   número inventado). Si no hay rango cargado, sin mensaje (estado normal, ver punto 15 del pedido
   original). Si el usuario ya escribió un rango sin elegir operación, aparece: **"Elegí Venta o
   Alquiler para filtrar por precio."** — y no se manda ningún filtro de precio a 2Clics.
2. **`empty-facet` (hay Operación, pero la combinación actual no tiene ninguna propiedad con
   precio):** Moneda/Desde/Hasta se muestran igual, con la moneda/rango que el usuario ya haya
   escrito (`rawCurrency`/`rawMin`/`rawMax`, revisado 2026-08-26 — ver subsección propia más
   abajo). Solo si NO hay ningún valor que preservar aparece una nota neutral: "No hay datos de
   precio para esta combinación de filtros." (no es un error, es informativa — `role="alert"` no
   se usa en ese caso).
3. **`needs-currency` (2+ monedas en la faceta de la operación, ninguna elegida):** Desde/Hasta se
   muestran igual (antes no se renderizaban en este estado). Sin rango cargado, sin mensaje. Con
   rango cargado y sin moneda: **"Elegí una moneda para filtrar alquileres por precio."** — sin
   mandar filtro de precio.
4. **`invalid-range` (mínimo > máximo):** sin cambios — "El precio mínimo no puede ser mayor que
   el máximo.", valores preservados tal cual, sin filtro de precio a 2Clics.
5. **`ready` (moneda resuelta, rango válido o vacío):** sin cambios en la semántica de completar
   min/max con la faceta real cuando el usuario solo llenó un extremo — el input sigue mostrando
   solo lo que escribió, nunca el valor completado.

**Casos de un solo submit verificados** (`Operación + Precio` en el mismo GET, sin round-trip
intermedio): Venta + rango → moneda U$D inferida automáticamente + rango aplicado; Alquiler +
moneda (U$D o AR$) + rango → aplicado directo. Ambos ya funcionaban a nivel de
`resolvePriceFilter`/`fetchPriceFacet` (se resuelven dentro de la misma request) — lo que faltaba
era que la UI mostrara los inputs a tiempo para que el usuario los completara antes del primer
submit.

**Moneda — inferencia automática (sin cambios):** si la operación activa tiene una sola moneda
real (hoy: `venta` → solo U$D), se infiere sola. Si tiene 2+ (hoy: `alquiler` → U$D/AR$), hay que
elegirla explícitamente. Una moneda que ya no es válida para la operación activa se descarta de
forma segura (ver comportamiento ya documentado en Fase 1). El `<select>` de Moneda ahora se
renderiza siempre (antes solo si `priceFacet.currencies.length > 1`), con **"Automática"** como
opción vacía en vez de "Elegí moneda" — refleja mejor que dejarla en blanco no es un error, es
dejar que el server infiera/valide según corresponda.

**Faceta de precio (`fetchPriceFacet`/`priceFacetRequest`):** mismo patrón que la faceta de
Ubicación (Fase 0) — se calcula server-side, respeta Operación/Ubicación/Tipo/Dormitorios/
Ambientes activos, pero ignora el propio rango de precio. Nunca se manda la lista cruda de
propiedades al navegador — solo `currencies: string[]` y `rangeByCurrency: {min, max}` derivados.

**Placeholders:** los inputs Desde/Hasta usan el mínimo/máximo real de la faceta como
`placeholder` cuando hay una moneda resuelta (`ready`/`invalid-range`); sin moneda resuelta
(`no-operation`/`needs-currency`), placeholder neutral "Desde"/"Hasta" — nunca un número inventado
ni una escala mezclada.

**min_price/max_price como par obligatorio:** sin cambios — `priceApiFilters()` nunca arma un
request con uno solo; o van los dos (+ `currency`) o no va ninguno. Detalle completo en
`docs/ai/2CLICS_EXTERNAL_API.md`.

**Sin importar el estado de Precio:** DESTACADO sigue apareciendo antes que SIMPLE, la paginación
("Ver más") preserva `moneda`/`precioMin`/`precioMax` igual que siempre, "Limpiar filtros" limpia
Precio junto con todo lo demás — nada de esto cambió.

**Desktop (revisado 2026-08-24):** Precio ahora se lee como un filtro real, no un texto suelto —
mismo tratamiento visual que Ubicación/Operación/Tipo, con su propio bloque `Moneda | Desde |
Hasta` en una sola fila. Columna de Precio ensanchada en `.twoclics-filters`
(`minmax(280px, 1.7fr)`, antes `minmax(220px, 1.3fr)`) para darle aire a las 3 sub-columnas.
`.twoclics-filter-price-controls` pasó a ser siempre un grid de 3 columnas (Moneda angosta +
Desde + Hasta iguales) — la técnica `display: contents` sobre `.twoclics-filter-price-range` que
antes solo se usaba en mobile (Fase 1.1) ahora es el layout por defecto en desktop también.

**Mobile:** misma composición de 3 columnas que desktop (ya no hay una variante `--inline`
separada — es el único layout). Columna de Moneda ajustada a `minmax(86px, 0.9fr)` para que
"Automática" no se recorte. Altura medida en vivo a 390×844: sin operación (con Precio ahora
visible) 328px, Venta+Precio aplicado 366px, Alquiler+moneda+Precio aplicado 366px, validación
"sin operación" 392px — bloque de Precio siempre presente, nunca un texto suelto de una línea.

**No confirmado — periodicidad de alquiler:** "por mes" NO es un dato de 2Clics (no existe el
campo en `meta_data`), así que no se publica en ningún lugar de la ficha de Precio.

### Bug real corregido — el estado del usuario nunca debe desaparecer (2026-08-26)

**Reportado por la usuaria:** Ubicación=Estados Unidos + Operación=Alquiler + Moneda=U$D +
Hasta=300000 → el catálogo quedó en 0 resultados y el bloque Precio entero se reemplazó por "Sin
datos de precio", perdiendo la moneda y el rango ya escritos.

**Investigación (read-only, antes de tocar código):** confirmado contra la API real que Estados
Unidos hoy **no tiene ninguna propiedad en Alquiler** — las 10 propiedades de ese mercado son
VENTA (100.000–1.300.000 U$D). Por lo tanto **0 resultados era legítimo**, no un bug de datos. El
bug real estaba en cómo la UI reaccionaba a ese 0: al llegar a `fetchPriceFacet` con
`state:31 + operation_type: ALQUILER_PERMANENTE`, la API devuelve una faceta sin ninguna moneda
(`currencies: []`), y `resolvePriceFilter` caía en `status: 'empty-facet'`, que **descartaba
moneda/rango del usuario y reemplazaba todo el bloque Precio por un texto**.

**Corregido:** `empty-facet` ahora conserva `rawCurrency`/`rawMin`/`rawMax` igual que el resto de
los estados no resueltos (`no-operation`/`needs-currency`) — `PriceFilterGroup` ya no tiene una
rama especial que reemplaza el fieldset entero; Moneda/Desde/Hasta se renderizan siempre. El
mensaje "Sin datos de precio" se reemplazó por "No hay datos de precio para esta combinación de
filtros." y solo aparece cuando NO hay ningún valor que preservar (nunca compite con un filtro
activo). Principio aplicado: **searchParams/raw filters son la fuente de la verdad visual — la
faceta solo informa monedas válidas/mínimos/máximos reales/placeholders, nunca borra un filtro
activo.**

**Segundo bug real encontrado durante la misma investigación (no reportado, pero mismo patrón):**
el `<select>` de Ubicación también podía mostrar "Todas" en silencio aunque la URL tuviera
`ubicacion=state:31` — porque `locationFacetRequest` (la consulta que arma
`availableLocations`, el listado de `<option>` del `<select>`) respetaba Operación/Tipo/
Dormitorios/Ambientes activos, y si la ubicación seleccionada no tenía ninguna propiedad
matcheando el resto de los filtros (exactamente el caso Estados Unidos+Alquiler), esa ubicación
desaparecía de la lista de opciones — un `<select>` solo puede mostrar como seleccionado un
`value` que exista entre sus `<option>`, así que el navegador caía al primer `<option>` ("Todas")
aunque el filtro real (URL, lo que se manda a 2Clics) siguiera siendo el correcto. **Corregido:**
`locationFacetRequest()` ya no recibe ni aplica ningún filtro — siempre devuelve el universo
completo de ubicaciones reales, igual que Operación/Tipo (cuyas listas de opciones tampoco se
recortan según el resto de los filtros activos). Como segunda barrera defensiva, el `<select>` de
Ubicación (y el de Moneda en Precio) ahora agregan una `<option>` de respaldo con el valor técnico
activo si por algún motivo no aparece en la lista derivada (ej. una URL manual con un id
inexistente) — nunca vuelven a caer en "Todas"/"Automática" en silencio.

**Verificado en vivo (Playwright + API real) contra el caso exacto reportado:** después del fix,
`/propiedades?ubicacion=state:31&operacion=alquiler&moneda=U%24D&precioMax=300000` muestra
Ubicación="Estados Unidos", Operación="Alquiler", Moneda="U$D", Hasta="300000" — todos correctos y
editables — con el catálogo mostrando el estado de 0 resultados (`ListingState`) debajo, sin
inventar un número ni ocultar los filtros activos.

### Tercer bug real — Tipo de propiedad nunca filtraba correctamente (2026-08-26)

Encontrado durante la QA integral del buscador (no reportado por la usuaria): **cualquier
selección de Tipo (Casa/Departamento/Oficina/Terreno·Lote) mostraba 0 resultados en vivo**, sin
ningún error visible — un bug de fondo distinto al de Precio/Ubicación. Confirmado contra la API
real (detalle completo en `docs/ai/2CLICS_EXTERNAL_API.md`): `property_type` solo funciona con el
`appId` (string, ej. `"5791"` para Casa) — el `typeId` numérico que ya se usaba en toda la app
(`?tipo=2`, `<option value={typeId}>`) hace que la API responda `fail` en silencio. **Corregido**
traduciendo `typeId → appId` recién dentro de `getPropertyCatalog`, justo antes de la llamada real
a 2Clics (`resolvePropertyTypeAppId`/`withResolvedPropertyType`, `lib/2clics/listings.ts`) — el
contrato público (`?tipo=`, `PropertyListingFilters.propertyTypeId`, `catalogPropertyRequest()`)
no cambió, ninguna URL existente se rompe. Verificado en vivo: Tipo=Casa → 3 resultados,
Departamento → 12, Oficina → 4, Terreno/Lote → 2 (coincide exactamente con el inventario
auditado). Esto también corrigió dos combinaciones de la QA integral que antes mostraban 0
resultados por este motivo (no por falta real de inventario): Estados Unidos+Venta+Departamento+
U$D+200.000-500.000 → ahora 5 resultados; Argentina+Venta+Casa+Dormitorios=2+Ambientes=3 → ahora 2
resultados.

### Contador "N resultados" — estabilizado (Fase 1.1, 2026-08-21)

Con rangos de precio angostos, "Propiedades N resultados" podía desaparecer del todo. Causa
confirmada por prueba real contra la API (no una suposición — ver `docs/ai/2CLICS_EXTERNAL_API.md`
para el detalle completo): un bucket DESTACADO/SIMPLE sin coincidencias responde `HTTP 200` +
`{"status":"fail"}` sin `count`, y el sistema marcaba el total como no confiable. Se confirmó que
esa forma exacta (sin `count`, sin `properties`, sin `description`) es inequívocamente "0
resultados legítimos" — nunca convive con un error real (los errores reales llegan con HTTP 4xx y
siempre traen `description`, y ya los corta `lib/2clics/client.ts` antes de llegar a la lógica de
conteo). `propertyResponseCount()` ahora normaliza ese caso a `count: 0, reliable: true` en vez de
"no confiable". Además, si alguna vez el total sigue siendo no confiable por algún motivo no
cubierto, el heading ya no queda vacío — muestra "Resultados filtrados" como fallback honesto en
vez de no mostrar nada (nunca un número inventado). Verificado en vivo: los 7 estados de Precio
(A-G) ahora muestran un contador numérico real; ninguno cayó en el fallback en las pruebas.

### "Más filtros" — Dormitorios / Ambientes / Apto crédito (Fase 2, 2026-08-21)

**Semántica confirmada por prueba real antes de implementar** (detalle completo en
`docs/ai/2CLICS_EXTERNAL_API.md`): `amount_bedroom`/`amount_room` son match EXACTO (no "N o más"),
`aptCredit` es match exacto por boolean, `amount_bedroom=0` es ignorado en silencio por la API (no
filtra), y los tres combinan en AND con operación/tipo/ubicación/entre sí. Sin esta verificación se
habría podido fabricar una semántica "N+" que la API no soporta.

**Interacción:** `<details>/<summary>` nativo (`.twoclics-filter-more`, dentro del mismo
`<form>` GET de siempre) — sin Client Component, sin `useState`, sin JS. Colapsado por defecto
(una sola línea "▸ Más filtros"); se renderiza `<details open>` cuando el GET que llegó ya trae
`dormitorios`/`ambientes`/`aptoCredito` activo, para que el usuario vea el filtro aplicado sin
tener que reabrir el bloque a mano. Los controles dentro de un `<details>` cerrado igual viajan en
el submit (el cierre es solo `display:none` vía la hoja de estilos del navegador, no `hidden` ni
`disabled`), así que no hace falta ningún input oculto adicional.

**Controles (Fase 2 2026-08-21; compactado 2026-08-24):** Dormitorios y Ambientes eran
inicialmente `<select>` con las 4 opciones fijas `Todos | 1 | 2 | 3 | 4`. Se reemplazaron por un
**segmented control de radios reales** (`SegmentedFilterGroup`, `.twoclics-segmented`) porque un
`<select>` con solo 5 opciones cortas igual dispara el picker nativo a pantalla completa en
mobile/iOS/Android — ese chrome del navegador/SO no es estilizable de forma confiable con CSS
(`::-webkit-...` no cubre todas las plataformas), así que "achicar los option" no era una opción
real. Cada grupo es un `role="radiogroup"` con 5 `<input type="radio">` (mismo `name` que antes:
`dormitorios`/`ambientes`, "Todos" es un radio más con `value=""`) — el radio nunca usa
`display:none` (rompería Tab/foco), se oculta solo visualmente vía `clip` y la `<label>` adyacente
(`for`/`id`) es la superficie visible/clickeable. Mismo `<form>` GET, mismos `name`/valores que el
`<select>` original — ninguna URL existente con `?dormitorios=`/`?ambientes=` se rompe.

**Compactado 2026-08-24:** la primera versión (2026-08-21) renderizaba los 5 segmentos como pills
sueltas en un grid de 5 columnas iguales — funcional, pero se leían como 5 botones separados y
ocupaban todo el ancho de su columna. Se rediseñó como **un único grupo visual**: borde exterior
común + divisores internos finos (`.twoclics-segmented-label:not(:first-of-type)` con
`border-left`) + ancho intrínseco por segmento (`inline-flex`, ya no grid de columnas iguales) —
"Todos" queda un poco más ancho que los dígitos por su propio contenido, sin forzarlo. Altura
del segmento bajó de 38px a 32px. Activo: fondo navy + texto blanco (`input:checked + label`).
Foco: outline navy hacia adentro (`outline-offset: -2px`, para no quedar recortado por el
`overflow: hidden` del grupo ni tapado por el segmento vecino) — **excepto en el segmento
activo+enfocado a la vez**, donde el outline pasa a blanco (`input:checked:focus-visible + label`)
porque un outline navy sobre fondo navy sería invisible. Verificado con Playwright: foco por
teclado, flecha derecha dentro del radiogroup mueve foco Y selección al siguiente radio
(comportamiento nativo), `label` asociado a cada radio confirmado programáticamente, contraste de
foco verificado explícitamente en el segmento activo (el caso que antes fallaba en silencio).

Apto crédito sigue siendo un checkbox real (`<input type="checkbox" name="aptoCredito"
value="1">`, sin cambios de lógica), desmarcado por defecto; marcado manda `aptoCredito=1` →
`aptCredit: true` a 2Clics. Visualmente (2026-08-24) se le agregó un spacer invisible
(`.twoclics-filter-checkbox-spacer`, mismo alto que el `<legend>` de Dormitorios/Ambientes) para
que su fila de control arranque a la misma altura que los segmented controls — antes, sin ese
spacer y con las pills viejas ocupando toda la columna, se percibía suelto/desalineado respecto
del resto del bloque.

**searchParams:** `dormitorios`/`ambientes` (valores `1`-`4`, cualquier otro valor se descarta sin
romper el resto de la URL) y `aptoCredito=1`. Se preservan en "Ver más" (`nextPageHref`) y se
limpian junto con todo lo demás en "Limpiar filtros" (`/propiedades`) sin código adicional.

**Desktop (revisado 2026-08-24):** la fila principal `Ubicación | Operación | Tipo | Precio |
Aplicar filtros` no cambió — "Más filtros" ocupa su propia fila completa debajo (`grid-column: 1 /
-1` dentro del mismo grid de `.twoclics-filters`). `.twoclics-filter-more-grid` pasó de un grid de
3 columnas iguales a **flex con gap generoso** (`gap: 20px 36px`) — con el segmented control ahora
de ancho intrínseco (ya no estira a ocupar toda su columna), un grid de `fr` iguales dejaba un
vacío enorme a la derecha de cada grupo; flex agrupa los 3 filtros (Dormitorios/Ambientes/Apto
crédito) con más aire ENTRE ellos y sin desperdiciar ancho DENTRO de cada uno.

**Mobile:** cerrado sigue siendo una sola línea de summary — no agrega una banda grande
permanente; altura cerrada sin cambios. Abierto (revisado 2026-08-24): con el segmented control
compacto ya no hace falta forzar una fila de ancho completo por grupo (como en la versión
2026-08-21) — el mismo `flex-wrap` de desktop acomoda Dormitorios/Ambientes/Apto crédito según el
espacio real de 390px. Medido en vivo a 390×844: cerrado sin filtros **~289px** (sin cambios),
abierto con un secundario activo **~522px**. El costo cerrado sigue siendo una sola línea de
texto; el crecimiento es solo en el estado abierto, y solo cuando el usuario ya decidió abrirlo.

**DESTACADO → SIMPLE y Precio:** sin cambios — los filtros nuevos se suman dentro de
`baseApiFilters` (compartido por catálogo, faceta de precio y faceta de ubicación), así que
recortan el universo dentro de cada bucket/faceta sin tocar la prioridad comercial ni la lógica de
`resolvePriceFilter`/`priceApiFilters` (que siguen intactas).

### "Limpiar filtros" — condicional (Fase 0, 2026-08-21; extendido Fase 2)

Se renderiza cuando `filters.location !== 'all' || filters.operation !== 'all' ||
filters.propertyTypeId !== null || filters.bedrooms !== null || filters.rooms !== null ||
filters.aptoCredito || ...precio...` (computado dentro de `PropertyFilters.tsx` a partir del prop
`filters` que ya recibía). Sigue siendo un `<Link href="/propiedades">`, sin JS. Estética: acción
secundaria discreta (texto subrayado, sin fondo, sin sombra, mucho menor jerarquía que "Aplicar
filtros") — mismo lenguaje visual que el toggle de descripción de la ficha.

**Bug real corregido (2026-08-26) — los controles no se reseteaban visualmente:** reportado por la
usuaria — Operación→Venta (o Alquiler) → Aplicar → Limpiar filtros dejaba resultados/contador/URL
correctamente en el estado inicial, pero el `<select>` de Operación seguía mostrando "Venta"/
"Alquiler" en vez de "Todas". Causa confirmada (reproducido con Playwright, clicks reales, no
navegación directa por URL): "Limpiar filtros" es un `<Link>` de Next.js → navegación CLIENTE (soft
nav), a diferencia de "Aplicar filtros" (submit nativo de un `<form method="get">`, que recarga el
documento entero). En una soft nav, React reconcilia el `<form>` como "el mismo" elemento y
reutiliza su DOM, pero `defaultValue`/`defaultChecked` (usados en TODOS los controles no
controlados: Ubicación, Operación, Tipo, Moneda, Desde, Hasta, Dormitorios, Ambientes, Apto
crédito) solo se aplican en el montaje inicial — nunca de nuevo en un re-render. La fuente de
verdad (searchParams → `filters`) siempre fue correcta; era la reconciliación de React la que no
se enteraba. **Corregido** con una `key` derivada de `filters` en el `<form>`
(`PropertyFilters.tsx`) — cuando cambia, React desmonta y remonta todo el subárbol, así
`defaultValue`/`defaultChecked` se vuelven a aplicar frescos. Sin `useState`, sin Client Component,
sin borrar campos a mano — la ausencia de searchParams ya alcanza para reconstruir el formulario
inicial. Verificado con Playwright (clicks reales) que los 8 controles (Ubicación, Operación,
Tipo, Moneda, Desde, Hasta, Dormitorios, Ambientes, Apto crédito, Más filtros) resetean
correctamente, y con un spec de regresión formal (`e2e/filters-reset.spec.ts`, `npm run test:e2e`).

### Ubicación — labels públicos en el filtro (Fase 0, 2026-08-21)

El `<select>` de Ubicación mostraba el label técnico crudo del CRM (ej. "Bs.As. G.B.A. Norte"). Se
reemplazó por el mismo formatter público que ya usan cards y fichas (`formatPublicLocation`,
`lib/2clics/format.ts`) — sin duplicar reglas geográficas en un segundo lugar. Solo cambia el
`label` visible del `<option>`; el `value` (`state:ID`/`city:ID`/`neighborhood:ID` — el id técnico
que recibe 2Clics) no se tocó, así que URLs existentes con esos query params siguen funcionando
igual. Jerarquía real observada: nivel "estado" del CRM se relabelea como **Mercado**
("Argentina"/"Estados Unidos"), ciudad como "Ciudad · País" (ej. "Tigre · Argentina"), barrio como
"Barrio · Ciudad · País" (ej. "Benavídez · Tigre · Argentina"). Implementado en
`publicLocationOptionLabel`/`buildLocationOptions` (`lib/2clics/listings.ts`).

### Cards del catálogo

- Línea superior: solo el tipo (CASA / DEPARTAMENTO / OFICINA / TERRENO·LOTE) — nunca la
  ubicación pegada al tipo.
- Ubicación va separada, debajo del título. Ej.: "Casa en venta en Miami" / "Miami · Florida · Estados Unidos".

#### Jerarquía visual y facts por tipo (2026-08-26)

**Jerarquía (sin cambios de estructura, ya era así):** Tipo (eyebrow dorado, discreto) → Título
(protagonista, serif navy) → Ubicación (secundaria, gris chico) → **Precio** (revisado: un poco
más de jerarquía visual — `.twoclics-catalog-section .twoclics-card-price` pasó de 0.92rem a
1.05rem, sigue claramente menor que el título de 1.26rem) → facts compactos → CTA "Ver propiedad".

**Facts — mismo criterio que la ficha (`PropertyDetailView.tsx`, `essentialFacts`), ahora
compartido vía `lib/2clics/format.ts` (`formatCount`, `isLandPropertyType`,
`isOfficePropertyType`) para que card y ficha nunca se contradigan:**

- **Residencial (Casa, Departamento, Dúplex, PH, etc. — todo lo que no sea Oficina/Terreno):**
  Ambientes → Dormitorios → Baños → Cocheras → Superficie total, mostrando solo lo que exista
  (auditado: en la práctica siempre salen 3-5 facts, nunca los 5 forzados).
- **Oficina:** Ambientes → Baños → Cocheras → Superficie total. **Nunca Dormitorios** — el
  inventario auditado (4 Oficinas reales) tiene `amountBedroom: 1` en las 4, un dato residual del
  CRM, no un dormitorio real; mostrarlo sería tratar la oficina como vivienda.
- **Terreno / Lote:** únicamente Superficie total. Nada de ambientes/dormitorios/baños/cocheras,
  aunque el dato existiera — no aplican a un lote.
- **Ceros:** un valor `<= 0` nunca se muestra (`formatCount`/`formatArea` ya lo descartan) — "0
  dorm."/"0 baños"/"0 cocheras"/"0 amb." representan ausencia o no aplicación, no un dato real.
- **Singular/plural:** "1 baño"/"2 baños", "1 cochera"/"2 cocheras" (palabras completas, si
  cambian). "amb."/"dorm." se mantienen invariables en su forma abreviada (ya era así).
- **Cobertura real auditada (21 propiedades, snapshot 2026-08-26):** amountRoom/amountBedroom/
  totalArea/coveredArea/baños/cocheras 19/21 (Terreno/Lote es la única ausencia real: 2/21, sin
  dato residencial ni de superficie cubierta, coherente con el tipo). Cocheras positivas: 8/12
  Departamento, 1/3 Casa, 4/4 Oficina, 0/2 Terreno.
- **Bug real corregido en la misma pasada** (enabler de este trabajo, no una funcionalidad nueva):
  `lib/2clics/metadata.ts` (`parsePublicMetadata`) solo miraba `item.metaKey` para resolver el
  nombre semántico de cada `meta_data` — correcto para el endpoint de FICHA (`GET
  /api/property/{id}`, que trae `metaKey`=nombre semántico), pero exactamente al revés para el
  endpoint de LISTADO (`POST /api/property`, el que alimenta las cards), que trae `metaKey`=id
  numérico y `metaId`=nombre semántico. Sin este fix, `metadata.bathrooms`/`metadata.garages`
  (y cualquier otro campo derivado de meta_data) quedaban vacíos en las cards aunque el dato
  existiera. Detalle completo en `docs/ai/2CLICS_EXTERNAL_API.md`.

No se agregó Piso, Toilettes, ni ningún otro dato de metadata a la card — quedan reservados a la
ficha (`docs/ai/PROPERTY_UX_DECISIONS.md`, sección de ficha) para no convertir la card en una ficha
técnica completa.

#### Card overlay — aprobada para catálogo y oportunidades seleccionadas del Home (2026-08-28)

**Decisión final** (aprobada 2026-08-28 tras revisión manual en desktop y mobile) — reemplaza a la
card blanca anterior como la card vigente en:

- **Catálogo `/propiedades`** (`variant="overlay-catalog"` en `app/propiedades/page.tsx`,
  aprobado 2026-08-27, confirmado 2026-08-28).
- **Home, "Oportunidades seleccionadas"** (`variant="overlay-home"` en
  `components/properties/FeaturedProperties.tsx`, aprobado 2026-08-28) — mismo componente
  `PropertyCard`, misma familia de `variant` (desde 2026-09-02 dividida en `overlay-home` /
  `overlay-catalog` — ver subsección de título más abajo), sin CSS ni componente duplicado para
  Home.

La card default (bloque blanco debajo de la foto) **sigue existiendo y en uso solo en la ficha**
(relacionadas, `PropertyDetailView.tsx`, prop `compact`) — no se tocó ni se eliminó; queda
pendiente de revisión específica de ese contexto en una tarea futura.

**Composición (no rediseñar sin pedido explícito):** fotografía protagonista, `aspect-ratio: 4/3`
(`.twoclics-card-media`), badges arriba de la foto (Venta/Alquiler en pill sólido, "Destacada" en
contorno discreto), toda la info (Tipo eyebrow dorado → Título → Ubicación → Precio → facts → CTA)
superpuesta abajo sobre un degradé (`.twoclics-card-gradient`, `linear-gradient` navy transparente
→ opaco, solo en la mitad inferior — la mitad superior de la foto queda limpia). Toda la card (foto
+ info) es un único `<Link>` clickeable a la ficha; el CTA es texto discreto "Ver propiedad →", sin
botón navy compitiendo con la foto. Título recortado a un máximo de líneas (el string completo
sigue siempre en el DOM, nunca se trunca/reescribe — el recorte es puramente visual; el mecanismo
exacto y el número de líneas difieren entre Home y catálogo desde 2026-09-02, ver subsección
propia más abajo). Facts: exactamente la misma lógica/adapters que la card default, sin tocar
(`propertyFacts()` en `PropertyCard.tsx` — Ambientes/Dormitorios/Baños/Cocheras/Superficie para
residencial, sin Dormitorios para Oficina, solo Superficie para Terreno/Lote).

**Legibilidad — resuelta estructuralmente, no caso por caso (ajuste 2026-08-29):** el ajuste
2026-08-28 (solo `text-shadow`) no alcanzaba en fotos muy claras (fachada + vegetación, interior
blanco, aérea) porque el bloque de texto podía arrancar sobre una zona del degradé casi sin
oscurecer. La solución final es estructural, para que la legibilidad no dependa de qué foto haya
detrás (ni de las que 2Clics publique en el futuro):

- **Zona de lectura fija:** `.twoclics-card-overlay-info` ocupa siempre el **50% inferior** de la
  card (`top: 50%`, no una altura que depende del contenido) y alinea el contenido contra el borde
  inferior de esa zona (`justify-content: flex-end`) — con poco contenido queda pegado abajo, en la
  parte más oscura; con contenido más largo (título de 2 líneas + varios facts) crece hacia arriba
  dentro de la misma zona.
- **Scrim navy progresivo** (`.twoclics-card-gradient`), en 5 paradas — prácticamente limpio arriba
  de ~68% de altura, transición suave (se funde con la foto, no una caja recortada) entre ~68% y
  ~35%, y opacidad alta (0.52 → 0.92) desde el 35% hacia abajo: `rgba(12,41,72,0.92) 0%,
  rgba(12,41,72,0.78) 16%, rgba(12,41,72,0.52) 35%, rgba(12,41,72,0.22) 50%, rgba(12,41,72,0) 68%`.
  Así el 50% inferior (donde vive el texto) siempre cae sobre la parte con contraste garantizado del
  scrim, sin importar la foto. La mitad superior sigue prácticamente intacta — la foto sigue siendo
  protagonista, esto no es una placa navy tapando la card.
- **`text-shadow` como apoyo, no como base:** se mantuvo el mismo valor del ajuste anterior
  (`0 1px 3px rgba(0, 0, 0, 0.55)` en título/ubicación/precio/facts/CTA; `0 1px 2px rgba(0, 0, 0,
  0.4)` en el eyebrow) — no se aumentó. El contraste principal lo da el fondo controlado (zona +
  scrim), no la sombra.
- **Sin glassmorphism:** ni blur, ni rectángulo translúcido, ni caja de contenido — solo fotografía
  + degradé editorial + texto.

**Eyebrow de tipo en overlay: texto blanco/off-white + acento lineal dorado García para garantizar
contraste sobre fotografía variable (ajuste 2026-08-30).** El scrim + zona de lectura del 50%
inferior (arriba) resolvió título/ubicación/precio/facts/CTA, pero el eyebrow (CASA/DEPARTAMENTO/
OFICINA/TERRENO · LOTE) seguía en dorado García sólido — insuficiente en fotos muy claras (cielo,
agua, vegetación, interiores claros) y sin margen para reforzarlo con más `text-shadow` sin verse
pesado (es chico y bold). Solución: el texto pasa a blanco/off-white
(`rgba(255, 255, 255, 0.94)`, mismo nivel de contraste robusto que el resto del bloque) y el dorado
García se conserva únicamente como acento — una línea corta y fina (`14px × 2px`, `var(--gold)`)
antes del texto vía `::before` (sin agregar un elemento nuevo al DOM). Sin pill, sin badge, sin
caja, sin fondo, sin borde — el texto y la línea se sienten como una sola unidad discreta. No se
tocó el scrim, la zona de lectura del 50%, el `aspect-ratio` ni el resto de los textos. Jerarquía
sin cambios: Título > Precio > Tipo/Ubicación/Facts — el eyebrow no compite con el título.
Verificado en Home y catálogo (mismo `variant="overlay"` compartido, sin duplicar estilos) para
Casa Miami, Casa Benavídez, Terreno Delta, Departamento (agua/cielo e interior claro) y Oficina
(el caso más exigente, fachada blanca + cielo) a 1920×800 y 390×844 — el tipo se lee de inmediato
sin ajustes por foto.

Verificado con datos reales a 1920×800 y 390×844 en ambos contextos (Home y catálogo): Casa Miami
(fachada clara + vegetación detrás del título), Casa Benavídez (interior muy claro), Terreno Delta
(foto aérea compleja), un plano de desarrollo (Lote Al Rio), Departamento (interiores claros,
fotos de playa/cielo muy claro) y Oficina — misma legibilidad en todos los casos, sin ajustes por
caso. 211 tests (sin cambios de markup/semántica, no se tocaron), typecheck/lint limpios, e2e de
salud de Home y `/propiedades` sin errores de consola sobre build de producción.

#### Título: mismo comportamiento en Home y catálogo (2026-09-02, unificado 2026-09-03)

**Estado vigente:** Home y catálogo usan **exactamente el mismo comportamiento de título** —
siempre visible, 1 línea en reposo en desktop, se expande hasta 2 líneas en hover/focus, siempre
visible hasta 2 líneas en mobile. `overlay-home` y `overlay-catalog` (los dos valores de `variant`
de `PropertyCard.tsx`) renderizan hoy **markup byte-idéntico** — el mismo componente, el mismo CSS,
sin ningún modifier class de por medio (test de regresión: `homeHtml === catalogHtml` en
`tests/2clics/ui.test.ts`). Se mantienen como dos valores de `variant` separados en vez de
colapsarlos a uno solo porque documentan la intención en cada call site
(`FeaturedProperties.tsx` vs. `app/propiedades/page.tsx`) sin costo real — si el día de mañana
necesitan volver a diferenciarse, alcanza con reintroducir un modifier class acotado al `<h3>`.

**Historia (por qué llegamos acá):** originalmente (2026-09-01) Home ocultaba el título en reposo
en desktop y lo revelaba recién en hover/focus, priorizando impacto visual con solo 3 destacadas.
El 2026-09-02 el catálogo necesitó diferenciarse porque escanear muchas cards seguidas sin título
visible las volvía casi indistinguibles a simple vista (especialmente entre propiedades con
título/ubicación idénticos — ver nota sobre Oficinas repetidas más abajo), así que se creó
`overlay-catalog` con el título siempre visible. El 2026-09-03, pedido explícito, se llevó ese
mismo comportamiento (siempre visible) también a Home — misma tipografía/tamaño/jerarquía que el
catálogo (`1.05rem`) — y al quedar ambas variantes con comportamiento idéntico, se eliminó el
modifier class `twoclics-card--overlay-catalog` (ya no aportaba nada) y se fusionó su CSS en la
regla base `.twoclics-card--overlay .twoclics-card-overlay-info h3`.

**Tres bugs reales encontrados implementando esto** (los tres corregidos, confirmados con
`getComputedStyle`/`offsetHeight`, no solo visualmente):

1. `-webkit-line-clamp` y `max-height` compiten cuando conviven — con `display: -webkit-box` +
   `-webkit-line-clamp: 2` (heredado de la regla de Home), el navegador igual renderiza las 2
   líneas que el line-clamp permite y no respeta un `max-height` menor. El catálogo saca el
   line-clamp (`display: block`) y usa `max-height` + `overflow: hidden` como única fuente de
   verdad del recorte, en múltiplos exactos de `line-height` para que el corte caiga en el borde
   entre líneas.
2. Una regla vieja de la card default, `.twoclics-catalog-section .twoclics-card h3 { min-height:
   2.45em; font-size: 1.26rem; }` (2 clases de especificidad), le seguía ganando a la regla nueva
   del catálogo (antes 1 clase) — un `min-height` mayor que el `max-height` siempre gana en CSS.
   Corregido igualando la especificidad a 2 clases y reseteando `min-height: 0` explícitamente.
   Mismo problema se repetía en mobile contra la regla base `max-height: none` de Home — corregido
   con un override específico del catálogo ahí también, con tope explícito de 2 líneas.
3. La zona de info (`.twoclics-card-overlay-info`) tiene altura FIJA (`top: 50%`) — cuando el
   título necesita crecer a 2 líneas y el contenido total supera por poco esa altura, el
   `flex-shrink: 1` que traen los flex items por default comprimía el título silenciosamente en
   vez de dejarlo llegar a su `max-height` real (confirmado: se quedaba ~8px corto). Corregido con
   `flex-shrink: 0` en todos los hijos de `.twoclics-card-overlay-info` — el contenido ahora
   desborda hacia arriba cuando hace falta (comportamiento ya documentado como esperado), sin
   compresión invisible. Este fix es compartido (Home + catálogo) y no cambia la posición/
   apariencia de ubicación/precio/facts/CTA/tipo en sí.

**Oficinas con título y ubicación idénticos:** no se resuelve (ni se intenta resolver) desde
frontend — no se generan títulos alternativos ni se inventan direcciones. Con el título del
catálogo siempre visible, esas cards ya muestran su (idéntico) título sin necesitar hover; la
diferenciación real sigue viniendo de precio/superficie/ambientes/baños/cocheras, visibles en la
misma card. La calidad de títulos del CRM se revisa por separado, no en esta tarea.

Verificado a 1920×800 y 390×844 en Home y catálogo: Casa Miami, Casa Benavídez, Terreno Delta,
varias Oficinas seguidas (mismo título/ubicación), y Departamentos con títulos largos (título de 2
líneas en hover/focus sin comprimirse, confirmado con `scrollHeight === offsetHeight`). Tras la
unificación del 2026-09-03, verificado además que una card de Home y una del catálogo con la misma
propiedad se ven visualmente indistinguibles (mismo título en 1 línea en reposo, misma expansión a
2 líneas en hover/focus por teclado, mismo tamaño de fuente). 212 tests, typecheck/lint limpios,
e2e de salud de Home y `/propiedades` sin errores de consola sobre build de producción.

## Ficha `/propiedades/[id]`

- **Sin Header institucional**: sin logo, navegación global, hamburguesa ni teléfono global. El
  Header normal reaparece al volver a `/propiedades`.
- **Hero de ficha**: "← Volver a propiedades" (izquierda) · eyebrow `operación · tipo` · H1
  centrado · ubicación · botón Compartir (derecha). Sin precio en el hero.
- **Galería**: imagen principal, anterior/siguiente, contador, "Ver las X fotos", thumbnails,
  lightbox con `Escape` y navegación. URLs directas de imágenes de 2Clics (no reintroducir un
  optimizer que rompa imágenes). Lightbox respeta aspect ratio original (`object-fit: contain`,
  sin recortar).
- **Modal de consulta**: CTA "Consultar esta propiedad", abre modal en la misma ficha (portal a
  `document.body`, evita problemas de z-index), nunca redirige al Home. Usa `property_app_id`
  hacia `POST /api/lead/message` server-side.
- **Asesoramiento desktop**: tarjeta con nombre de García, teléfono + ícono en la misma línea,
  copy de disponibilidad, botón "Consultar esta propiedad". Sin WhatsApp adentro (WhatsApp es
  flotante global, `components/layout/WhatsAppFloat.tsx`).
- **Mobile**: sin Header global. Orden: Volver → eyebrow → título → ubicación → galería →
  thumbnails → acciones (Compartir / Solicitar asesoramiento / Llamar) → franja esencial → contenido.
  No se muestra la tarjeta desktop de asesoramiento.
- **Franja de datos esenciales**: Precio, Ambientes, Dormitorios, Baños, Cocheras, Superficie
  total. Desktop horizontal, mobile 2 columnas, moneda+precio en la misma línea. No se repite
  más abajo en la ficha.

### Orden de contenido de la ficha — ya implementado

Verificado línea por línea en `PropertyDetailView.tsx` (2026-08-21): **este orden ya está en
producción**, no es una tarea pendiente.

1. Descripción — con **progressive disclosure** (ver subsección propia más abajo)
2. Detalles de la propiedad: Información básica + Superficies (grid de dos columnas editoriales,
   divisor fino entre columnas, patrón label/valor — ver subsección "Información básica")
3. Amenities y servicios (solo si `amenities.length`)
4. Información adicional — **solo si queda con contenido real** después de sacar Expensas (ver
   más abajo). Si no aporta nada, no renderiza ni heading, ni wrapper, ni espacio reservado — se
   pasa directo de Amenities a Ubicación.
5. Video (solo si hay `videoUrl` usable; `tourUrl` no se implementa todavía — 0/21 propiedades
   auditadas tienen tour usable)
6. Ubicación + mapa (Google Maps embebido + link "Abrir en Google Maps ↗"; prioridad:
   coordenadas reales → dirección publicable → barrio/ciudad/provincia → zona aproximada)
7. "Otras propiedades que pueden interesarte" (nunca "Otras propiedades en la zona"), priorizando
   cercanía geográfica (`rankRelatedProperties` en `lib/2clics/listings.ts`, usa distancia
   haversine si hay lat/long, si no cae a mismo barrio/ciudad/provincia)

No se duplican precio/ambientes/dormitorios/baños/cocheras/superficie total debajo de la franja
esencial. Tampoco se repiten **tipo de propiedad** ni **operación** en Información básica — ya se
comunican arriba, en el eyebrow del hero ("VENTA · CASA").

### Normalizaciones de texto (información básica)

`lib/2clics/format.ts` (`formatPublicDisplayValue`) resuelve de forma genérica lo que el handoff
original pedía como mapa literal: valores en mayúsculas se pasan a sentence-case, y
`formatPublicDetailValue` filtra valores no públicos (`OTHER`, `n/a`, `-`, vacíos). Booleans:
`true`→"Sí", `false`→"No". `building_date` normaliza a "A estrenar" / "En construcción"
(`lib/2clics/metadata.ts`, `cleanBuildingDateValue`).

### Antigüedad vs. Año / construcción (2026-08-21)

Auditado contra las 21 propiedades reales: `building_date` (raw key de 2Clics) se mapea a
**Estado/condition** ("A estrenar" / "En construcción" únicamente — cualquier otro valor se
descarta, `cleanBuildingDateValue`); `building_date_number` (junto con `antiquity`/`age`/
`antiguedad`) se mapea a **Antigüedad** ("N años"); `construction_date`/`fecha_construccion` se
mapea a un campo distinto, **Año / construcción**, que en la práctica no tiene cobertura real hoy
(0/21). En el dataset auditado, Estado y Antigüedad ya salen mutuamente excluyentes (nunca las dos
juntas) — no hay duplicación observada. Como salvaguarda para el caso en que 2Clics llegue a
enviar ambos (`antiquity` y `constructionDate` a la vez, misma pregunta respondida dos veces):
si hay Antigüedad, no se muestra Año / construcción — se prioriza el campo con cobertura real. No
se infiere ni se calcula ningún valor; solo se elige cuál de los dos ya-provistos mostrar.

### Expensas — ubicación y valor cero

**Ubicación (2026-08-21, CONGELADO):** Expensas es una fila más de **Información básica** (última
fila, después de Orientación), no una sección propia. Antes vivía sola dentro de "Información
adicional", lo que generaba una sección completa para un solo dato con el label y el valor
separados a lo ancho de toda la columna. Mismo patrón label/valor que el resto de Información
básica — sin caja propia, sin sección propia.

**Valor cero (vigente desde antes, sin cambios en esta pasada):** `expenses = "0"` (o
equivalentes: `"0.0"`, `"0.00"`, vacío) **no se interpreta como "sin expensas"** — 2Clics no
distingue ese caso de un dato simplemente no cargado, así que afirmar "Sin expensas" sería
inventar una conclusión que no está soportada por el dato. El campo se omite por completo (ni el
monto ni un texto alternativo), incluyendo el fallback "Moneda de expensas" (que solo debe
aparecer cuando el monto está genuinamente ausente, no cuando es cero). Implementado en
`isZeroExpensesValue`/`formatExpenses` (`lib/2clics/format.ts`) — **congelado, no modificar salvo
adaptación estrictamente necesaria del punto donde se usa**. Es una regla específica de expensas —
no un tratamiento genérico de "todo cero se oculta".

### Información adicional — solo si aporta valor real (2026-08-21)

Con Expensas movida a Información básica, "Información adicional" quedó reservada para datos
verdaderamente secundarios (hoy: toilettes, tipo de cochera). Si no hay ninguno, la sección **no
renderiza nada** — ni heading, ni wrapper, ni divisor, ni espacio reservado; se pasa directo de
Amenities a Ubicación. Cuando sí tiene contenido, usa una lista compacta (`twoclics-spec-list--compact`,
`max-width: 420px` en desktop) para que label y valor se perciban como una unidad, en vez de
quedar separados en un contenedor casi tan ancho como toda la columna principal.

### Descripción — progressive disclosure (2026-08-21)

Descripciones largas se muestran recortadas por defecto (`components/properties/PropertyDescription.tsx`,
clamp CSS `-webkit-line-clamp`: ~7-8 líneas desktop, ~6 líneas mobile) con un control "Ver
descripción completa ↓" / "Ver menos ↑" — `button` real, `aria-expanded` + `aria-controls`, sin
dependencia externa. El control solo aparece si el texto realmente se corta (medido en el cliente
comparando `scrollHeight`/`clientHeight`; si la descripción es corta, no hay botón). El contenido
original de 2Clics nunca se recorta, resume ni reescribe — el clamp es solo visual, el string
completo sigue en el DOM. Estética: acción editorial secundaria (navy, chica, sin card, sin
sombra), mucha menos jerarquía que "Consultar esta propiedad".

## Ubicación pública

- Formato aprobado: `Barrio · Ciudad · Argentina` (AR) / `Miami · Florida · Estados Unidos` (US).
- No mostrar el `state` crudo de 2Clics (ej. "Bs.As. G.B.A. Norte") en la ubicación pública de cards/fichas.
- No reintroducir el bug de encoding `Â·` — separador correcto es `·` (U+00B7) vía `compactText`.

## Comprar / Alquilar — cierre visual (2026-08, sexta pasada)

Mismo `PropertyFilters`/`CatalogView`/`PropertyCard` que `/propiedades` — nada de lo de abajo
duplica componente ni cambia semántica/filtros/paginación. `/propiedades` no recibe ninguno de
estos cambios (no tiene `lockedOperation` ni la clase `.market-page`).

**Bug real de grid corregido:** con `lockedOperation` (Comprar/Alquilar), el `<select>` de
Operación no se renderiza, así que el grid de 5 columnas de `.twoclics-filters` (pensado para
Ubicación/Operación/Tipo/Precio/Acciones) recibía 4 ítems — CSS Grid corría Precio a una columna
angosta y Acciones a la ancha pensada para Precio. Modifier `.twoclics-filters--locked`
(`grid-template-columns: repeat(2, minmax(0,1fr)) minmax(280px,1.7fr) auto` en desktop) restaura
Ubicación/Tipo/Precio/Aplicar filtros como una fila coherente, con "Aplicar filtros" al final.

**`.market-page` (clase en el `<main>` de `app/comprar`/`app/alquilar` únicamente):** contenedor de
filtros con fondo blanco, radio 14px, sombra suave y más aire interno (en vez del recuadro con
fondo semitransparente y bordes rectos que se leía "administrativo"); inputs/selects con radio 10px
y foco dorado (`var(--gold)`, mismo lenguaje de foco que el formulario de Contacto); hero y sección
de resultados con padding vertical reducido para que Header + Hero + Filtros + inicio de resultados
entren de forma razonable en los primeros ~800-900px de un desktop. Ningún filtro, control,
comportamiento de `<details>`/segmented control ni la card se modificó — solo el contenedor/spacing
alrededor.

**Hero interior — mismo componente que Desarrollos/Invertir/Vender/Nosotros/Servicios
(`.twoclics-catalog-hero--compact`), sin tocar esa clase base.** Se agregó un eyebrow corto
("Comprar"/"Alquilar") sobre el H1 ya existente. Copy: Comprar menciona Buenos Aires y Miami (venta
tiene inventario real en ambos); Alquilar **no** menciona Miami — hoy no tiene inventario real de
alquiler en ese mercado (ver bug de Precio/Ubicación documentado arriba, "Estados Unidos hoy no
tiene ninguna propiedad en Alquiler").

## Comprar / Alquilar — segunda pasada visual/UX (2026-08, séptima pasada)

Sobre la base de la sexta pasada (arriba). `/propiedades` sigue sin recibir ninguno de estos
cambios.

**Hero sin eyebrow duplicado**: se quitó el eyebrow lateral (repetía el H1). Nuevo H1 + bajada:
"Propiedades para comprar" / "Explorá propiedades disponibles en Buenos Aires y Miami." y
"Propiedades para alquilar" / "Explorá las propiedades disponibles actualmente." (sin nombrar
mercado — el inventario de alquiler es dinámico, nombrar Miami hoy sería una promesa que puede
dejar de ser cierta).

**Panel acoplado al Hero**: `.market-page .twoclics-filters` sube con `margin-top` negativo sobre
el padding-bottom extra del Hero — panel blanco montado entre el navy y el cream, mismo ancho que
la grilla de resultados, sin glassmorphism ni aumento de altura total.

**LocationPicker (`components/properties/LocationPicker.tsx`) reemplaza el `<select>` nativo de
Ubicación SOLO en Comprar/Alquilar** — `/propiedades` sigue con el `<select>` original sin
cambios. Combobox accesible (`role="listbox"`/`role="option"`, `aria-haspopup`, `aria-expanded`,
`aria-activedescendant`, teclado, click-outside), con un `<input type="hidden" name="ubicacion">`
en el mismo `<form>` GET — mismo contrato de `searchParams`/`getPropertyCatalog`, sin segundo motor.

- **Agrupación por mercado**: "Buenos Aires"/"Miami" (mismo par ya aprobado en Footer/Trayectoria)
  reemplazan al nivel técnico "state" (Mercado/Argentina/Estados Unidos), que ya no se ofrece como
  opción clickeable — el encabezado de grupo lo comunica.
- **Label corto, no compuesto**: cada opción muestra solo su nombre hoja (`shortLabel`: "Tigre",
  "Benavídez", "Miami"), no el label completo "Tigre · Argentina" (ese sigue siendo el que usa el
  `<select>` de `/propiedades`, sin cambios ahí).
- **100% dinámico**: `groupOptions()` deriva todo de `availableLocations` (facets reales), sin
  ninguna lista fija de barrios/localidades — una localidad nueva de 2Clics aparece sola.
  `ListingLocationOption` sumó `region`/`shortLabel` de forma aditiva (`buildLocationOptions` en
  `lib/2clics/listings.ts`) — no rompe al `<select>` nativo, que sigue usando solo
  `value`/`label`/`kind`/`count`.
- **Búsqueda interna** ("Buscar ubicación…"): filtrado local sobre las opciones ya recibidas
  (normaliza mayúsculas/acentos), sin llamar a 2Clics por tecla.
- **Value técnico intacto**: lo que se envía a 2Clics no cambió, solo la presentación.

**CTA "Buscar propiedades"** (antes "Aplicar filtros") reutiliza `.btn-primary` (gold/navy, ya
aprobado en Hero/CTAs del sitio) en Comprar/Alquilar; `/propiedades` conserva "Aplicar filtros" en
navy.

**Filtros activos — chips** (`.twoclics-active-filters`): un chip por filtro activo (Ubicación/
Tipo/Precio/Dormitorios/Ambientes/Apto crédito; Operación nunca, está forzada) con label público y
×, cada uno un `<Link>` real a `removeFilterHref()` (mismo patrón que `nextPageHref`) — sin JS, sin
segundo estado, mismo `searchParams`.

**Precio**: sin cambios de semántica. Columna ampliada (`minmax(320px,1.9fr)`) solo en Comprar/
Alquilar aprovechando el ancho que el LocationPicker (compacto) ya no necesita.

**"Más filtros"**: misma lógica (`<details>`, Dormitorios/Ambientes/Apto crédito); solo cambia el
marcador (+/− en vez de ▸) y se quita el border-top grueso, solo en Comprar/Alquilar.

## Comprar / Alquilar — sin Hero interior (2026-08, octava pasada)

Todo lo de la séptima pasada (arriba) quedó aprobado sin cambios. Único ajuste: se retiró por
completo el Hero navy (H1 + bajada) de `/comprar` y `/alquilar` — decisión de producto: son
páginas funcionales de búsqueda, no landings editoriales; la sección activa ya la comunica el
Header (`.hdr-active`, dorado). Composición final: Header → panel de filtros → "Propiedades + N
resultados" → grid → Footer, nada entre Header y filtros.

**SEO sin H1 visible**: `title`/`description`/`canonical` de ambas páginas sin cambios. Cada una
mantiene un `<h1 className="sr-only">` (mismo texto que tenía el H1 visible) para no perder la
semántica de encabezado de página — utilidad `.sr-only` ya existente (agregada en la quinta pasada
para Contacto).

**CSS de docking retirado sin dejar reglas muertas**: el `margin-top` negativo con el que el panel
de filtros se "acoplaba" al Hero (séptima pasada) y el padding-bottom extra del Hero se eliminaron
por completo — sin Hero, no tenían función. El panel es ahora el primer bloque de `.market-page
.twoclics-catalog-section`, con `padding-top: 40px` (desktop) / `24px` (mobile) fijo respecto al
Header — mismo criterio ya usado en `/contacto` para "primer bloque bajo el Header".

## Desarrollos / Faena — cierre visual y funcional (2026-08, novena pasada)

`/desarrollos/[slug]` es una landing EDITORIAL de proyecto, distinta de la ficha canónica
`/propiedades/[id]` — no es "la ficha con otro template". Fuente de datos: `PublicProperty`
sanitizada de la propiedad fuente (hoy 187676 para Faena) + metadata editorial mínima de
`lib/site-curation.ts` (slug/nombre/propertyIds — nunca precio/superficie/amenities/fotos
duplicados ahí).

**Regla congelada — dato de unidad vs. dato de proyecto:** antes de mostrar cualquier campo en
"Datos del proyecto", preguntarse si describe el DESARROLLO o solo la ficha fuente puntual.
Dormitorios/baños/superficie/precio/tipo de UNA unidad nunca son highlights de proyecto — se
retiraron "Tipo" y "Superficie total" (eran atributos de 187676, no de Faena) por esta regla. El
único highlight legítimo hoy es "Unidades disponibles" (`units.length`, cuenta la curaduría
editorial en sí). No inventar developer, fecha de entrega, status, cantidad total de unidades,
payment plan, rentabilidad, ticket ni disponibilidad global — si 2Clics no lo trae, no se muestra.

**Hero de proyecto con fotografía protagonista** (`.project-hero`, `CuratedDevelopmentDetailView.tsx`):
imagen real de portada + degradé navy (mismo lenguaje visual que el Hero de Home), escala
controlada (`min-height:58vh / max-height:620px`, nunca pantalla completa). Deliberadamente
distinto del hero navy sin foto que usa la ficha de propiedad (`.twoclics-detail-hero`) — esa
diferencia visual es la que comunica "esto es un proyecto, no una ficha". CTA primario ("Ver
propiedades disponibles", ancla interna) + CTA secundario ("Consultar proyecto" → `/contacto`).
Sin foto de portada disponible, cae a un hero de texto (fallback defensivo, no esperado en Faena).

**CTA final → `/contacto`, nunca WhatsApp directo** — mismo criterio ya vigente en el resto del
sitio desde que Contacto es landing propia (Header/Hero/Footer/`ListingState`/`InquiryCta`).

**Galería/Amenities/Video**: reutilizan `PropertyGallery`/`PropertyMap` sin modificar (evita
duplicar lógica ya aprobada). Amenities solo si hay datos estructurados reales (`amenities.length`)
— nunca inferidos de la descripción o de fotos. Video solo si `metadata.videoUrl` existe — sin
placeholder si no hay.

**Escalabilidad del índice** (`/desarrollos`, sin cambios de esta pasada, confirmado vigente): 1-2
proyectos → `FeaturedSpotlight` editorial; 3+ → grilla `CuratedDevelopmentCard`. Umbral extraído a
`shouldUseFeaturedLayout()` (`lib/desarrollos.ts`) para no tener que rediseñar al sumar proyectos.

**Bajada del índice, dinámica, nunca overclaim**: `activeMarketsPhrase()` (`lib/desarrollos.ts`)
menciona solo los mercados con al menos un proyecto real curado — hoy "Miami" únicamente (Faena).
Nunca "Buenos Aires y Miami" sin un proyecto real en cada uno.

**Limitación real, no corregida en esta pasada:** la descripción pública de 187676 trae un tag
interno de CRM filtrado por 2Clics (`[FABIANAGA-456]`), visible tanto acá como en la ficha
canónica — requiere tocar el pipeline compartido de descripción (fuera de scope, protegido). Ver
`PROJECT_STATE.md`, sección "Pendiente de decisión".

## `/desarrollos` — catálogo visual sin Hero (2026-08, décima pasada)

Corrección puntual sobre la novena pasada (arriba): esa versión del índice (Hero navy + bajada
dinámica + FeaturedSpotlight/grilla alternando por cantidad) **no fue aprobada** en la revisión
visual. `/desarrollos/faena` no cambió en esta pasada.

**Sin Hero editorial**: eliminado por completo — sin eyebrow, sin H1 visible, sin bajada, sin
bloque navy intermedio. `<h1 className="sr-only">Desarrollos</h1>` cubre semántica/SEO. La sección
activa del Header (dorado) ya comunica dónde está el usuario — mismo criterio que Comprar/Alquilar
sin Hero (séptima/octava pasada).

**Catálogo visual, un único sistema de grilla** (`.development-grid`, 2 columnas desktop / 1
mobile): reemplaza la rama que alternaba `FeaturedSpotlight` (1-2) / grilla (3+) — un solo sistema
que funciona igual con 1 proyecto que con 10, sin rediseño al agregar el segundo/tercero.
`FeaturedSpotlight` sigue vigente en `/invertir`, no se tocó ni se borró.

**Card de proyecto** (`CuratedDevelopmentCard`, adaptada en el lugar — única consumidora, no se
creó un componente nuevo): imagen protagonista, eyebrow pequeño "Proyecto", nombre editorial,
ubicación pública, CTA discreto "Conocer proyecto →". Toda la card es un único `<Link>` (mismo
patrón ya aprobado de PropertyCard overlay). Se retiraron el extracto largo de descripción y el
conteo "N propiedades asociadas" — la card no debe leerse como un bloque de texto. Solo datos
respaldados: imagen + nombre + ubicación + link. Nunca precio/unidades/año/estado/developer/fecha
de entrega/rentabilidad/payment plan.

**Sin mapa, sin split-screen** — decisión explícita, toda el área es para la grilla. **Sin filtros
de status** (pre-construction/under construction/etc.) — no hay datos estructurados/confirmados
para construirlos; la grilla queda diseñada para poder agregarlos después sin rediseño mayor.

## Saneamiento de descripción pública — tokens internos de CRM (2026-08, décima pasada)

**Regla congelada:** ningún identificador interno de CRM/broker debe llegar a texto público.
Confirmado contra datos reales: la descripción de varias propiedades trae un prefijo tipo
`[FABIANAGA-<número>]` (verificado con múltiples números reales: 456, 185, 490, 455, 427, 430,
428) seguido de una línea en blanco.

**Dónde se resuelve:** `stripInternalDescriptionTags()` (`lib/2clics/metadata.ts`), invocada
dentro de `cleanMetaValue()` — el único punto donde CUALQUIER propiedad resuelve
`metadata.description`, antes de `adaptPublicProperty`/`adaptPublicDevelopment`. Cubre
`/propiedades/[id]`, `/desarrollos` y `/desarrollos/[slug]` a la vez porque los tres leen el mismo
`sourceProperty.description` ya saneado — no se sanea por página, se sanea en el origen del dato.
No se tocó la respuesta cruda de 2Clics ni `PropertyDescription.tsx`/`PropertyDetailView.tsx`.

**Patrón deliberadamente estrecho** (`/\[FABIANAGA-\d+\]/g`) — nunca "borrar todo lo que esté entre
corchetes". Texto legítimo con corchetes (ej. "[año 2020]") se conserva. Si en el futuro aparece
una variante confirmada del mismo identificador con otro prefijo, agregar con evidencia real, no
por sospecha — mismo criterio que `INTERNAL_KEY_FRAGMENTS` (blocklist de `meta_data`) ya usa.

## `/desarrollos` y `/desarrollos/faena` — landing editorial compacta (2026-08, undécima pasada)

Corrección sobre la décima pasada (arriba): la card de Faena en el índice quedó demasiado grande,
y la landing de proyecto seguía sintiéndose como una ficha inmobiliaria larga y fragmentada (hero
de 60vh + cajas `.twoclics-detail-panel` apiladas). Referencia usada solo para arquitectura de
información/jerarquía (páginas de desarrollos con fuerte protagonismo fotográfico) — sin copiar
diseño, colores, componentes ni layout de ningún sitio de referencia.

**`/desarrollos` — card del tamaño de una card de catálogo:** sin contador "N proyecto(s)". La
grilla pasó de una clase propia (`.development-grid`, 2 columnas) a reutilizar directamente
`.twoclics-grid` (mismo sistema de 3 columnas/densidad que Comprar/Alquilar/`/propiedades`) — con
un único proyecto, la card ocupa una celda normal, nunca se estira. `CuratedDevelopmentCard`
reducida a la huella visual de una card de catálogo (imagen `1.62/1`, body 14-16px, H3 1.18rem).

**`/desarrollos/faena` — de "ficha con otro template" a landing editorial:**

- **Hero full-width de 60vh retirado** (`.project-hero*`, novena pasada) — sin reemplazo
  equivalente en tamaño. Nueva `.project-intro`: introducción compacta sobre cream, dos columnas
  en desktop (texto + imagen real de portada). CTA principal invertido respecto a la novena
  pasada: ahora "Consultar proyecto" (→ `/contacto`) es el primario; "Ver propiedades disponibles"
  (→ ancla interna) pasa a secundario.
- **Introducción con adelanto real de la descripción**: un recorte por límite de palabra del mismo
  texto real que se muestra completo en "Sobre el proyecto" más abajo — nunca copy inventado, es
  la misma fuente en dos extensiones distintas (teaser + lectura completa).
- **Contenido editorial reutiliza `.twoclics-ficha-section`** (la misma clase ya aprobada en
  `PropertyDetailView.tsx` para secciones "sin caja" separadas por un divisor fino) en vez de
  `.twoclics-detail-panel` con borde/fondo propio — mismo lenguaje editorial que la ficha, CSS
  compartido sin duplicar ni tocar el archivo de la ficha.
- **"Datos del proyecto" eliminado**: con "Unidades disponibles: 1" como único dato, no
  justificaba una sección propia — la grilla de "Propiedades disponibles" ya lo comunica. Regla
  para el futuro: si el único dato disponible ya se ve en otra sección, no crear una caja solo
  para repetirlo.
- **Amenities — regla de umbral congelada**: 2+ amenities estructurados reales (`sourceProperty.amenities`,
  nunca inferidos del texto libre) → sección propia "Amenities y servicios". Exactamente 1 → mención
  discreta junto a la ubicación, sin caja. 0 → nada. Menciones de amenities dentro de la
  descripción libre (ej. "marina", "club", "parque") NUNCA se convierten en chips — solo cuentan
  los datos que 2Clics entrega como `amenities` estructurados.
- **Mapa eliminado — alcance exclusivo de esta landing**: sin `PropertyMap`, sin embed de Google
  Maps, sin botón "Abrir en Google Maps" en `/desarrollos/faena` únicamente. La ubicación textual
  se mantiene. `/propiedades/[id]` y el resto de las fichas canónicas conservan su mapa intacto —
  el problema general de mapas del catálogo sigue siendo una tarea aparte, no resuelta acá.
- **Propiedades disponibles y CTA final**: mismo contenido/componentes/destino que la décima
  pasada, solo con padding vertical reducido (secciones `.project-units`/`.project-cta-final`) para
  la densidad general pedida.

## `/desarrollos` y `/desarrollos/faena` — landing 100% editorial (2026-08, duodécima pasada)

Reescritura sobre la undécima pasada (arriba): la introducción-en-caja + galería tradicional +
"Sobre el proyecto" en bloque único todavía se sentía "ficha inmobiliaria con otro template", no
una presentación de desarrollo. Referencia de **arquitectura de información y ritmo narrativo**
(páginas de desarrollo tipo Cervera/Domus: imagen protagonista, texto que se descubre mientras se
baja, imágenes grandes como parte de la narrativa) — nunca de diseño: sin copiar colores,
componentes ni layout exacto de ningún sitio de referencia. Identidad visual García intacta
(Cormorant/Jost, navy/ivory/gold).

**Decisión rectora, explícita:** las landings de desarrollos son una capa editorial construida
sobre datos reales de propiedades curadas de 2Clics. No replican la UX de una ficha inmobiliaria
ni inventan estructura inmobiliaria que la fuente no provea.

**Nombre público real, no editorial inventado:** `curation.name` ("Proyecto Faena") era un nombre
editorial armado por la curaduría interna de este repo, no un dato de 2Clics. Se dejó de usar para
todo texto público (card, H1, `<title>`/OG, CTA de cierre) — el nombre correcto es
`sourceProperty.title`, resuelto en tiempo real desde la fuente. Para 187676, 2Clics devuelve
**"Faena Residences Miami"**; ese es el nombre que ahora se muestra en toda la superficie pública.
`curation.name` se conserva en `lib/site-curation.ts` únicamente como referencia administrativa
interna (mismo rol que `humanRef`), documentado con un comentario explícito de que ya no es dato
público.

**`/desarrollos` — card sin redundancia:** eyebrow "Proyecto"→"**Desarrollo**" (dejaba de tener
sentido mostrar "Proyecto" como eyebrow y después "Proyecto Faena" como título — quedaba
duplicado). Título = nombre real. CTA "Conocer proyecto →"→"**Conocer desarrollo →**". Sin cambios
de tamaño/huella — ya quedó al tamaño de una card de catálogo en la undécima pasada.

**`/desarrollos/faena` — de bloques apilados a narrativa editorial:**

- **Bloque de apertura** (`.project-open`): imagen real protagonista (portada) en composición
  50/50 con el copy — no el hero full-width de 60vh de la novena pasada, ni la introducción
  compacta pero aún "de ficha" de la undécima. Eyebrow "Desarrollo", H1 = nombre real, ubicación,
  mención discreta de amenity único (si aplica), primer párrafo real de la descripción, y un único
  CTA: "Consultar desarrollo".
- **Sin galería tradicional**: `PropertyGallery` (con thumbnails, contador "1/N", flechas) queda
  completamente retirado de esta landing. Las fotos reales pasan a ser bloques de imagen propios
  del scroll (`.project-editorial-image`, variantes `--full` sangrando a todo el ancho y `--wide`
  contenida con esquinas redondeadas) — cada imagen es una sección editorial, no un carrusel.
- **Selección de imágenes real y única** (`selectEditorialImages()` en `lib/desarrollos.ts`):
  nunca genera, descarga ni inventa una imagen. Descarta la portada y distribuye el resto
  espaciado a lo largo de TODO el array real de fotos (no las primeras N, que en 2Clics suelen
  venir agrupadas por ambiente/toma similar) — más variedad visual sin análisis perceptual. Si hay
  menos fotos reales que las pedidas, devuelve menos; nunca repite para rellenar.
- **Descripción real dividida, no reescrita** (`editorialDescriptionParagraphs()` en
  `lib/desarrollos.ts`): separa por los saltos de línea dobles que la propia fuente ya trae —
  nunca resume, nunca inventa oraciones, nunca reordena. Los saltos de línea simples dentro de un
  bloque (ej. una lista de amenities en texto, una por línea) se preservan tal cual vía
  `white-space: pre-line` — no se convierten en `<li>`/chips que no podamos validar como amenities
  oficiales. El primer párrafo acompaña la apertura; el resto se alterna con las imágenes
  editoriales, en el orden original de la fuente. Con Faena, tras la exclusión de abajo, sobreviven
  2 bloques reales (narrativa + lista de amenities en texto) — la landing es corta porque el
  contenido real disponible es corto, no porque se haya recortado arbitrariamente. Regla explícita
  del pedido: no crear una landing artificialmente larga inventando secciones.
- **Exclusión deliberada de precios/plazos — no silenciosa**: la descripción real de 187676
  también incluye una lista de precios por tipología ("1 Habitación desde U$D 1.300.000"...) y un
  cronograma de señas con fechas de obra estimadas ("DEPOSITOS Y FECHAS", "at top-off", "at
  closing", porcentajes). Es contenido real, no inventado — pero muestra precio/plazo/estado de
  obra como si fueran datos públicos confirmados, algo que las reglas de esta landing prohíben
  explícitamente. `editorialDescriptionParagraphs()` excluye esos bloques puntuales por patrón de
  contenido (no un filtro genérico de la descripción) — el resto del texto real se conserva
  intacto y en su orden original. Esta exclusión es una decisión de producto, documentada acá a
  propósito, no un recorte silencioso.
- **"Ver propiedades disponibles" eliminado** del bloque de apertura — ya no existe como CTA.
- **"Propiedades disponibles" — condicional, no artificial**: antes se mostraba siempre, aunque
  hoy Faena solo tenga un registro real (187676) y terminara mostrando una card de la misma
  propiedad que originó el desarrollo dentro de su propia landing — puramente redundante. Ahora
  solo se renderiza si `units.length > 1` (más de un `propertyId` real asociado en
  `curation.propertyIds`). Con Faena hoy, la sección no aparece. El día que existan unidades reales
  independientes asociadas al desarrollo, la sección vuelve a aparecer sin tocar este componente —
  la arquitectura queda lista, no se muestra nada artificial mientras tanto.
- **Amenities — mismo umbral que la undécima pasada, sin cambios**: 2+ reales → sección propia; 1 →
  mención discreta sin caja (evita una caja "Amenities y servicios" para un solo chip); 0 → nada.
  Nunca inferidos de la descripción libre.
- **Mapa**: sigue eliminado, solo en esta landing (ya definido en la undécima pasada, sin cambios).
  **Superado en la vigesimotercera pasada**: Faena ganó una sección "Ubicación" con mapa —
  ver "Mapa de ubicación, reasons, para-quien y groups" más abajo.
- **"Consultar desarrollo" reutiliza el mecanismo ya aprobado, sin nueva integración**
  (texto del botón renombrado a "Consultar disponibilidad" en la vigesimotercera pasada, mismo
  mecanismo):
  `PropertyInquiryPanel` (`components/properties/PropertyInquiryPanel.tsx`) se usa sin
  modificación, con `propertyId={sourceProperty.propertyId}` — el mismo componente que
  `PropertyDetailView.tsx` ya usa para "Solicitar asesoramiento". La consulta se envía por
  `POST /api/lead/message` con `property_app_id` = 187676 (verificado vía
  `data-property-app-id="187676"` en el botón, tanto en la apertura como en el cierre). Nunca
  `/contacto`, nunca WhatsApp directo. No se confirma nada sobre notificaciones por email — eso no
  se verificó en esta pasada.
- Sin cambios: `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
  no modificado), saneamiento de `[FABIANAGA-*]`, integración base con 2Clics.

## `/invertir` y `/invertir/proyecto-especial-miami` — capa de curaduría propia (2026-08, decimocuarta pasada)

Reescritura completa. La landing anterior reutilizaba el layout de ficha inmobiliaria mostrando
los datos del registro técnico placeholder 206734 (título "Casa en venta en Miami", tipo "Casa",
1000 m2, U$D 100.000, 1 dormitorio) como si describieran la inversión — la oportunidad real es una
participación económica en el desarrollo de dos residencias waterfront en Coconut Grove, Miami, no
la compra de esa casa.

**Decisión rectora:** la oportunidad de inversión tiene una capa de curaduría propia
(`lib/investments.ts`), separada en tres capas: (1) datos objetivos de 2Clics — hoy solo
`propertyId`/`region`/`images`, usados exclusivamente como vínculo técnico para el lead y para las
fotos reales; (2) contenido editorial público aprobado — specs de los dos proyectos, developer,
riesgos, tesis, proceso, provisto directamente por García y curado acá, nunca extraído de
`sourceProperty.description`; (3) condiciones vigentes dinámicas — separadas del relato fijo,
listas para actualizarse sin tocar el componente.

**Por qué NO se extrae texto de `sourceProperty.description` (a diferencia de Faena):** la
descripción real de 206734 es copy de venta con promesas de rentabilidad explícitas ("Retorno
estimado... superior al 15% anual del capital invertido", "18 meses", "USD 100.000") — mostrar eso
como copy público violaría directamente la regla de no prometer rendimiento. En Faena la
descripción real ERA copy público utilizable; acá no lo es, así que la estrategia de extracción por
markers no aplica — la solución correcta es curaduría 100% explícita, no un extractor más
permisivo.

**Fuga de datos en el payload RSC — encontrada y corregida en esta misma pasada:** el componente
nunca renderizaba `sourceProperty.title`/`description`/`address`, pero pasar el `PublicProperty`
completo como prop igual los serializa en el payload que Next.js manda al navegador para hidratar
`PropertyInquiryPanel` (Client Component) — visible en "ver código fuente" aunque nunca se pinte en
pantalla. Verificado en vivo antes/después del fix (`curl` + grep sobre el HTML servido): "Casa en
venta en Miami" y el texto con la promesa de rentabilidad aparecían en el payload antes de acotar
la prop a `{ propertyId, region, images }`; cero apariciones después.

**Auditoría de imágenes reales (18 en 2Clics para 206734), mismo criterio que Faena:**
- Descartadas por copy promocional incrustado en el propio archivo de imagen: "100% RENTA PASIVA",
  "ALTA RENTA 100% PASIVA EN MIAMI", "INVERSIÓN MÍNIMA USD 100.000".
- Descartadas por pertenecer a una dirección completamente distinta impresa en la imagen misma:
  "1000 89 St, Surfside, FL"; "5345 SW 84th St, Miami, FL 33143"; "445 N Shore, Miami Beach, FL
  33141" — ninguna es Coconut Grove.
- Descartadas por no poder atribuirse con certeza a ninguna de las dos casas: dos imágenes muestran
  un edificio multi-unidad con balcones apilados, que no coincide con ninguna casa unifamiliar de
  6-7 dormitorios de las descriptas — regla explícita del pedido ("si no es posible atribuir una
  imagen con certeza, usar composición neutral... y explicarlo en el reporte").
- **Corrección de atribución de dirección vs. estilo arquitectónico:** dos imágenes traen la
  dirección real impresa (1710 y 1716 S. Bayshore Dr) y permitieron confirmar qué estilo
  corresponde a cada domicilio. El resultado contradijo el texto tipeado inicialmente en el pedido
  (que tenía Caribbean Colonial/contemporáneo invertidos entre las dos direcciones) — se preguntó
  explícitamente antes de publicar y se resolvió a favor de la evidencia de la imagen etiquetada
  (más confiable que un dato tipeado de memoria).
- Selección final: una foto de obra real sin texto para la apertura ("momento visual"), y una foto
  limpia por proyecto (sin repetir entre bloques, sin exceder la resolución nativa auditada de cada
  imagen — ninguna usa `sizes="100vw"`).

**Condiciones vigentes — nunca hardcodeadas en el relato:** `InvestmentCurrentConditions`
(`lib/investments.ts`) declara los campos pedidos (`status`/`availability`/`minimumInvestment`/
`estimatedHorizon`/`projectStage`/`lastUpdated`/`capitalRemaining`/`projectedReturn*`/`cta`). Hoy,
sin confirmación pública fechada, se muestran mensajes "Consultar" — nunca un monto/plazo/fecha
inventado. Si en el futuro se confirma un `projectedReturn`, debe mostrarse siempre etiquetado como
"Proyección del developer", nunca como resultado histórico/garantizado por García.

**CTA único:** `PropertyInquiryPanel` reutilizado sin modificar — mismo mecanismo aprobado que
`PropertyDetailView.tsx` y Faena, `property_app_id` = 206734, solo en el cierre de la landing (sin
CTA en la apertura, sin "Invertir ahora", nunca WhatsApp directo ni `/contacto`).

**`/invertir` (índice):** Hero reescrito. "Cómo analizamos cada oportunidad" (4 cards idénticas en
cajas blancas) reemplazado por "No todas las inversiones son iguales" + "Formas distintas de
participar en real estate" — grillas editoriales con divisores finos, sin cards ni bordes. La card
de la oportunidad pasó de `FeaturedSpotlight` (card boxeada, chica) a reutilizar `.project-open*`
(la misma apertura editorial de Faena) — pieza protagonista, sin ticket mínimo visible, toda la
pieza sigue siendo clickeable vía su CTA "Conocer la oportunidad".

**Sin cambios:** `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), integración base 2Clics, `/desarrollos`, `/desarrollos/faena`.

## `/invertir` y `/invertir/proyecto-especial-miami` — refuerzo educativo y compactación (2026-08, decimoquinta pasada)

Refinamiento sobre la decimocuarta pasada — dirección visual ya aprobada por la usuaria, esta
pasada no cambia el sistema visual, solo profundiza el contenido educativo y reordena/compacta la
ficha de la oportunidad.

**`/invertir` — de tres frases sueltas a contenido que realmente educa:**
- "Formas de participar" pasó de un párrafo genérico por alternativa a 2-3 puntos concretos reales
  por alternativa (Propiedad terminada / Unidad dentro de un desarrollo / Participación en un
  proyecto) — deliberadamente sin mencionar estructuras jurídicas específicas como regla general
  ("fondo" sigue prohibido) y sin afirmar que toda participación funciona igual.
- Nueva tabla comparativa ("Qué cambia entre una alternativa y otra"): 6 factores × 3 alternativas,
  resuelta con una tabla HTML real despojada de chrome corporativo (sin fondo de encabezado, solo
  divisores finos) en vez de cards — cumple el pedido explícito de "no crear una tabla corporativa
  pesada" sin renunciar a la semántica/accesibilidad de una tabla real.
- "Cómo analiza García" pasó de 4 a 6 factores, con un mensaje de cierre explícito ("no buscamos
  encajar a todos los clientes en una misma inversión") — nunca usa "Real estate con criterio" como
  slogan.
- **Card de la oportunidad reducida de escala**: la decimocuarta pasada la había hecho reutilizar
  `.project-open` completo — la misma huella visual que la apertura entera de una landing propia
  (Faena), demasiado protagonismo para una card dentro de un índice. Se reemplazó por clases nuevas
  y propias (`.invest-opportunity-*`): max-width 860px (similar orden de magnitud al usado
  históricamente para layouts de una columna), imagen 4/3 contenida (no la columna alta 6/5 de
  `.project-open-media`), menos padding, un solo CTA. Sin ticket mínimo, igual que antes.

**Ficha Coconut Grove — reorden para eliminar la ambigüedad 1710/1716:**
- "Los dos proyectos" se movió de después de "Coconut Grove" a justo después de "Qué es esta
  oportunidad" — el lector llega a la distinción entre las dos residencias mucho antes.
- Se agregó una oración explícita, nueva, antes de los dos bloques: "La oportunidad está vinculada
  a dos residencias waterfront diferentes, concebidas como productos independientes sobre terrenos
  contiguos en S. Bayshore Drive."
- Cada bloque de residencia se etiqueta ahora "Residencia 1 de 2"/"Residencia 2 de 2" (vía la
  clase `.eyebrow` ya existente, reutilizada) además de mostrar su propia dirección, su propia
  imagen (nunca la misma foto que la otra residencia) y su propia lista de datos — verificado con
  test dedicado que ninguna spec de una aparece dentro del bloque de la otra.
- Apertura y bloques de texto pasaron a variantes compactas EXCLUSIVAS de esta vista
  (`.project-open--compact`, `.project-editorial-text--tight`, `.invest-process-steps--compact`,
  todas nuevas en esta pasada) — la landing venía sintiéndose más larga/documento que Faena; se
  resuelve recortando aire vertical y adelantando contenido con imagen (los dos proyectos), sin
  tocar las reglas base `.project-open`/`.project-editorial-text` que Faena sigue usando sin
  modificador.
- "Para quién puede tener sentido": los encabezados de cada columna se reescribieron a tono de
  análisis en vez de veredicto de aptitud financiera — "Puede tener sentido analizarla para alguien
  que..." / "Probablemente convenga considerar otro tipo de alternativa para alguien que...". Los
  ítems de cada lista (fits/doesNotFit) no cambiaron, solo el encabezado que los enmarca.

**Estilo arquitectónico — retirado, no resuelto por memoria:** la decimocuarta pasada había
atribuido "Caribbean Colonial" a 1710 y "contemporáneo" a 1716 basándose en dos imágenes reales de
2Clics con el domicilio impreso en el propio archivo (idx 16 y 17). Esta pasada, la usuaria señaló
que esa atribución contradice una ficha estratégica/handoff de Olivia Harper Homes externa a la que
esta sesión no tiene acceso, y pidió auditar de nuevo sin resolver por memoria. Se re-descargaron y
re-revisaron esas dos imágenes (mismo resultado: 1710 muestra la fachada con postigos/columnas
estilo colonial, 1716 la fachada de hormigón/vidrio contemporánea) — pero, sin poder acceder a la
fuente estratégica que la usuaria menciona, no hay manera de confirmar cuál de las dos fuentes es
la correcta. Regla aplicada explícitamente del pedido ("es preferible publicar menos información
antes que publicar una atribución dudosa"): se quitó la línea de estilo arquitectónico de ambos
proyectos en `lib/investments.ts`. El resto de los datos por proyecto (superficies, ambientes,
dormitorios/baños, amenities) no está en disputa — viene del pedido original de García sin ninguna
contradicción señalada, y se mantiene sin cambios.

**Sin cambios:** `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), integración base 2Clics, `/desarrollos`, `/desarrollos/faena`.

## Desarrollos — clasificación editorial ampliada a 4 property_app_id (2026-08, decimosexta pasada)

Decisión de negocio confirmada (captura de CRM): además de Faena (187676), se clasificaron como
"desarrollo" **Icon Beach** (187677), **Flow House Miami Worldcenter** (187681) y **One Hollywood**
(187682). Un quinto id de la captura (FAB-187694) no se clasificó — ver más abajo.

**Auditoría real (read-only) antes de clasificar:**
- **187677 Icon Beach** — título real: "Oportunidad Unica En Hollywood. Muy Cerca De Las Playas."
  (aviso genérico, no es el nombre del proyecto). Departamento/Venta/Miami·Florida·US, 17 imágenes.
  La descripción real trae el nombre confirmado ("¡Bienvenido a ICON BEACH") junto con precios,
  cronograma de depósitos con fechas y datos de agente/matrícula — nada de eso es publicable.
- **187681 Flow House Miami Worldcenter** — título real: "Oportunidad Unica En Downtown Miami.
  Renta Garantizada 6 %" — **la promesa de rentabilidad está en el título mismo**, no solo en la
  descripción. Departamento/Venta/Miami·Florida·US, 21 imágenes. Descripción confirma "¡Bienvenido
  a Flow House Miami Worldcenter!" como nombre real.
- **187682 One Hollywood** — mismo título genérico que 187677 (coincidencia real). 13 imágenes.
  Descripción confirma "ONE HOLLYWOOD" como nombre real.
- **187694** — la External API devuelve "Not found" en AR y US, confirmado en vivo. Se buscó por
  texto en el catálogo completo y se encontró **187684** ("¡Bienvenido a PALMA Miami Beach!",
  dirección "Miami Beach Financiado A Estrenar Y Cerca Del Mar 600", `metadata.unit` = "Suitte
  Junior") — coincide fuertemente con el título de CRM esperado, pero queda **sin clasificar**: se
  reportó como candidato con evidencia, sin asumirlo, tal como se pidió explícitamente.

**Nombre público — por qué NO alcanza con `sourceProperty.title` acá (a diferencia de Faena):** el
título real de estos tres registros es un aviso de venta genérico o, peor, trae un claim de
rentabilidad no publicable directamente en el título. Mostrarlo como H1/card violaría la regla de
no presentar un dato deficiente de 2Clics como verdad editorial. Se agregó
`DevelopmentCuration.publicName: string | null` (`lib/site-curation.ts`) — el nombre real
confirmado por la captura de CRM, verificado además contra el saludo real de la propia
descripción de 2Clics (nunca inventado). Cuando existe, gana sobre `sourceProperty.title`; para
Faena queda `null` (sin cambio de comportamiento — su título real ya era válido).

**Exclusión de `/comprar` — mecanismo ya existente, sin código nuevo:** `app/comprar/page.tsx` ya
resolvía `excludePropertyIds` desde `getExcludedPropertyIds()` (capa de datos, antes de
renderizar, afecta también `propertyTotalCount`) — agregar los 3 ids a `CURATED_PROPERTIES` fue
suficiente. Verificado en vivo: ninguno aparece como card ni afecta los conteos.

**Generalización de la arquitectura de Faena:** `CuratedDevelopmentCard`/
`CuratedDevelopmentDetailView` ya eran genéricos (sin "Faena" hardcodeado) — no necesitaron
reescritura. El fallback "sin curaduría editorial propia" (existente desde la decimotercera
pasada) pasó de tener 0 consumidores reales a tener 3: apertura con imagen real, nombre público,
ubicación real, primer fragmento REAL de la descripción, y CTA único — sin inventar secciones
("El edificio"/"Residencias" siguen siendo específicas de la curaduría de Faena, nunca genéricas).
La curaduría editorial completa de cada desarrollo nuevo queda pendiente, uno por uno, en una
pasada futura — deliberadamente no completada por inferencia esta vez.

**Fuga de datos en el payload RSC — encontrada y corregida al generalizar:** con Faena, esto nunca
fue un problema visible porque su título/descripción reales siempre fueron seguros de mostrar. Al
generalizar a datos más crudos, se confirmó en vivo que pasar `PublicProperty` completo como prop
—aunque el JSX nunca renderice más que el nombre/ubicación/primer fragmento— deja el título y la
descripción CRUDOS (con la promesa de rentabilidad de Flow House, precios, datos de agente)
serializados en el HTML servido, visibles en "ver código fuente" aunque nunca se pinten. Mismo
mecanismo ya corregido para Invertir en la decimocuarta pasada. Fix en tres capas:
1. `CuratedDevelopmentCard`/`CuratedDevelopmentDetailView` reciben un `source` mínimo, nunca
   `PublicProperty` completo.
2. El título y la descripción seguros se resuelven ANTES de armar ese objeto —
   `app/desarrollos/page.tsx`/`app/desarrollos/[id]/page.tsx`, nunca dentro del componente. Nueva
   `resolveSafeDescription()` (`lib/desarrollos.ts`): con curaduría editorial propia (Faena), usa
   el texto íntegro ya aprobado; sin ella, reduce a la primera oración real.
3. La metadata SEO/OpenGraph usa la misma descripción segura — antes exponía la descripción cruda
   completa como `<meta name="description">` y OG description.

Verificado en vivo antes/después del fix: cero apariciones de "Renta Garantizada", precios o datos
de agente en el HTML servido de `/desarrollos` y de cada ficha individual tras el fix.

**Sin cambios:** `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado,
no modificado), ficha y contenido editorial de Faena, `/invertir`.

## Ficha editorial de Icon Beach (decimoséptima pasada)

Icon Beach (187677) pasó del fallback genérico (apertura + CTA, sin secciones propias) a una ficha
editorial completa — primer desarrollo, además de Faena, con curaduría propia en
`lib/desarrollos.ts`. Objetivo explícito: misma calidad/jerarquía/ritmo visual que Faena, sin
copiar sus secciones mecánicamente — la arquitectura de Icon Beach nace solo de información real
verificada para Icon Beach.

**Por qué no se pudo extraer el texto real (a diferencia de Faena):** la descripción cruda de
187677 mezcla saludo comercial, 350 unidades y tipologías, precio desde $900.000, cronograma de
depósitos (20% firma / 20% groundbreaking julio 2025) y nombre + matrícula de una agente — no es
copy editorial usable ni parcialmente. Se creó una segunda estrategia de contenido,
`curatedText`/`curatedList` (nuevas variantes de `SourceTextSegment`), para prosa/listas
editoriales ORIGINALES basadas en hechos verificados — nunca copiadas del CRM, nunca inventadas.
Vive en el mismo objeto de curaduría y fluye por el mismo pipeline de render que Faena
(`sections`/`renderSection`) — no hay una página aislada hardcodeada para Icon Beach.

**Verificación externa, priorizando fuentes oficiales (WebSearch + WebFetch):** developer Related
Group (asociado con BH Group), arquitectura CFE Architects, interiorismo Meyer Davis, paisajismo
Witkin Hults + Partners, ubicación real Hollywood Beach — no la Miami Beach genérica que sugiere el
bucket de ubicación de 2Clics. Cada hecho publicado está corroborado por ≥2 fuentes independientes,
salvo arquitecto/paisajista (única fuente, Commercial Observer). Dos contradicciones encontradas y
resueltas sin inventar: (1) una fuente atribuyó el proyecto a "Fortune and Dezer Development" contra
la propia página oficial de Related Group + 4 notas de prensa — se usó Related Group por peso de
evidencia; (2) 3 fuentes dieron 3 direcciones distintas (3660/3724/3824 S. Ocean Drive) — se omitió
cualquier número de calle específico, publicando solo la ubicación general corroborada. Un dominio
relacionado (`iconhollywoodbeach.com`) redirige a un agregador de brokers externo — descartado como
fuente, nunca tratado como oficial.

**Metodología P/S/D/C aplicada a cada dato del CRM:** ningún dato dinámico (precio, disponibilidad,
cronograma de pagos, "ventas desde 2024") se publicó sin fuente verificable independiente y
vigente. Sin esa verificación, se omitió — nunca se mostró "Consultar condiciones vigentes" como
relleno genérico, y nunca se convirtió en silencio un dato viejo de CRM en un dato "actual".

**Amenities — nuevo mecanismo opt-in, no automático:** `DevelopmentEditorialCuration.amenities`
(`lib/desarrollos.ts`) se activa explícitamente por desarrollo. Solo se muestra con 2+ amenities
reales **estructurados** de 2Clics (`source.amenities`, nunca inferidos de la descripción libre).
Faena no lo activa — su decisión previa de no mostrar amenities con un solo dato real queda
intacta, sin cambios de comportamiento.

**Auditoría de imágenes (17 imágenes, dimensiones nativas parseadas):** descartadas por contenido
no publicable: idx15 (eslogan comercial incrustado en los píxeles de la imagen, no solo un
watermark discreto) e idx16 (página completa de folleto, demasiado cargada de texto para usarse
como foto — sí se usó como fuente de datos verificables para el texto de "Ubicación", nunca
mostrada como imagen). Descartados por casi-duplicado: idx10≈idx3, idx9≈idx5. Selección final: 6
imágenes únicas, sin repetir (apertura, momento visual, ubicación, edificio, residencias,
amenities), cada una con `sizes` verificado por debajo de su resolución nativa real — mismo
criterio anti-borrosidad ya aplicado a Faena.

**Nombre público sin cambios:** sigue usando `publicName: 'Icon Beach'` (agregado en la
decimosexta pasada) — nunca el título crudo de 2Clics ("Oportunidad Unica En Hollywood...").

**Sin cambios:** `PropertyCard`, `PropertyDetailView.tsx`, `PropertyInquiryPanel.tsx` (reutilizado
sin modificar), ficha de Faena, `/invertir`, `/comprar`, `/alquilar`, Flow House, One Hollywood (no
avanzados esta pasada).

## Sistema editorial definitivo de Desarrollos (decimoctava pasada)

Auditoría transversal de las 4 fichas curadas (Faena, Icon Beach, Flow House Miami Worldcenter,
One Hollywood) y consolidación en un único sistema declarativo. Detalle completo — incluida la
auditoría de imágenes de Flow House/One Hollywood, la verificación de fuentes oficiales de cada
developer, la tabla P/S/D/C, y los dos bugs reales corregidos (fuga de RSC en Faena, heading
huérfano en Icon Beach) — en `docs/ai/PROJECT_STATE.md`, sección "Decimoctava pasada". Resumen de
reglas nuevas, aplicadas a las 4 fichas por igual:

- **Ningún heading sin contenido inmediato debajo** — corregido el bug que dejaba "Hollywood Beach
  y la ubicación" sin su párrafo.
- **"Project Snapshot"** editorial (developer/ubicación/unidades/pisos/tipologías/arquitectura),
  solo campos confirmados, sin cards ni iconografía — nuevo bloque reutilizable por cualquier ficha.
- **Listas de ≤3 ítems** usan una variante de una sola columna, evitando la celda huérfana de una
  grilla de 2 columnas con un ítem impar.
- **Aspect-ratio de imágenes** suavizado por defecto (`3/2`/`4/5` en vez de `5/3`/`3/4`), con
  override explícito por bloque para preservar el crop real ya aprobado (Faena lo usa).
- **"Permite mascotas" retirado de toda sección de amenities** — idéntico en los 4 desarrollos, no
  distingue a ninguno; filtro sistémico, no una excepción puntual.
- Cada desarrollo tiene solo las secciones que su material real sostiene — Flow House no tiene "El
  edificio" (sin foto de exterior limpia disponible), y eso es la decisión correcta, no un hueco.

## Developer fuera de lo público + rango de precio + "Interiores" (vigésima pasada)

Pasada transversal sobre las 4 fichas curadas. Detalle completo en `docs/ai/PROJECT_STATE.md`,
sección "Vigésima pasada". Resumen de reglas nuevas:

- **"Developer" no se muestra más** en ninguna ficha — decisión editorial, dato correcto pero
  retirado de la presentación pública. Arquitectura/interiorismo/paisajismo se mantienen.
- **"Rango de precio"** entra al snapshot como "Desde {moneda} {precio}", SIEMPRE calculado en
  runtime contra el precio estructurado real de 2Clics — nunca hardcodeado, nunca un rango con
  máximo inventado (2Clics no expone un campo de rango). Se omite si `hidePrice` o sin precio.
- **"Interiores"/"Interiores y residencias"**: bloque visual nuevo (1 a 4 imágenes), siempre el
  último antes del CTA. "...y residencias" solo cuando TODAS las imágenes son de una unidad real
  verificable; "Interiores" cuando alguna es un espacio compartido o no hay material de unidad.
  Nunca se rellena con imágenes de relleno — con menos material real, menos imágenes.

## Pacheco Central — primer desarrollo de Argentina (vigesimosegunda pasada)

Detalle completo en `docs/ai/PROJECT_STATE.md`, sección "Vigesimosegunda pasada". Primer caso real
donde el precio estructurado de 2Clics NO representa el "desde" del proyecto (es el precio de una
unidad puntual de 2 ambientes dentro de un desarrollo de 260 unidades) — se agregó el campo
obligatorio `priceRepresentsProjectRange` a `DevelopmentEditorialCuration` para que cada desarrollo
audite explícitamente esta distinción; Pacheco Central es el primero en `false`. Sin sección "El
edificio": el proyecto son 8 módulos alrededor de un parque central, no una única torre. Developer
(Soldati) identificado y documentado, nunca público — mismo criterio que los 4 de Miami.

## Estándar editorial nuevo — mapa, reasons, para-quien y groups (vigesimotercera pasada)

Pasada integral sobre las 5 fichas vigentes (Pacheco Central, Faena, Icon Beach, Flow House Miami
Worldcenter, One Hollywood). Objetivo: pasar de fichas "informativas" a presentaciones de
desarrollo más completas y atractivas, sin salirse del lenguaje/estética de García (sin badges, sin
urgencia comercial, sin frases vacías). Detalle completo en `docs/ai/PROJECT_STATE.md`, sección
"Vigesimotercera pasada". Reglas nuevas, aplicadas por igual a las 5:

- **Mapa de ubicación real, reutilizando `PropertyMap.tsx` sin tocarlo**: nuevo campo `map` en
  `DevelopmentSection` (`lib/desarrollos.ts`), renderizado en `CuratedDevelopmentDetailView.tsx`
  con las funciones puras ya aprobadas `googleMapsEmbedUrl`/`googleMapsSearchUrl` de
  `PropertyMap.tsx` — mismo componente que ya usa `PropertyDetailView.tsx`, sin duplicar lógica ni
  tocar ese archivo. **Nunca confiar a ciegas en `lat`/`long` del CRM**: se auditaron en vivo los 5
  registros y los 4 de Miami traen `lat: 0, long: 0` ("Null Island", un placeholder del CRM, no una
  coordenada real). Se agregó `hasSaneCoordinates()` (en `CuratedDevelopmentDetailView.tsx`) que
  rechaza (0,0) además de rangos fuera de [-90,90]/[-180,180] — cuando las coordenadas no son
  sanas, el mapa usa como query el texto de ubicación ya curado y muestra la nota "Ubicación
  aproximada" junto al iframe. Pacheco Central es el único de los 5 con coordenadas reales
  verificadas — su mapa las usa directamente, sin esa nota.
- **"Por qué considerar {nombre}"** (`layout: 'reasons'`, nuevo, reutilizable): 3-4 razones reales
  y concretas por desarrollo (ubicación/conectividad, tipologías, relación interior-exterior,
  amenities, escala, concepto arquitectónico, espacios verdes) — nunca inventadas, nunca frases
  vacías tipo "oportunidad única"/"imperdible"/"rentabilidad asegurada"/"la mejor inversión".
  Presente en las 5 fichas.
- **"Puede ser una alternativa para"** (bloque `text-only` nuevo, opcional): describe un perfil de
  comprador genuino cuando el material del proyecto lo sostiene — nunca genérico, nunca promete
  rentabilidad. Presente en las 5 fichas.
- **`groups` en `DevelopmentSection`** (nuevo, opcional): agrupación editorial de una lista cuando
  el material real la sostiene. Único caso hoy: Flow House agrupa "Vida en Flow House" en los 3
  ejes que la propia descripción de 2Clics ya trae con encabezado propio (Bienestar / Flujo de
  trabajo / Experiencia) — estructura real, no inventada. Las otras 4 fichas no usan `groups`.
- **`cardImageIndex`** (nuevo campo obligatorio en `DevelopmentEditorialCuration`): cada desarrollo
  elige qué imagen real es su portada en `/desarrollos`, en vez de asumir siempre `images[0]`.
  Corrigió un caso roto (Pacheco Central usaba un recorte vertical de 719×1600 como portada; ahora
  usa su misma imagen de hero, 1600×900) y mejoró dos portadas poco atractivas (Icon Beach y One
  Hollywood pasaron de un porte-cochère genérico a su hero real).
- **Copy del CTA renovada, sigue siendo uno solo por ficha**: bajada "Consultanos para conocer
  unidades disponibles, precios y condiciones vigentes de {nombre}." y botón "Consultar
  disponibilidad" — mismo `PropertyInquiryPanel`, mismo mecanismo, mismo `property_app_id` que ya
  estaba aprobado; solo cambió el texto.
- **No se agregó** una sección de "Información comercial" con fecha de vigencia — ninguna de las 5
  fichas tiene hoy una fuente de precio/disponibilidad lo bastante actual y verificable como para
  publicarla sin que quede desactualizada en poco tiempo. Queda documentado como pendiente, no como
  implementado.
- Sin cambios de UX ya aprobados en pasadas anteriores: snapshot, "Interiores"/"Interiores y
  residencias", retiro de "Developer", CTA único, exclusión de `/comprar`.

## Domus Brickell Center — sexto desarrollo, ficha más profunda sin plantilla distinta (vigesimocuarta pasada)

Pedido explícito: Domus necesita más profundidad editorial que los 5 desarrollos anteriores (su
producto combina real estate + hospitality y requiere explicación adicional), pero **sin una
plantilla visual distinta** — mismo sistema `DevelopmentSection`/`CuratedDevelopmentDetailView`,
mismo lenguaje Cream/Navy/Gold + Cormorant/Jost. Detalle completo (identificación, auditoría de
imágenes, hallazgo del precio oculto) en `docs/ai/PROJECT_STATE.md`, sección "Vigesimocuarta
pasada". Decisiones de UX nuevas, reutilizables para futuros desarrollos:

- **CTA/modal contextual opt-in**: un desarrollo puede declarar `ctaTitle`/`ctaSubtitle`/
  `ctaLabel`/`ctaModalTitle`/`ctaInitialMessage` cuando su producto necesita un encuadre distinto
  ("evaluar" en vez de "consultar disponibilidad") — sin declararlos, el CTA genérico ya aprobado
  queda exactamente igual. Sigue siendo UN solo CTA por ficha, mismo `PropertyInquiryPanel`, mismo
  mecanismo de envío.
- **"Información comercial"**: primera vez que se implementa esta sección (las 5 fichas anteriores
  la evaluaron y la descartaron por falta de fuente vigente) — para Domus es viable porque no
  necesita ningún monto real: solo "Precio: consultar." / "Disponibilidad: consultar información
  vigente.", preparada para datos reales futuros sin inventar nada hoy.
- **Mapa con dirección exacta sin lat/long**: nuevo campo `addressIsExact` — cuando la dirección
  curada es una calle y número confirmados (no solo barrio/ciudad), la nota pasa de "Ubicación
  aproximada" a "Dirección confirmada". Las 5 fichas anteriores no lo declaran y conservan "Ubicación
  aproximada" sin cambios.
- **Secciones nuevas de límites/transparencia**: "Puede no tener sentido si" y "Antes de avanzar,
  hay preguntas que conviene responder" — mismo tono sobrio que "Puede ser una alternativa para",
  mostrando los límites del producto en vez de solo sus argumentos a favor. Reutilizan el layout
  `text-only` existente, sin componente nuevo.
- **"Domus Brickell Park, un antecedente construido"**: sección que usa un proyecto hermano ya
  construido como evidencia de que el concepto funciona, con una aclaración explícita y breve de
  que eso no implica los mismos resultados económicos para Brickell Center — sin bloque legal
  sobredimensionado.
- **Hallazgo de seguridad real, corregido para todas las fichas**: el precio estructurado crudo
  viajaba en el payload RSC incluso con `hidePrice: true` (el JSX nunca lo pintaba, pero el número
  seguía en "ver código fuente"). Corregido en `app/desarrollos/[id]/page.tsx` — el precio se
  anula a `null` antes de convertirse en prop cuando `hidePrice` es true. Sin impacto visual en
  ninguna de las 5 fichas anteriores (ninguna tiene `hidePrice` real hoy).
- **Developer sigue sin mostrarse** (mismo criterio ya aprobado) — Management (North Management)
  se menciona solo en copy editorial contextual, nunca en el snapshot.

## Domus Brickell Center — "Estructura de ingreso" (vigesimosexta pasada, supera la vigesimocuarta)

El `hidePrice` real de 236682 cambió a `false` y García aprobó, junto con Fabiana, comunicar
públicamente un monto de ingreso (157.500 U$D = 30% de una unidad de referencia de 525.000 U$D,
calendario 10/5/5/10) — **esto reemplaza** la decisión anterior de "Precio: consultar" como única
información comercial. Detalle completo, semántica D/C y auditoría en `docs/ai/PROJECT_STATE.md`,
sección "Vigesimosexta pasada".

- **Un solo bloque de información, nunca separada**: el monto y su aclaración ("30% de una unidad
  de...") están en el mismo párrafo/unidad visual — nunca un número grande suelto sin contexto a
  la vista, nunca el contexto escondido en un disclaimer al final o en un tooltip.
- **Posición**: Hero → Snapshot → "Estructura de ingreso" → resto de la experiencia editorial. El
  hero sigue sin precio — sigue siendo editorial, no una placa de oferta.
- **Diseño deliberadamente no-promocional**: mismo cream/navy/gold de siempre, sin card ni sombra,
  un filete dorado fino como único acento — el calendario de depósitos se lee como una grilla
  editorial de 4 pasos (2×2 en mobile), no como un banner de performance marketing.
- **El snapshot sigue sin mostrar el monto** bajo una etiqueta genérica de precio — eso llevaría a
  leerlo como precio total del proyecto, que no es lo que representa.

## Mapa futuro del catálogo (NO implementado)

Existe la idea de una vista `MAPA | LISTADO` para `/propiedades` (20/21 propiedades auditadas
tienen lat/long). No implementar sin pedido explícito — requeriría Google Maps JS API / Mapbox /
Leaflet, distinto del embed simple que ya existe en la ficha individual.
