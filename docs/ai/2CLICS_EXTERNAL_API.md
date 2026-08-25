# 2Clics External API — referencia técnica

OpenAPI 3.x, versión 1.0.0. Última verificación contra código real: 2026-08-21.
**Este archivo nunca debe contener un valor real de API key.**

## Host

- Vigente: `https://api.ext.2clics.com.ar` (`TWOCLICS_API_BASE_URL`, default en `lib/env.ts`).
- El host anterior `https://api.2clics.com.ar` responde distinto y corresponde a otro contexto —
  no usarlo para lectura de inventario. (Sí sigue en uso hoy para el envío de leads del formulario
  de contacto general, un flujo legacy separado — ver `LEGACY.md`.)

## Autenticación (conceptual, sin secreto)

- Variable: `TWOCLICS_API_KEY` (server-only, se completa en `.env.local`, nunca en este repo).
- Se guarda **sin** prefijo regional.
- `lib/2clics/config.ts` arma en memoria el valor efectivo del header `api_key` como
  `<TWOCLICS_API_REGION_PREFIX>-<TWOCLICS_API_KEY>` (default de prefijo: `AR`).
- Esta combinación fue probada contra la API real y devuelve inventario de Argentina y de Miami
  por igual — el prefijo autentica la cuenta/región de API, no limita el inventario devuelto.
- Overrides opcionales `TWOCLICS_AR_API_KEY` / `TWOCLICS_US_API_KEY`: existen en el código, están
  vacíos hoy, no se usan. No activarlos sin evidencia de que 2Clics entrega claves separadas.

## Endpoints usados por la web (`lib/2clics/client.ts`)

| Endpoint | Método | Uso |
|---|---|---|
| `/api/health` | GET | healthcheck |
| `/api/property-type` | GET | tipos de propiedad para filtros |
| `/api/amenity` | GET | catálogo de amenities |
| `/api/property` | POST | listado/búsqueda de propiedades (catálogo, destacadas, relacionadas) |
| `/api/property/{id}` | GET | ficha de una propiedad |
| `/api/development` | POST | listado de desarrollos |
| `/api/development/{id}` | GET | ficha de un desarrollo |
| `/api/location/states` | POST | filtro de ubicación |
| `/api/location/cities` | POST | filtro de ubicación |
| `/api/location/neighborhoods` | POST | filtro de ubicación |
| `/api/location/search/{q}` | GET | búsqueda de ubicación |
| `/api/network/{id}` | GET | red/agencia |
| `/api/lead/message` | POST | envío de lead — consulta específica de una propiedad |

**Prohibido:** `POST /api/property/create` — no es parte del flujo público, no usar.
La web es consumidora **read-only** de inventario; los leads son la única escritura prevista.

## Inventario auditado (snapshot 2026-08-21 — no es dato en vivo)

- Total: 21 propiedades. Argentina: 11. Estados Unidos: 10.
- Tipos: Departamento 12, Casa 3, Oficina 4, Terreno/Lote 2.
- Operación: VENTA 14, ALQUILER_PERMANENTE 7.
- `webListing`: DESTACADO 3, SIMPLE 18, NONE 0.
- Desarrollos: 0. `developmentParent`: 0/21.
- Imágenes auditadas: 339, con aspect ratios mixtos (portrait/landscape/square) — respetar
  siempre el original (`object-fit: contain`, sin recorte forzado).

### Cobertura de campos (sobre 21 propiedades, snapshot)

`propertyId`, `propertyType.name`, `operationType`, `address`, `title/url`, `state`, `city`,
`price/currency/hidePrice`, `totalArea`: 21/21. `neighborhood`: 16/21. `lat/long`: 20/21.
`amountRoom/amountBedroom/amount_bath/amount_garage/coveredArea`: 19/21. `amenities`: 19/21.
`expenses`: 20/21. `floor`: 13/21. `disposition`: 16/21. `orientation`: 15/21. `video` usable: 7/21.
`tour_url` usable: 0/21 — **no implementar tour todavía**. `uncoveredArea`: 5/21.
`semiCoveredArea`: 0/21 — sin cobertura útil, no inventar el dato.

Estos números son un snapshot de auditoría, no una garantía en vivo. Para el estado real, consultar
la API o `lib/2clics/listings.ts`.

## Ubicaciones — ejemplos reales

- Argentina: `state = "Bs.As. G.B.A. Norte"`, `city = "Tigre"`, `neighborhood` en {Benavídez, Delta,
  Nordelta, ...}. Presentación pública: `Benavídez · Tigre · Argentina`.
- Miami: `state = "Estados Unidos"`, `city = "Florida"`, `neighborhood = "Miami"`. Presentación
  pública: `Miami · Florida · Estados Unidos`.
- 2Clics no entrega un campo `country` directo — se infiere vía `lib/2clics/regions.ts`
  (`classifyTwoclicsMarketFromLocation`) inspeccionando state/city/neighborhood.

## Caching (`lib/2clics/cache.ts`)

- `next: { revalidate: TWOCLICS_REVALIDATE_SECONDS }` (default 300s, piso forzado 30s), `cache: 'force-cache'`.
- No se hace una llamada directa a 2Clics por cada visita de usuario.
- Ante fallo del proveedor, `getPropertyCatalog`/`getPublicPropertyById` devuelven un estado
  explícito (`unconfigured` | `error` | `not-found`) — nunca "0 propiedades" silencioso.

## Reintentos y errores (`lib/2clics/client.ts`)

- Timeout: 8s. Hasta 2 reintentos (3 intentos totales) solo para errores retryables: timeout,
  network error, o HTTP ≥ 500. **No** se reintentan errores 4xx.
- Errores internos (stack, mensajes de 2Clics) no se muestran al público — se logean server-side
  y la UI recibe un mensaje genérico.

## Privacidad — whitelist obligatoria

- `lib/2clics/adapters.ts` construye `PublicProperty`/`PublicDevelopment` (DTOs públicos) —
  cualquier campo nuevo de 2Clics debe agregarse ahí explícitamente antes de poder mostrarse.
- `lib/2clics/metadata.ts` (`parsePublicMetadata`) filtra `meta_data`: allowlist explícita
  (`META_KEY_ALIASES`) + blocklist de fragmentos internos (`private_note`, `partner_note`,
  `info_contact`, `internal`, `admin`, `owner`, `commission`, `confidential`, `password`, `token`,
  `secret`, entre otros).
- Nunca renderizar `meta_data` cruda, ni objetos `agent`/`realEstate` sin pasar por el adapter.

## Filtros server-side confirmados

Ubicación (state/city/neighborhood), operación (venta/alquiler/temporario), tipo de propiedad,
**precio + moneda (Fase 1)**, **dormitorios + ambientes + apto crédito (implementado 2026-08-21,
Fase 2 — ver sección propia más abajo)**. Auditados como soportados por la API pero **no
implementados aún en la UI**: amenities. No agregar filtros nuevos sin autorización.

## `property_type` — requiere el `appId`, NO el `typeId` (CONFIRMADO POR PRUEBA REAL, 2026-08-26)

Bug real encontrado durante una QA integral del buscador (no reportado por la usuaria, pero real y
reproducible) — probado read-only contra la API antes de corregir:

- `POST /api/property` con `filters: { property_type: 2 }` (el `typeId` numérico de "Casa", tal
  como lo devuelve `GET /api/property-type` en el campo `typeId`) responde `HTTP 200` +
  `{"status":"fail"}` — **la misma forma exacta que "0 resultados legítimos"**, aunque existen 3
  propiedades reales con ese `typeId`. Probado también como string `"2"` y como array `[2]`: mismo
  resultado, `fail`.
- `POST /api/property` con `filters: { property_type: "5791" }` (el **`appId`** de "Casa", mismo
  endpoint `/api/property-type`) responde `status: "success"` con las 3 propiedades correctas.
- Confirmado también con `property_type: "5785"` (`appId` de "Departamento") → 12 resultados
  correctos, coincidiendo con el inventario auditado.
- **`property_type` es el único filtro de este tipo (numérico en apariencia) que en realidad espera
  el `appId` (string)** — contrastado explícitamente contra `state`/`city`/`neighborhood`/
  `amount_bedroom`/`amount_room`, que sí aceptan y funcionan correctamente con el id numérico
  (`stateId`/`cityId`/`neighborhoodId`/valor exacto respectivamente, ya confirmados en sus propias
  secciones). No se debe asumir el mismo comportamiento (`appId` vs id numérico) para otros
  filtros sin volver a probar cada uno contra la API real.

**Consecuencia de implementación:** `PropertyListingFilters.propertyTypeId`, `?tipo=` en la URL
pública y `<option value={type.typeId}>` en `PropertyFilters.tsx` siguen usando el `typeId`
numérico sin cambios (mismo contrato de siempre, ninguna URL existente se rompe). La traducción a
`appId` ocurre recién dentro de `getPropertyCatalog` (`resolvePropertyTypeAppId` +
`withResolvedPropertyType`, `lib/2clics/listings.ts`), justo antes de la llamada real a 2Clics —
`catalogPropertyRequest()` (la función pública/testeada) sigue devolviendo `property_type: typeId`
sin tocar, y recién se sustituye por el `appId` correcto al armar el request final. Si no se puede
resolver un `appId` para el `typeId` activo (tipo desconocido/stale), el filtro se omite por
completo en vez de mandar el `typeId` crudo (que la API ignoraría con un `fail` silencioso).

## Opciones de "Tipo de propiedad": derivadas del inventario público, no de `GET /api/property-type` (2026-08-27)

`GET /api/property-type` es el catálogo GENERAL de tipos que maneja la cuenta de 2Clics — puede
incluir tipos sin ninguna propiedad pública publicada (ej. PH si la cuenta lo tiene configurado
pero nunca se publicó una). El selector "Tipo de propiedad" del catálogo (`/propiedades`) ya no usa
este endpoint: `buildAvailablePropertyTypes()` (`lib/2clics/listings.ts`) deriva las opciones del
mismo universo "inventario público completo, sin scoping" que ya alimenta a Ubicación
(`locationFacetRequest()`), reutilizando el `propertyType` completo (`{typeId, name, appId, group}`)
que cada propiedad real ya trae — cero requests adicionales (de hecho, una llamada MENOS que antes,
ya que se eliminó la llamada aparte a `GET /api/property-type`). Un tipo aparece automáticamente en
cuanto tiene al menos una propiedad pública y desaparece automáticamente si deja de tenerla, sin
ningún cambio de código. Verificado en vivo (2026-08-27) contra el inventario real: el selector
devuelve exactamente Casa, Departamento, Oficina y Terreno / Lote — los 4 tipos con inventario
público hoy, en ese orden alfabético por nombre público.

## `meta_data`: `metaKey`/`metaId` vienen INVERTIDOS entre endpoints (CONFIRMADO, 2026-08-26)

Encontrado auditando la cobertura de facts para las cards del catálogo. Cada entrada de
`meta_data` tiene tres campos (`metaKey`, `metaValue`, `metaId`), pero **cuál de los dos primeros
lleva el nombre semántico depende de qué endpoint respondió**:

- **`GET /api/property/{id}`** (detalle, usado por la ficha): `metaKey` = nombre semántico (ej.
  `"amount_bath"`), `metaId` = id numérico interno (ej. `"14052216"`).
- **`POST /api/property`** (listado/catálogo, usado por las cards): exactamente al revés —
  `metaKey` = id numérico (ej. `"14052216"`), `metaId` = nombre semántico (ej. `"amount_bath"`).

Confirmado pidiendo la MISMA propiedad por ambos endpoints y comparando el shape crudo de
`meta_data`. `lib/2clics/metadata.ts` (`parsePublicMetadata`) históricamente solo miraba
`item.metaKey` — correcto para la ficha (por eso siempre funcionó), pero significaba que
`metadata.bathrooms`/`metadata.garages`/`metadata.title`/etc. quedaban **vacíos para cualquier
propiedad que llegara desde el catálogo**, aunque el dato existiera.

**Resuelto en `resolveMetaRawKey`** (`lib/2clics/metadata.ts`): se prueban ambos campos contra la
whitelist/blocklist conocida (señal fuerte); si ninguno matchea una clave conocida (campo
genuinamente nuevo, no soportado todavía), se usa una señal estructural — en ambos endpoints
reales el id interno es siempre puramente numérico y el nombre semántico no, así que se prefiere
el campo no-numérico. Esto generaliza correctamente sin depender de agregar cada campo nuevo a las
listas para que la detección de endpoint funcione. No se documentó este comportamiento en ningún
lado por 2Clics — es un hallazgo empírico, probado read-only antes de tocar código.

## Dormitorios / Ambientes / Apto crédito — semántica CONFIRMADA POR PRUEBA REAL (2026-08-21)

Antes de implementar el filtro (`lib/2clics/listings.ts`) se probó, read-only, contra la API real:
`amount_bedroom`/`amount_room` con los valores 1-4 por separado, `aptCredit` con `true`/`false`,
combinaciones entre ellos y con `operation_type`, y los casos borde `amount_bedroom=0` y
`amount_bedroom=5`.

- **`amount_bedroom` y `amount_room` son match EXACTO, no "N o más".** `amount_bedroom=1` devolvió
  únicamente las propiedades con `amountBedroom === 1` (excluyó las que tienen 2) — confirmado
  contrastando los ids devueltos contra el inventario completo sin filtrar. Mismo resultado para
  `amount_room` (probado 1/2/3, exact match en los tres). Por eso la UI ofrece `Todos | 1 | 2 | 3 |
  4` sin "+": un "3+" fabricado del lado del cliente habría sido una semántica que la API no tiene.
- **`amount_bedroom=0` (o `amount_room=0`) es ignorado en silencio por la API** — devuelve el
  universo completo sin filtrar, no las propiedades con 0 dormitorios/ambientes (ej. Terreno/Lote).
  Por eso "0" nunca es una opción del filtro ni se manda como valor.
- **`amount_bedroom=5` (fuera del rango real del inventario) responde `HTTP 200` +
  `{"status":"fail"}` sin resultados** — mismo comportamiento de "0 resultados legítimos" ya
  documentado para Precio, no un error. Confirma que pedir un valor sin match hoy (ej. Dormitorios
  = 3 o 4, sin cobertura real en el inventario auditado) es una consulta válida, no un bug.
- **`aptCredit` es match EXACTO por boolean.** `aptCredit=true` devolvió exactamente las 2
  propiedades con `aptCredit === true` del inventario auditado; `aptCredit=false` devolvió las 19
  restantes. La UI solo manda `aptCredit=true` cuando el checkbox está marcado — desmarcado no
  manda el campo (no hay control para buscar explícitamente "no apto crédito" en esta fase).
- **Los tres combinan en AND entre sí y con `operation_type`/`property_type`/ubicación** —
  verificado con `amount_bedroom=2 & amount_room=3` (subconjunto correcto), `amount_bedroom=2 &
  aptCredit=true` (0 resultados legítimos, ningún registro real cumple ambos) y `operation_type=
  VENTA & amount_bedroom=2` (excluye correctamente las propiedades en alquiler con 2 dormitorios).
- **La API también acepta arrays** (`amount_bedroom: [1,2]` devolvió la unión de ambos valores),
  pero no se usa: la Fase 2 solo necesita selección de un valor exacto por vez, sin fabricar un
  "N o más" vía OR de varios valores.

Distribución real relevada durante la prueba (21 propiedades, snapshot 2026-08-21):
`amountBedroom` 1 → 15, 2 → 4, 0 (Terreno/Lote) → 2. `amountRoom` 1 → 5, 2 → 10, 3 → 4, 0 → 2.
`aptCredit` true → 2, false → 19. Ninguna propiedad auditada tiene 3 o 4 dormitorios/ambientes hoy
— las opciones 3/4 siguen ofrecidas igual (son consultas legítimas, solo que hoy no matchean nada).

## Precio — comportamiento real confirmado por prueba directa (2026-08-21)

No documentado por 2Clics — confirmado empíricamente contra la API real antes de implementar el
filtro (`lib/2clics/listings.ts`, `resolvePriceFilter`/`priceApiFilters`):

- **`min_price` y `max_price` deben mandarse SIEMPRE JUNTOS.** Enviar uno solo (sin el otro) es
  **ignorado en silencio** por la API — responde `status: success` igual, pero sin filtrar nada.
  Probado en ambas direcciones: `min_price` solo → devuelve todo el universo sin recortar por
  abajo; `max_price` solo → sin recortar por arriba.
- **Sin `currency`, la comparación de precio es puramente numérica** — no distingue monedas. Un
  rango que numéricamente cruza escalas de distintas monedas (ej. alquileres en U$D ~600-1.600 vs.
  en AR$ ~2-2,8 millones) puede devolver resultados de ambas monedas mezclados si no se manda
  `currency` explícito junto con el rango.
- `currency` usa los mismos strings literales que devuelve la API en cada propiedad — confirmado
  con los dos valores reales del inventario: `"U$D"` y `"AR$"` (sin variantes, sin ISO 4217).
- Cuando una consulta no tiene NINGÚN resultado, la API responde `{"status":"fail"}` **sin el
  campo `count`** (en vez de `count: 0`).

**Consecuencia de implementación:** `lib/2clics/listings.ts` nunca arma un request con `min_price`
o `max_price` sueltos — o manda ambos (`currency` incluida siempre) o no manda ninguno de los tres.

## `status: "fail"` en `/api/property` — semántica CONFIRMADA POR PRUEBA REAL (2026-08-21)

La Fase 1 (Precio) detectó que el contador "N resultados" podía desaparecer con rangos angostos.
Antes de tocar nada se probó, read-only, contra la API real, con 6 escenarios deliberadamente
elegidos para separar "0 resultados legítimos" de "error real":

| Escenario | HTTP status | `body.status` | `count`/`properties` | `description` |
|---|---|---|---|---|
| Bucket sin coincidencias (`ALQUILER_PERMANENTE`+`DESTACADO`) | **200** | `fail` | ausentes | ausente |
| `property_type` inexistente (id inventado) | **200** | `fail` | ausentes | ausente |
| Rango de precio sin ninguna coincidencia | **200** | `fail` | ausentes | ausente |
| Con coincidencias (control) | 200 | `success` | presentes, `count` numérico | ausente |
| `operation_type` inválido (fuera del enum) | **400** | `fail` | ausentes | **presente**, describe el error de validación |
| `api_key` inválida | **401** | `fail` | ausentes | **presente** (`"API Key error"`) |

**CONFIRMADO POR PRUEBA REAL:** la única forma que devuelve la API para "consulta válida sin
resultados" es exactamente `HTTP 200` + `{"status":"fail"}` sin `count`, sin `properties`, sin
`description` — probada en tres escenarios independientes con resultado idéntico. Todo error real
probado (validación de filtros, autenticación) llegó con **HTTP 4xx** y **siempre** con
`description`. La HTTP status code es la señal fiable: `lib/2clics/client.ts` ya tira
`TwoclicsApiError` para cualquier `!response.ok` (4xx/5xx) **antes** de que el body llegue a la
lógica de conteo — por lo tanto un body con status:"fail" que sí llega hasta
`propertyResponseCount()` nunca puede ser, en la práctica, uno de los casos de error probados.

**Resuelto en `propertyResponseCount()` (`lib/2clics/listings.ts`):** la forma vacía confirmada
(`status:"fail"`, sin `count`, sin `properties`, sin `description`) se normaliza a `{count: 0,
reliable: true}` — nunca a `unreliable`. Se mantiene el chequeo de `!description` como segunda
barrera defensiva (no una suposición nueva: ningún caso probado combina `status:"fail"` sin
count/properties CON `description`, pero si alguna vez ocurriera, esta guarda evita tratarlo como
cero). Cualquier otra forma no reconocida sigue cayendo en `reliable: false` — nunca se inventa un
número. El manejo de errores HTTP existente (`lib/2clics/client.ts`, reintentos solo en 5xx,
`publicErrorStatus`) no se tocó.

## Periodicidad de alquiler — NO confirmada

`ALQUILER_PERMANENTE` es el **tipo de operación**, no una prueba de periodicidad. Se revisó el
`meta_data` crudo completo de una propiedad real en alquiler (2026-08-21) y **no existe ningún
campo de periodicidad** (`period`, `frequency`, etc.). "Por mes" es una convención de mercado
asumida, no un dato del CRM — **no publicar "/mes", "mensual" ni variantes** en ningún lugar de la
UI sin una fuente de datos explícita que lo respalde.

## Lead específico de propiedad

`actions/property-inquiry.ts` (`submitPropertyInquiry`) → rate limit (`checkRate`, 5 cada 15 min
por IP) → `twoclicsClient.sendLeadMessage(region, input)` → `POST /api/lead/message`. Usa
`property_app_id`; nunca agent/realEstate automático salvo que no haya target explícito (ver
`sendLeadMessage` en `lib/2clics/client.ts`).
