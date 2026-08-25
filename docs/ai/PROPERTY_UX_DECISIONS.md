# Property UX — decisiones aprobadas

Verificado contra código real (`components/properties/*`) el 2026-08-21. Estos bloques están
**aprobados y congelados**: no se modifican sin pedido explícito, aunque parezcan mejorables.

## Home (`app/page.tsx`)

Orden: Hero → Oportunidades seleccionadas → Servicios → Nosotros → Mercados → Por qué García →
Contacto → Newsletter → Footer.

- Hero: título "Real estate con visión estratégica.", CTA "Ver propiedades" → `/propiedades`.
- Oportunidades seleccionadas: consume `webListing = DESTACADO` (`FeaturedProperties.tsx` →
  `getFeaturedPublicProperties`). Snapshot auditado: 3 destacadas. Sección ya optimizada en 1920×800.

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

#### Título: reveal en hover/focus en Home, siempre visible en catálogo (2026-09-02)

Home y catálogo cumplen funciones distintas — Home muestra solo 3 destacadas y prioriza impacto
visual; el catálogo necesita escanearse rápido con muchas cards seguidas (título ausente por
defecto ahí generaba cards casi indistinguibles a simple vista, especialmente entre propiedades
con título/ubicación idénticos — ver nota sobre Oficinas repetidas más abajo). Se dividió el
`variant` de `PropertyCard.tsx` en `'overlay-home'` y `'overlay-catalog'` — mismo componente, sin
duplicar CSS; la diferencia se limita al comportamiento del `<h3>`, resuelta con una clase
adicional (`twoclics-card--overlay-catalog`) sobre el mismo `.twoclics-card--overlay` base.

- **Home (`overlay-home`, sin cambios respecto al ajuste anterior):** título oculto en reposo en
  desktop, aparece en `:hover`/`:focus-visible`/`:focus-within` (hasta 2 líneas,
  `-webkit-line-clamp: 2`). En mobile, siempre visible.
- **Catálogo (`overlay-catalog`, nuevo):** título **siempre visible** — 1 línea en reposo en
  desktop (`.twoclics-card--overlay-catalog h3`, `max-height` = 1 línea, fuente ligeramente más
  chica que Home, `1.05rem`), se expande hasta 2 líneas en hover/focus (`max-height` = 2 líneas,
  misma transición suave). En mobile, siempre visible hasta 2 líneas.

**Dos bugs reales encontrados implementando esto** (los tres corregidos, confirmados con
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
líneas en hover/focus sin comprimirse, confirmado con `scrollHeight === offsetHeight`). 212 tests,
typecheck/lint limpios, e2e de salud de Home y `/propiedades` sin errores de consola sobre build
de producción.

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

## Mapa futuro del catálogo (NO implementado)

Existe la idea de una vista `MAPA | LISTADO` para `/propiedades` (20/21 propiedades auditadas
tienen lat/long). No implementar sin pedido explícito — requeriría Google Maps JS API / Mapbox /
Leaflet, distinto del embed simple que ya existe en la ficha individual.
