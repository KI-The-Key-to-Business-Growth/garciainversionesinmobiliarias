# Changelog AI — decisiones técnicas/UX

Registro de decisiones, no de conversaciones completas. Formato: fecha · área · decisión ·
motivo · estado.

---

**2026-08-21 · Documentación** · Se crea la capa de memoria/documentación de Claude para el
proyecto (`CLAUDE.md`, `.claude/rules/*`, `docs/ai/*`) · Motivo: existía documentación histórica
(webhook, Supabase como inventario) que ya no reflejaba la arquitectura vigente, y los subagentes
del repo (`.claude/agents/*`) ya asumían un `CLAUDE.md` que no existía · Estado: hecho, solo
documental, sin cambios funcionales.

**2026-08-21 · Arquitectura** · Se confirma por auditoría de imports reales que el inventario
público (propiedades/desarrollos) migró completamente de webhook+Supabase a 2Clics External API
server-side · Motivo: cambio arquitectónico ya ejecutado en código, faltaba reflejarlo en
documentación · Estado: confirmado, documentado en `docs/ai/ARCHITECTURE.md`.

**Fecha no registrada (previa a esta auditoría) · Arquitectura** · Autenticación de 2Clics resuelta
con una única `TWOCLICS_API_KEY` + prefijo `AR-` generado server-side, en vez de credenciales
separadas por mercado · Motivo: se comprobó contra la API real que el prefijo `AR-` devuelve
inventario de Argentina y Miami por igual — no es una restricción geográfica · Estado: vigente,
overrides `TWOCLICS_AR_API_KEY`/`TWOCLICS_US_API_KEY` quedan como scaffolding sin usar.

**Fecha no registrada · Producto/UX** · Orden del catálogo: `webListing = DESTACADO` antes que
`SIMPLE` · Motivo: priorizar propiedades destacadas en la presentación pública · Estado: vigente,
implementado en `lib/2clics/listings.ts`.

**Fecha no registrada · Producto/UX** · Normalización de ubicación pública a
`Barrio · Ciudad · País/Estado` (ej. "Benavídez · Tigre · Argentina", "Miami · Florida · Estados
Unidos"), ocultando el `state` crudo de 2Clics ("Bs.As. G.B.A. Norte") · Motivo: presentación más
clara para el usuario final; se corrigió además un bug de encoding (`Â·`) · Estado: vigente.

**Fecha no registrada · Producto/UX** · Fichas de propiedad sin Header institucional · Motivo:
foco total en la propiedad, sin distracción de navegación global · Estado: vigente, aprobado.

**Fecha no registrada · Producto/Leads** · Consulta específica de una propiedad migrada a
`POST /api/lead/message` de la External API nueva, server-side, con modal en la misma ficha ·
Motivo: parte del mismo cambio arquitectónico que el inventario · Estado: vigente.

**Fecha no registrada · Producto/UX** · Galería con lightbox respetando aspect ratio original
(`object-fit: contain`) · Motivo: evitar recortes forzados dado que las fotos de 2Clics tienen
aspect ratios mixtos (portrait/landscape/square) · Estado: vigente.

**Fecha no registrada · Producto/UX** · Mapa embebido en ficha con prioridad
coordenadas → dirección publicable → barrio/ciudad/provincia → zona aproximada · Motivo: no
inventar ubicación cuando falta un dato más preciso · Estado: vigente.

**2026-08-21 · Deuda técnica** · El formulario de contacto general del Home sigue usando un flujo
de leads legacy (`lib/crm/leads.ts`, host `api.2clics.com.ar`, distinto de la External API nueva)
· Motivo: nunca se migró junto con el resto del inventario/leads · Estado: **pendiente de revisión
arquitectónica**, explícitamente no tratado como bug, no tocar sin pedido explícito.

**2026-08-21 · Producto/Datos** · Expensas con valor cero (`"0"`, `"0.0"`, `"0.00"`, vacío) se
omiten de la ficha en vez de mostrarse como "AR$ 0" · Motivo: 2Clics no distingue "expensas en
cero" de "dato no cargado", así que no hay señal suficiente para afirmar "Sin expensas" —
mostrar el cero como si fuera un valor real era engañoso · Estado: vigente,
`isZeroExpensesValue`/`formatExpenses` en `lib/2clics/format.ts`, regla específica de expensas
(no generalizada a otros montos).

**2026-08-21 · Producto/UX** · Pasada fina sobre la ficha desde Descripción hacia abajo (cuatro
ajustes puntuales, sin rediseñar la composición ya aprobada):
(1) Tipo de propiedad y Operación se sacan de Información básica — ya se comunican en el eyebrow
del hero, repetirlos era duplicación;
(2) Expensas > 0 pasa a ser una fila más de Información básica (antes tenía su propia sección
"Información adicional" para un solo dato, separado a lo ancho de toda la columna) — reutiliza
`formatExpenses`/`isZeroExpensesValue` tal cual, sin tocar esa lógica;
(3) "Información adicional" ahora solo renderiza si le queda contenido real (hoy: toilettes, tipo
de cochera); si no, no deja heading/wrapper/espacio vacío entre Amenities y Ubicación, y cuando sí
tiene datos usa una lista compacta en vez de estirarse a todo el ancho de la columna;
(4) Descripciones extensas usan progressive disclosure (`components/properties/PropertyDescription.tsx`):
clamp CSS de ~7-8 líneas desktop / ~6 mobile + botón real "Ver descripción completa ↓"/"Ver menos
↑" con `aria-expanded`, sin recortar ni reescribir el texto original de 2Clics, y el botón solo
aparece si el texto realmente se corta · Motivo: pedido explícito de limpieza de datos/lectura tras
la aprobación de la composición general · Estado: vigente.

**2026-08-21 · Producto/Datos** · Auditoría de Antigüedad vs. Año / construcción: se confirmó
contra las 21 propiedades reales que `building_date`→Estado y `building_date_number`→Antigüedad ya
son mutuamente excluyentes en la práctica (sin duplicación observada) y que Año/construcción
(`construction_date`/`fecha_construccion`) no tiene cobertura real hoy (0/21). Se agregó de todos
modos una salvaguarda: si hay Antigüedad, no se muestra Año/construcción (mismo hecho, dos
formas) · Motivo: pedido explícito de prevenir filas redundantes antes de que ocurran, sin inferir
ni calcular ningún valor nuevo · Estado: vigente. Se reconfirmó además que "Moneda de expensas" NO
se eliminó en la pasada anterior — sigue vigente como fallback (verificado en vivo con la
propiedad 206734: `Moneda de expensas → AR$`).

**2026-08-21 · Auditoría (sin implementación)** · Auditoría read-only completa de `/propiedades`:
estructura de filtros, cómo se pasan a 2Clics, comportamiento de searchParams/paginación,
inconsistencia real entre cómo se computan las opciones de Ubicación (faceted), Operación
(derivado del resultado filtrado) y Tipo (lista global sin facetar), cobertura real de cada filtro
candidato sobre las 21 propiedades, y hallazgo crítico de precio: Venta U$D (15 props,
U$D 18.000–1.300.000) y Alquiler U$D (3 props, U$D 620–1.600) están en la misma moneda pero en
escalas incompatibles; Alquiler además se reparte U$D/AR$ · Motivo: evaluar evolución de UX de
filtros sin convertir el catálogo en un portal saturado · Estado: informe entregado, aprobado por
el cliente, **Precio y "Más filtros" quedan explícitamente diferidos** a una fase posterior.

**2026-08-21 · Producto/UX (Fase 0 de la auditoría anterior)** · Tres mejoras de bajo riesgo sobre
`/propiedades`, sin tocar arquitectura server-driven ni agregar Precio/Más filtros/chips/sorting/mapa:
(1) filtros mobile compactados vía CSS grid — Ubicación ancho completo, Operación+Tipo en fila de
2 columnas, mismo `<form>` GET sin JS; bloque medido en vivo a 390×844 bajó de ~410px a
~204px (sin filtros) / ~242px (con filtro activo);
(2) "Limpiar filtros" pasa a ser condicional (`hasActiveFilters` computado en `PropertyFilters.tsx`
a partir del prop `filters`), y de botón grande a link secundario discreto;
(3) el `<select>` de Ubicación muestra labels públicos (reutiliza `formatPublicLocation`, ya usado
en cards/fichas) en vez del label técnico del CRM (`Bs.As. G.B.A. Norte` → agrupado bajo "Mercado"
como "Argentina"; ciudad como "Tigre · Argentina"; barrio como "Benavídez · Tigre · Argentina") —
el `value`/id técnico enviado a 2Clics no cambió, URLs existentes siguen funcionando
· Motivo: pedido explícito de reducir fricción mobile antes de sumar Precio/Más filtros · Estado:
vigente, verificado con datos reales (21 propiedades) y screenshots 390×844/1920×800.

**2026-08-21 · Producto/UX (Fase 1 — filtro Precio)** · Se implementó Precio como filtro principal
del catálogo, dependiente de Operación (y de Moneda cuando hay más de una), server-driven, sin JS:
(1) faceta de precio server-side (`fetchPriceFacet`/`priceFacetRequest`, mismo patrón que la
faceta de Ubicación de Fase 0) — respeta Operación/Ubicación/Tipo activos, ignora el propio rango
de precio, nunca manda la lista cruda al navegador, solo monedas disponibles + mín/máx derivados;
(2) `min_price`/`max_price` viajan **siempre como par** a 2Clics (`priceApiFilters`), nunca uno
solo — la auditoría real confirmó que la API ignora en silencio un valor suelto;
(3) `currency` viaja siempre junto al rango — sin ella la API compara precios de monedas distintas
como si fueran números comparables (confirmado con Alquiler U$D ~600-1.600 vs. AR$ ~2-2,8M);
(4) moneda se infiere sola cuando la operación tiene una única moneda real (Venta → U$D), se pide
explícita cuando tiene 2+ (Alquiler → U$D/AR$), y una moneda incompatible que quedó de una
operación anterior se descarta de forma segura sin mandar una combinación inválida a 2Clics;
(5) si el usuario completa un solo extremo (Desde o Hasta), el otro se completa con el extremo
real de la faceta antes de mandarlo a la API, pero el input sigue mostrando solo lo que el usuario
escribió — nunca el valor completado;
(6) mínimo > máximo se valida server-side dentro del mismo flujo GET: mensaje claro, valores
preservados tal cual, sin intercambiarlos ni mandar la consulta inválida, sin romper el resto del
catálogo;
(7) "por mes" sigue sin publicarse — no hay campo de periodicidad confirmado en 2Clics;
(8) DESTACADO→SIMPLE, paginación y "Limpiar filtros" siguen funcionando exactamente igual, ahora
también con Precio · Motivo: pedido explícito tras aprobar la microauditoría de precio (21
propiedades únicas reconciliadas: VENTA·U$D 14, ALQUILER_PERMANENTE·U$D 3, ALQUILER_PERMANENTE·AR$
4) · Estado: vigente, verificado con datos reales y screenshots en los 6+ estados combinables
(sin operación, Venta, Alquiler sin moneda, Alquiler U$D, Alquiler AR$, rango aplicado, rango
inválido) a 390×844 y 1920×800. Altura mobile del bloque de filtros con Precio: 256-401px según
estado, siempre por debajo de los ~410px que tenía Fase 0 sin Precio.

**2026-08-21 · Producto/UX (Fase 1.1 — pulido de Precio)** · Dos ajustes puntuales sobre lo ya
aprobado en Fase 1, sin tocar `fetchPriceFacet`/`resolvePriceFilter`/`priceApiFilters`/
searchParams/moneda-obligatoria/min-max-como-par/DESTACADO→SIMPLE/form GET:
(1) **Mobile — Precio compacto:** el caso más alto (Alquiler con moneda ya elegida: Moneda +
Desde + Hasta) bajó de 401px a 331px componiendo Moneda+Desde+Hasta en una sola fila de 3
columnas en ≤680px (`display: contents` sobre el wrapper de Desde/Hasta, sin duplicar DOM/inputs,
sin JS) — verificado legible con los montos más largos del inventario (AR$, 7 dígitos);
(2) **Contador estabilizado:** se probó contra la API real (no se asumió) que un bucket sin
coincidencias responde HTTP 200 + `{"status":"fail"}` sin `count`/`properties`/`description`, y
que esa forma nunca convive con un error real (los errores reales prueban HTTP 4xx + siempre
`description`, y ya los corta `lib/2clics/client.ts` antes). `propertyResponseCount()` normaliza
ese caso puntual a `count: 0, reliable: true`; el manejo de errores HTTP existente no se tocó.
Fallback adicional "Resultados filtrados" en vez de un heading vacío para cualquier caso residual
no cubierto · Motivo: pedido explícito de pulido tras aprobar Fase 1 · Estado: vigente — los 7
estados de Precio (A-G) muestran contador numérico real en las pruebas, ninguno cayó en el
fallback. Detalle completo de la semántica de `status:"fail"` en `docs/ai/2CLICS_EXTERNAL_API.md`.

**2026-08-21 · Producto/UX (Fase 2 — "Más filtros": Dormitorios/Ambientes/Apto crédito)** · Se
agrega un bloque "Más filtros" a `/propiedades` con Dormitorios, Ambientes y Apto crédito, con
verificación read-only contra la API real hecha ANTES de implementar (mismo criterio que Precio en
Fase 1):
(1) `amount_bedroom`/`amount_room` son match EXACTO — probado con 1/2/3/4 por separado y
contrastado contra el inventario completo, `amount_bedroom=1` excluye las propiedades con 2
dormitorios en vez de incluirlas ("N o más" habría sido una semántica fabricada, no real);
(2) `amount_bedroom=0`/`amount_room=0` son ignorados en silencio por la API (devuelve todo sin
filtrar) — por eso "0" nunca es una opción ofrecida ni se manda como filtro;
(3) `aptCredit` es match exacto por boolean (`true`→2 propiedades, `false`→19, sobre 21 auditadas);
(4) los tres combinan en AND entre sí y con operación/tipo/ubicación — verificado con combos reales
contra la API, incluyendo un caso de 0 resultados legítimo (`amount_bedroom=2 & aptCredit=true`);
(5) UI: `<details>/<summary>` nativo (`.twoclics-filter-more`), sin Client Component ni JS,
colapsado por defecto y abierto automáticamente cuando el GET ya trae alguno de los tres activos;
Dormitorios/Ambientes como `<select>` fijo `Todos|1|2|3|4` (sin "+", acorde al match exacto), Apto
crédito como checkbox real desmarcado por defecto;
(6) `dormitorios`/`ambientes`/`aptoCredito` se suman a `parsePropertyListingFilters`/
`nextPageHref`/`baseApiFilters` sin tocar Precio (`fetchPriceFacet`/`resolvePriceFilter`/
`priceApiFilters` intactos) ni DESTACADO→SIMPLE — los filtros nuevos recortan el universo dentro
de cada bucket, nunca cambian el orden comercial;
(7) "Limpiar filtros" se extiende para aparecer también con estos tres activos, "Ver más" los
preserva igual que Ubicación/Operación/Tipo/Precio · Motivo: pedido explícito, con instrucción
expresa de no asumir la semántica de `amount_bedroom`/`amount_room` por el nombre del campo sino
verificarla contra la API real antes de construir la UI · Estado: vigente, 173 tests (163 previos +
10 nuevos de Fase 2, más 3 casos adicionales agregados a un test ya existente de "Limpiar
filtros"), typecheck/lint limpios, verificado con screenshots reales en los 8 casos
(A-H) a 390×844 y 1920×800. Altura mobile del bloque de filtros: cerrado sin filtros ~289px (antes
de Fase 2, sin operación: 256px), abierto con un secundario activo ~450px, abierto junto con Precio
resuelto ~490px — ninguno reintroduce la banda permanente de ~410px que existía antes de Fase 0.
Detalle completo de la semántica confirmada en `docs/ai/2CLICS_EXTERNAL_API.md`.

**2026-08-21 · Producto/UX (pasada visual/UX chica sobre `/propiedades`)** · Tres ajustes puntuales
sobre lo ya aprobado en Fases 0-2, sin tocar `PriceFacet`/`resolvePriceFilter`/`priceApiFilters`/
`baseApiFilters`/parsing/searchParams/DESTACADO→SIMPLE/contador/paginación/Limpiar filtros:
(1) **Precio verificado end-to-end contra la API real, no había bug**: se probaron los 5 pasos
(sin operación, Venta con U$D inferido, rango real aplicado, Alquiler con selector de Moneda, U$D/
AR$ con Desde/Hasta) navegando `/propiedades` de verdad (Playwright con submit real del `<form>`).
Un caso pareció "0 resultados" (Alquiler+U$D+rango 718-1306) pero se confirmó contra la API que es
legítimo: las 3 propiedades reales de Alquiler U$D están en 620/1500/1600, ninguna cae en ese
rango — el `ListingState` de "sin resultados" ya aprobado en Fase 1.1 funcionó correctamente, no
es un bug;
(2) **Copy de Precio sin operación**: "Elegí una operación" → "Elegí Venta o Alquiler y aplicá" —
la usuaria lo había interpretado como que el filtro estaba roto; texto nuevo deja explícita la
secuencia (Operación → Aplicar → se habilita Precio) sin agregar párrafos ni tooltips;
(3) **Dormitorios/Ambientes: `<select>` nativo → segmented control de radios reales**
(`SegmentedFilterGroup`, `.twoclics-segmented`): un `<select>` con solo 5 opciones cortas igual
dispara el picker nativo a pantalla completa en mobile — ese chrome del navegador/SO no se puede
achicar de forma confiable con CSS, así que había que cambiar de control, no solo su estilo. Cada
grupo es un `role="radiogroup"` de 5 `<input type="radio">` reales (mismo `name`/valores que el
`<select>` anterior — ninguna URL con `?dormitorios=`/`?ambientes=` se rompe), radio oculto solo
visualmente (`clip`, nunca `display:none`) con `<label>` como superficie visible vía
`input:checked + label`/`input:focus-visible + label`. Verificado con Playwright: navegación por
flechas dentro del radiogroup mueve foco y selección (comportamiento nativo), labels asociados
programáticamente, outline de foco visible, ningún `<select>` ni popup nativo en mobile. Layout
mobile de "Más filtros" pasó de 2 columnas a apilado a ancho completo (los 5 segmentos necesitan el
ancho completo para no quedar apretados) — sube de ~450px a ~539px abierto con un secundario
activo, pero la altura **cerrada no cambió** (~289px mobile / ~190px desktop, medido antes/después)
· Motivo: feedback directo de la usuaria ("Precio no funciona" resultó ser un malentendido de
copy, no un bug) + necesidad de un control mobile-friendly para Dormitorios/Ambientes · Estado:
vigente, 175 tests (163 previos de Fases 0-1.1 + 10 de Fase 2 + 2 nuevos de esta pasada), 4 tests
de Fase 2 ajustados al nuevo markup (ya no esperan `<select id="dormitorios">`), typecheck/lint
limpios, verificado con screenshots reales a 390×844 y 1920×800 (Más filtros abierto sin
selección, Dormitorios activo, Ambientes activo, ambos activos, combinación con Precio).

**2026-08-24 · Producto/UX (pasada visual/estética — Precio un solo submit + segmented control
compacto)** · Dos ajustes sobre lo ya aprobado, sin tocar Ubicación/Tipo/PriceFacet (arquitectura)/
min-max-como-par/currency-obligatoria/contador/DESTACADO→SIMPLE/paginación/Más filtros
(funcionalmente)/cards/hero/fichas/Home/leads/Supabase/legacy/Amenities/sorting/mapa:
(1) **Precio — un solo submit:** antes, Precio quedaba oculto detrás de un texto hasta un primer
submit que solo fijaba Operación, obligando a un segundo submit recién para completar el rango.
Ahora Moneda/Desde/Hasta están siempre visibles (incluso con Operación="Todas"), así que
Operación+Precio se completan y aplican juntos en un único submit. Cambio mínimo de arquitectura,
autorizado explícitamente por el pedido ("adaptar la lógica de Precio en lo necesario para
permitir una búsqueda en un solo submit"): `fetchPriceFacet` ya no se salta cuando
`operation==='all'` — se pide siempre, y como `baseApiFilters` omite `operation_type` en ese caso,
la consulta devuelve la faceta GLOBAL (unión de monedas de todas las operaciones), dándole al
selector de Moneda opciones reales desde el primer render. `ResolvedPriceFilter` pasó de 4 a 5
estados (`no-operation`/`empty-facet`/`needs-currency`/`invalid-range`/`ready`, todos con
rawMin/rawMax preservados) con dos mensajes de validación nuevos: "Elegí Venta o Alquiler para
filtrar por precio." (precio cargado sin operación) y "Elegí una moneda para filtrar alquileres
por precio." (Alquiler + precio sin moneda) — ninguno de los dos manda un filtro ambiguo a 2Clics.
Verificado que Venta+rango y Alquiler+moneda+rango ya se resolvían dentro de la MISMA request
(`fetchPriceFacet`+`resolvePriceFilter` corren en el mismo `getPropertyCatalog`) — lo que faltaba
era que la UI mostrara los inputs a tiempo para que el usuario los completara antes del primer
submit, no una reescritura de la resolución en sí;
(2) **Precio — estética de filtro real:** columna de Precio ensanchada en `.twoclics-filters`
(`minmax(280px, 1.7fr)`, antes 1.3fr) y compuesta siempre como `Moneda | Desde | Hasta` en una
fila de 3 columnas (la técnica `display: contents` que Fase 1.1 usaba solo en mobile ahora es el
layout por defecto en desktop también) — deja de leerse como un texto informativo suelto y pasa a
tener la misma jerarquía visual que Ubicación/Operación/Tipo. Moneda default renombrado de "Elegí
moneda" a "Automática";
(3) **Segmented control (Dormitorios/Ambientes) — compactado:** la versión de Fase 2 (2026-08-21)
renderizaba 5 pills sueltas en un grid de 5 columnas iguales, ocupando todo el ancho disponible y
leyéndose como 5 botones separados. Se rediseñó como un único grupo visual (borde exterior común +
divisores internos finos + ancho intrínseco por segmento vía `inline-flex`, "Todos" un poco más
ancho que los dígitos por su propio contenido) y se bajó la altura de 38px a 32px. Se detectó y
corrigió en la misma pasada un problema de contraste de foco: el outline de `:focus-visible` era
navy sobre navy en el segmento activo+enfocado a la vez (invisible) — se agregó
`input:checked:focus-visible + label { outline-color: var(--white) }` para ese caso puntual,
verificado con Playwright leyendo el outline computado, no solo a simple vista;
(4) **"Más filtros" — layout:** `.twoclics-filter-more-grid` pasó de grid de 3 columnas iguales a
flex con gap generoso (más aire ENTRE Dormitorios/Ambientes/Apto crédito, menos aire desperdiciado
DENTRO de cada uno, ahora que el segmented control no fuerza el ancho de su columna). Apto crédito
recibió un spacer invisible del alto del `<legend>` de los otros grupos para alinear su fila de
control a la misma altura — antes se percibía suelto/desalineado. Mobile ya no necesita apilar
Dormitorios/Ambientes/Apto crédito a ancho completo (como en la versión 2026-08-21 para dar lugar
al grid de 5 columnas viejo) — el mismo flex-wrap de desktop ya alcanza con el control compacto ·
Motivo: pedido explícito, con instrucción de verificar Precio end-to-end antes de tocar nada (no
había bug real — confirmado contra la API real, ver turno anterior) y de no rediseñar el catálogo
completo · Estado: vigente, 184 tests (175 previos + 9 nuevos: 8 del flujo Precio un-solo-submit +
1 de semántica `needs-currency`/`no-operation` reforzada), typecheck/lint limpios, verificado con
screenshots reales a 390×844 y 1920×800 (estado inicial, Más filtros abierto, Dormitorios
seleccionado, Ambientes seleccionado, Venta+Precio aplicado en un submit, Alquiler+moneda+Precio
aplicado en un submit, validación sin Operación) y accesibilidad re-verificada con Playwright
(Tab, flechas del radiogroup, `label` asociado, contraste de foco en el segmento activo). Altura
mobile del bloque completo de filtros: sin operación (Precio ahora visible) 328px, con Venta+Precio
aplicado 366px, con validación sin Operación 392px, Más filtros abierto con Dormitorios activo
522px.

**2026-08-26 · Bug fix (Precio y Ubicación pierden el estado del usuario en combinaciones sin
inventario)** · Reportado por la usuaria: Ubicación=Estados Unidos + Operación=Alquiler +
Moneda=U$D + Hasta=300000 → 0 resultados y el bloque Precio reemplazado por "Sin datos de precio",
perdiendo moneda/rango. Investigación read-only contra la API real (antes de tocar código)
confirmó que el 0 era legítimo: Estados Unidos hoy no tiene NINGÚN Alquiler (sus 10 propiedades
son todas VENTA). El bug real: (1) **Precio** — `resolvePriceFilter` con faceta vacía
(`empty-facet`) descartaba `rawCurrency`/`rawMin`/`rawMax` del usuario y `PriceFilterGroup`
reemplazaba el fieldset entero por un texto — corregido para que `empty-facet` conserve los raw
values igual que los demás estados no resueltos, con un mensaje neutral ("No hay datos de precio
para esta combinación de filtros.") que solo aparece si NO hay nada que preservar; (2)
**Ubicación** — bug relacionado no reportado pero encontrado en la misma investigación:
`locationFacetRequest` armaba la lista de `<option>` del `<select>` de Ubicación respetando
Operación/Tipo/Dormitorios/Ambientes activos, así que si la ubicación elegida no tenía ninguna
propiedad matcheando el resto de los filtros, desaparecía de la lista y el `<select>` caía
silenciosamente a "Todas" (el navegador solo puede mostrar seleccionado un `value` que exista
entre sus `<option>`) aunque el filtro real (URL, lo que se manda a 2Clics) siguiera siendo el
correcto — corregido quitando ese recorte (`locationFacetRequest()` ya no toma filtros, siempre
devuelve el universo completo, mismo criterio que Operación/Tipo). Se agregó además una barrera
defensiva en ambos `<select>` (Ubicación y Moneda): si el valor activo no está entre las opciones
derivadas, se inyecta una `<option>` de respaldo para que nunca vuelvan a mentir visualmente ·
Motivo: bug real reproducido contra la API real y en browser (Playwright) antes de corregir, según
pedido explícito de no asumir que el 0 resultados fuera incorrecto · Estado: vigente, 190 tests
(184 previos + 6 nuevos de regresión), typecheck/lint limpios, verificado en vivo que
`/propiedades?ubicacion=state:31&operacion=alquiler&moneda=U%24D&precioMax=300000` ahora preserva
Ubicación="Estados Unidos", Operación="Alquiler", Moneda="U$D", Hasta="300000", todos editables,
con el catálogo mostrando el estado de 0 resultados correctamente debajo.

**2026-08-26 · Bug fix (Tipo de propiedad nunca filtraba correctamente — `property_type` requiere
appId, no typeId)** · Encontrado durante la QA integral del buscador pedida a continuación del fix
de Precio/Ubicación (no reportado por la usuaria, pero real, reproducible y de alto impacto):
cualquier selección de Tipo (Casa/Departamento/Oficina/Terreno·Lote) mostraba 0 resultados en vivo
sin ningún error visible. Confirmado contra la API real (read-only, antes de tocar código):
`property_type: 2` (el `typeId` numérico de "Casa", el mismo valor usado en `?tipo=2` y
`<option value={typeId}>` desde siempre) responde `HTTP 200 status:"fail"` — indistinguible de "0
resultados legítimos" — aunque existen 3 propiedades reales con ese typeId; `property_type:
"5791"` (el `appId` de Casa, mismo endpoint `/api/property-type`) responde `success` con las 3
correctas. Confirmado también con Departamento (`appId` "5785" → 12 resultados). Contrastado
explícitamente contra otros filtros "numéricos" (`state`/`city`/`neighborhood`/`amount_bedroom`/
`amount_room`), que sí funcionan con su id numérico normal — el comportamiento de `property_type`
es una excepción puntual de la API, no un patrón general. **Corregido** sin cambiar el contrato
público: `PropertyListingFilters.propertyTypeId`/`?tipo=`/`<option value={typeId}>`/
`catalogPropertyRequest()` siguen usando el typeId numérico sin ninguna modificación (cero riesgo
de romper URLs existentes o los ~14 tests que ya llamaban `catalogPropertyRequest` con un typeId
numérico) — la traducción a appId ocurre recién dentro de `getPropertyCatalog`, dos funciones
nuevas (`resolvePropertyTypeAppId`, que resuelve el mapeo con los tipos ya cargados, y
`withResolvedPropertyType`, que sustituye `property_type` justo antes de la llamada real a 2Clics
en los tres puntos que lo necesitan: faceta de precio, conteo de buckets DESTACADO/SIMPLE, y el
fetch final de propiedades). Los tipos de propiedad se pasaron a pedir ANTES que el resto de las
consultas del catálogo (antes se pedían en paralelo con conteos/desarrollos/faceta de ubicación,
ahora hace falta el mapeo typeId→appId primero) — pequeño costo de un round-trip adicional
secuencial, aceptable frente a corregir un filtro que nunca funcionó. Si no se puede resolver un
appId para el typeId activo, el filtro se omite en vez de mandar el typeId crudo (mismo criterio
que otros valores de filtro inválidos en el resto de la app) · Motivo: encontrado y corregido
dentro de la QA integral pedida explícitamente ("SI encontrás un bug REAL, corregilo en la misma
tarea") · Estado: vigente, 195 tests (190 previos + 5 nuevos de regresión), typecheck/lint
limpios, verificado en vivo contra la API real y en browser: Tipo=Casa → 3 resultados,
Departamento → 12, Oficina → 4, Terreno/Lote → 2 (coincide exactamente con el inventario
auditado). Esto también corrigió dos combinaciones de la QA integral que antes mostraban 0
resultados por este motivo: Estados Unidos+Venta+Departamento+U$D+200.000-500.000 → ahora 5
resultados; Argentina+Venta+Casa+Dormitorios=2+Ambientes=3 → ahora 2 resultados. Detalle técnico
completo del comportamiento de la API en `docs/ai/2CLICS_EXTERNAL_API.md`.

**2026-08-26 · Bug fix ("Limpiar filtros" no reseteaba visualmente los controles del buscador)** ·
Reportado por la usuaria: Operación→Venta (o Alquiler) → Aplicar → Limpiar filtros dejaba
resultados/contador/URL correctamente en el estado inicial, pero el `<select>` de Operación seguía
mostrando "Venta"/"Alquiler". Reproducido con Playwright usando clicks reales (no navegación
directa por URL, que no reproduce el bug) antes de tocar código. Causa confirmada: "Limpiar
filtros" es un `<Link>` de Next.js → navegación CLIENTE (soft nav) — a diferencia de "Aplicar
filtros" (submit nativo de un `<form method="get">`, recarga el documento entero). En una soft
nav, React reconcilia el `<form>` como "el mismo" elemento y reutiliza su DOM, pero
`defaultValue`/`defaultChecked` (los 8 controles no controlados del formulario: Ubicación,
Operación, Tipo, Moneda, Desde, Hasta, Dormitorios, Ambientes, Apto crédito) solo se aplican en el
montaje inicial, nunca de nuevo en un re-render — un gotcha conocido de React con navegación
client-side. La fuente de verdad (searchParams → `filters`) siempre fue correcta; la reconciliación
de React era lo que no se enteraba. **Corregido** con una `key` derivada de los valores de
`filters` en el `<form>` (`PropertyFilters.tsx`) — cuando cambia, React desmonta y remonta todo el
subárbol, forzando a `defaultValue`/`defaultChecked` a aplicarse frescos. Sin `useState`, sin
Client Component nuevo, sin lógica manual de borrado campo por campo — la ausencia de searchParams
ya alcanza. Arquitectura sin cambios: sigue siendo Server Components + form GET + URLs como fuente
de verdad · Motivo: bug real reproducido en browser antes de corregir, según pedido explícito ·
Estado: vigente, 195 tests (sin cambios en el unit suite — el bug es de reconciliación cliente, no
testeable con `renderToStaticMarkup`) + nuevo spec e2e formal `e2e/filters-reset.spec.ts` (3 tests,
`npm run test:e2e` sobre build de producción) verificando el flujo real de click Venta/Alquiler →
Aplicar → Limpiar, y un tercer test que fija los 8 controles a la vez y confirma que todos
resetean. Verificado 1920×800 y 390×844.

**2026-08-26 · Producto/UX (cards del catálogo — jerarquía visual + facts por tipo)** · Mejora de
jerarquía y utilidad de las cards de `/propiedades` sin volverlas una ficha técnica. Auditoría
read-only previa confirmó cobertura real (21 propiedades): amountRoom/amountBedroom/totalArea/
coveredArea/baños/cocheras 19/21 (Terreno/Lote, 2/21, es la única ausencia real y es coherente con
el tipo). Durante la auditoría se encontró y corrigió un bug real que bloqueaba baños/cocheras en
las cards: ver entrada de `meta_data` metaKey/metaId más abajo — sin ese fix, `formatCount` nunca
tenía datos para trabajar. Cambios: (1) **Precio** con un poco más de jerarquía visual
(`.twoclics-catalog-section .twoclics-card-price` 0.92rem → 1.05rem, sigue claramente menor que el
título de 1.26rem — no se volvió "enorme"); (2) **Facts** ahora incluyen Baños/Cocheras cuando
existen, con el mismo criterio de la ficha (`essentialFacts` en `PropertyDetailView.tsx`) extraído
a helpers compartidos en `lib/2clics/format.ts` (`formatCount`, `isLandPropertyType`,
`isOfficePropertyType`) para que card y ficha nunca se contradigan: Residencial → Ambientes/
Dormitorios/Baños/Cocheras/Superficie (lo que exista); Oficina → Ambientes/Baños/Cocheras/
Superficie, **nunca Dormitorios** (el inventario real tiene `amountBedroom: 1` en las 4 Oficinas
auditadas — un dato residual del CRM, no un dormitorio real); Terreno/Lote → solo Superficie
total. Un valor `<= 0` nunca se muestra ("0 dorm."/"0 baños"/etc. ya se descartaban antes para
ambientes/dormitorios; ahora el mismo criterio cubre baños/cocheras). Singular/plural correcto
("1 baño"/"2 baños", "1 cochera"/"2 cocheras"). Jerarquía/estructura de la card (Tipo eyebrow →
Título → Ubicación → Precio → facts → CTA) no cambió — ya estaba en ese orden · Motivo: pedido
explícito, con instrucción de auditar cobertura real antes de implementar y frenar solo ante una
ambigüedad real de datos (no se encontró ninguna — el metaKey/metaId invertido era un bug
concreto y corregible, no una ambigüedad) · Estado: vigente, 200 tests (195 previos + 5 de card
facts + 1 de adapter para el fix de metaKey/metaId agregado en `tests/2clics/adapters.test.ts`),
typecheck/lint limpios, verificado en vivo con datos reales para los 4 tipos auditados (Casa,
Departamento, Oficina, Terreno/Lote) a 1920×800 y 390×844 — ninguna card superó 5 facts, ninguna
mostró un cero, ninguna Oficina mostró dormitorios, ningún Terreno mostró nada más que superficie.

**2026-08-26 · Bug fix (`meta_data`: `metaKey`/`metaId` invertidos entre endpoints de 2Clics)** ·
Encontrado auditando cobertura de facts para las cards (ver entrada de arriba). El endpoint de
detalle (`GET /api/property/{id}`, ficha) devuelve `metaKey`=nombre semántico + `metaId`=id
numérico; el endpoint de listado (`POST /api/property`, catálogo/cards) devuelve exactamente al
revés. `lib/2clics/metadata.ts` históricamente solo miraba `metaKey` — correcto para la ficha, pero
dejaba `metadata.bathrooms`/`metadata.garages`/`metadata.title`/etc. vacíos para toda propiedad
proveniente del catálogo. **Corregido** con `resolveMetaRawKey`: primero intenta matchear cada
campo contra la whitelist/blocklist conocida; si ninguno matchea (campo nuevo, no soportado
todavía), usa una señal estructural — el id interno siempre es puramente numérico en ambos
endpoints, el nombre semántico no — así generaliza sin depender de agregar cada campo nuevo a las
listas · Estado: vigente, test de regresión agregado en `tests/2clics/adapters.test.ts`
reproduciendo el shape invertido del endpoint de listado. Detalle completo en
`docs/ai/2CLICS_EXTERNAL_API.md`.

**2026-08-27 · Producto/UX (Tipo de propiedad dinámico en `/propiedades`)** · El selector "Tipo de
propiedad" dejó de salir de `GET /api/property-type` (catálogo general de la cuenta, incluye tipos
sin inventario público real) y ahora se deriva del inventario público real vía
`buildAvailablePropertyTypes()` (`lib/2clics/listings.ts`), reutilizando la misma faceta
"inventario completo sin scoping" que ya alimenta a Ubicación — cero requests adicionales, de hecho
una llamada menos que antes. Un tipo aparece/desaparece automáticamente según tenga o no al menos
una propiedad publicada, sin cambios de código. Se agregó el mismo comportamiento defensivo que
Ubicación: si el `?tipo=` de la URL ya no tiene inventario público, el `<select>` no cae
silenciosamente en "Todos" — inyecta una opción "Tipo seleccionado" para no mentir sobre el filtro
activo · Motivo: pedido explícito, evitar ofrecer tipos sin resultados reales (ej. PH si la cuenta
lo tiene configurado pero nunca se publicó) · Estado: vigente, verificado en vivo — hoy devuelve
exactamente Casa/Departamento/Oficina/Terreno·Lote. 205 tests (200 previos + 5 nuevos), typecheck/
lint limpios, e2e `filters-reset.spec.ts` (3 tests) revalidado sobre build de producción. Detalle
en `docs/ai/2CLICS_EXTERNAL_API.md`.

**2026-08-27 · Producto/UX (card overlay en `/propiedades` — VARIANTE EN EVALUACIÓN, no definitiva)**
· Prueba visual de una composición con la info principal (Tipo/Título/Ubicación/Precio/facts)
superpuesta sobre la foto en vez de en un bloque blanco debajo, con degradé sutil inferior e info
integrada a la foto — idea inspirada en portales tipo Cervera (solo la idea de foto protagonista +
info superpuesta, no su diseño). Implementado como `variant="overlay"` en `PropertyCard.tsx`
(`.twoclics-card--overlay`, `app/globals.css`), sin tocar los adapters/facts/lógica por tipo, que
siguen siendo exactamente los mismos que la card default. Solo en uso en `/propiedades` — Home
(`FeaturedProperties.tsx`) y la ficha (relacionadas, `PropertyDetailView.tsx`) siguen con la card
default sin cambios · Motivo: pedido explícito, prueba visual, no decisión de marca todavía ·
Estado: **en evaluación, no aprobado como definitivo** — ver
`docs/ai/PROPERTY_UX_DECISIONS.md` ("Card overlay — variante en evaluación"). Verificado con datos
reales a 1920×800 y 390×844 para Casa Miami, Casa Benavídez (interior muy claro), Departamento,
Oficina y Terreno/Lote. 209 tests (204 previos + 5 nuevos), typecheck/lint limpios, e2e de salud de
`/propiedades` sin errores de consola sobre build de producción.

**2026-08-28 · Producto/UX (card overlay: APROBADA + extendida al Home + legibilidad)** · La
variante overlay del turno anterior queda **aprobada como definitiva** tras revisión manual en
desktop y mobile, y se extiende a Home ("Oportunidades seleccionadas",
`FeaturedProperties.tsx`, `variant="overlay"`) — mismo componente `PropertyCard` y el mismo
`variant`, sin CSS ni card duplicada para Home. Se agregó además un `text-shadow` muy sutil
(`0 1px 3px rgba(0, 0, 0, 0.55)` en título/ubicación/precio/facts/CTA; `0 1px 2px rgba(0, 0, 0,
0.4)` en el eyebrow) para reforzar la legibilidad en fotos difíciles (vegetación detallada,
interiores muy claros, aéreas) sin oscurecer más el degradé ni generar glow — el degradé de base no
se tocó. La card default sigue en uso únicamente en la ficha (relacionadas,
`PropertyDetailView.tsx`) — no se tocó, queda pendiente de revisión específica en una tarea futura
· Motivo: pedido explícito, aprobación manual del usuario tras revisar la variante en ambos
contextos · Estado: **vigente, aprobada**. Verificado con datos reales a 1920×800 y 390×844 en Home
y catálogo (Casa Miami, Casa Benavídez, Terreno Delta, Departamento, Oficina). 211 tests (209
previos + 2 nuevos de wiring Home/catálogo), typecheck/lint limpios, e2e de salud de Home y
`/propiedades` sin errores de consola sobre build de producción. Detalle completo en
`docs/ai/PROPERTY_UX_DECISIONS.md` ("Card overlay — aprobada para catálogo y oportunidades
seleccionadas del Home").

**2026-08-29 · Producto/UX (card overlay: legibilidad resuelta estructuralmente)** · El
`text-shadow` del ajuste anterior no alcanzaba en fotos muy claras (fachada + vegetación, interior
blanco, aérea) — el texto podía arrancar sobre una zona del degradé casi sin oscurecer. Solución
estructural, no caso por caso: (1) `.twoclics-card-overlay-info` ahora ocupa siempre el 50%
inferior de la card (`top: 50%`) con el contenido alineado contra el borde inferior
(`justify-content: flex-end`), en vez de una altura que dependía del contenido; (2)
`.twoclics-card-gradient` pasó de 4 a 5 paradas, más robusto y progresivo (limpio arriba de ~68%,
opacidad 0.52→0.92 desde el 35% hacia abajo) para que el 50% inferior siempre caiga sobre contraste
garantizado, sin importar la foto; (3) el `text-shadow` se mantuvo sin aumentar — pasó a ser apoyo,
no la base del contraste. Sin blur ni glassmorphism. Sin cambios de markup/adapters/facts/filtros —
solo CSS · Motivo: pedido explícito tras QA manual detectando que la legibilidad seguía dependiendo
de la foto de fondo · Estado: vigente. Verificado con datos reales a 1920×800 y 390×844 en Home y
catálogo (Casa Miami, Casa Benavídez, Terreno Delta, un plano de desarrollo, Departamento, Oficina)
— misma legibilidad en todos los casos sin ajustes por caso. 211 tests (sin cambios, no se tocó
markup), typecheck/lint limpios, e2e sobre build de producción sin errores de consola.

**2026-08-30 · Producto/UX (eyebrow de tipo en overlay: texto blanco + acento lineal dorado)** ·
El scrim + zona de lectura resolvió título/ubicación/precio/facts/CTA, pero el eyebrow
(CASA/DEPARTAMENTO/OFICINA/TERRENO · LOTE), en dorado García sólido, seguía perdiendo contraste en
fotos muy claras (cielo, agua, vegetación, interiores claros) — y no tenía margen para más
`text-shadow` sin verse pesado. Se cambió el texto a blanco/off-white
(`rgba(255, 255, 255, 0.94)`) y el dorado García quedó como acento: una línea corta y fina
(`14px × 2px`) antes del texto vía `::before` (`.twoclics-card--overlay .twoclics-card-meta`), sin
agregar elementos al DOM ni pill/badge/caja/fondo/borde. No se tocó el scrim, la zona de lectura del
50% inferior, el `aspect-ratio` ni el resto de los textos · Motivo: pedido explícito tras QA manual
· Estado: vigente. Verificado en Home y catálogo (mismo `variant="overlay"` compartido) para Casa
Miami, Casa Benavídez, Terreno Delta, Departamento (agua/cielo, interior claro) y Oficina a
1920×800 y 390×844. 211 tests (sin cambios, no se tocó markup), typecheck/lint limpios. Detalle en
`docs/ai/PROPERTY_UX_DECISIONS.md` ("Eyebrow de tipo en overlay: texto blanco/off-white + acento
lineal dorado García para garantizar contraste sobre fotografía variable").

**2026-09-02 · Producto/UX (título overlay: reveal en hover/focus en Home, siempre visible en
catálogo)** · Prueba visual del 2026-09-01 (título oculto en reposo, aparece en hover/focus)
generaba cards casi indistinguibles en el catálogo cuando varias propiedades comparten título y
ubicación (ej. Oficinas de un mismo desarrollo) — confirmado real, no hipotético, en el inventario
actual. Se dividió `variant` en `'overlay-home'` (mantiene el reveal-en-hover tal cual, sin
cambios) y `'overlay-catalog'` (nuevo: título SIEMPRE visible, 1 línea en reposo en desktop, hasta
2 en hover/focus, siempre hasta 2 líneas en mobile) — mismo `PropertyCard`, mismo CSS base, la
diferencia se acota a una clase extra sobre el `<h3>`. Implementando esto se encontraron y
corrigieron 3 bugs reales de CSS (confirmados con `getComputedStyle`, no solo visualmente):
`-webkit-line-clamp` ignorando `max-height` cuando conviven (el catálogo saca el line-clamp y usa
solo `max-height`+`overflow:hidden`); una regla vieja de la card default
(`.twoclics-catalog-section .twoclics-card h3 { min-height: 2.45em }`) ganándole por especificidad
a la regla nueva del catálogo (corregido igualando especificidad + `min-height: 0` explícito, en
desktop y en el override de mobile); y `flex-shrink: 1` por default comprimiendo el título
silenciosamente en vez de dejarlo crecer dentro de la zona de info de altura fija (corregido con
`flex-shrink: 0` en los hijos de `.twoclics-card-overlay-info`, compartido Home+catálogo). No se
intenta diferenciar Oficinas con título/ubicación idéntica desde frontend — la diferenciación
sigue viniendo de precio/superficie/ambientes/baños/cocheras, la calidad de títulos del CRM se
revisa aparte · Motivo: pedido explícito tras feedback de que el título oculto por defecto era un
retroceso de usabilidad real en el catálogo (no en Home, donde solo hay 3 destacadas) · Estado:
vigente. Verificado a 1920×800 y 390×844 en Home y catálogo: Casa Miami, Casa Benavídez, Terreno
Delta, varias Oficinas seguidas, Departamentos con títulos largos (2 líneas en hover sin
comprimirse). 212 tests (211 previos + 1 nuevo), typecheck/lint limpios, e2e de salud sobre build
de producción sin errores de consola. Detalle en `docs/ai/PROPERTY_UX_DECISIONS.md` ("Título:
reveal en hover/focus en Home, siempre visible en catálogo").

**2026-09-03 · Producto/UX (título overlay: unificado Home = catálogo)** · Pedido explícito de
que Home use el mismo comportamiento de título que el catálogo (siempre visible, 1 línea en
reposo en desktop, expande a 2 en hover/focus, siempre hasta 2 líneas en mobile) en vez del
reveal-en-hover que tenía desde el 2026-09-01. Se fusionó el CSS de `overlay-catalog` en la regla
base `.twoclics-card--overlay .twoclics-card-overlay-info h3` y se eliminó el modifier class
`twoclics-card--overlay-catalog`, que quedó redundante. `overlay-home` y `overlay-catalog` (los
dos valores de `variant` en `PropertyCard.tsx`) ahora renderizan **markup byte-idéntico** —
verificado con un test que compara `homeHtml === catalogHtml` directamente. Se mantuvieron ambos
nombres de `variant` (en vez de colapsarlos a uno) porque siguen documentando la intención en cada
call site sin costo real. No se tocó imagen/scrim/badges/ubicación/precio/facts/CTA/tipo/links/
ficha individual · Motivo: pedido explícito, "una card de Home y una del catálogo tienen que ser
esencialmente la misma card" · Estado: vigente. Verificado a 1920×800 y 390×844 en Home (reposo,
hover, focus por teclado, títulos cortos y largos). 212 tests (mismo total — se reescribió el test
que ya cubría la diferencia entre variantes para cubrir ahora la igualdad), typecheck/lint
limpios. Detalle en `docs/ai/PROPERTY_UX_DECISIONS.md` ("Título: mismo comportamiento en Home y
catálogo").
