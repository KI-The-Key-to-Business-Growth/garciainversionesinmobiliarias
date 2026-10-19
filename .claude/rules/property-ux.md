# Property UX — reglas operativas

Detalle completo y razones de cada decisión en `docs/ai/PROPERTY_UX_DECISIONS.md`. Esto es el
resumen accionable: **estos bloques están aprobados y no se tocan sin pedido explícito.**

## Home

- Orden (pre-launch V2): Hero → Oportunidades seleccionadas → Trayectoria → Newsletter → Footer.
- Oportunidades seleccionadas = curaduría manual de García (`HOME_SELECTED_OPPORTUNITIES` en
  `lib/home-selection.ts`), NO los DESTACADO de 2Clics. Orden: Domus → Benavídez → 445; no inventar
  una cuarta.
- Hero: "Real estate con visión estratégica." CTA "Hablar con un asesor" → `/contacto`.

## Catálogo `/propiedades`

- Hero centrado, H1 dorado "Propiedades seleccionadas", sin eyebrow "PROPIEDADES".
- Orden de resultados: `DESTACADO` antes que `SIMPLE` (`PUBLIC_CATALOG_WEB_LISTINGS` en `lib/2clics/listings.ts`).
- Cards: línea superior muestra SOLO el tipo (CASA/DEPARTAMENTO/OFICINA/TERRENO·LOTE), nunca la
  ubicación pegada al tipo. Ubicación va aparte, debajo del título.

## Ficha `/propiedades/[id]`

- Sin Header institucional (sin logo, nav global, hamburguesa, teléfono global).
- Hero propio: "← Volver a propiedades" (izquierda) · eyebrow operación+tipo · H1 centrado ·
  ubicación · botón Compartir (derecha). Sin precio en el hero.
- Galería con lightbox, `object-fit: contain`, sin recortar aspect ratio original.
- Modal "Consultar esta propiedad": queda en la misma ficha (portal a `document.body`), nunca redirige al Home.
- Tarjeta de asesoramiento desktop: teléfono + ícono en la misma línea, sin WhatsApp adentro
  (WhatsApp es flotante global).
- Mobile: sin Header global; orden Volver → eyebrow → título → ubicación → galería → thumbnails →
  acciones (Compartir/Solicitar asesoramiento/Llamar) → franja esencial → contenido.
- Franja de datos esenciales (precio, ambientes, dormitorios, baños, cocheras, superficie total):
  no se repite más abajo en la ficha.

## Orden de contenido de la ficha (ya implementado — `PropertyDetailView.tsx`)

Descripción → Información básica + Superficies → Amenities y servicios → Información adicional
(si aporta valor) → Video (si hay URL usable) → Mapa → "Otras propiedades que pueden interesarte".

## Ubicación pública

- Formato aprobado: `Barrio · Ciudad · Argentina` / `Miami · Florida · Estados Unidos`.
- No mostrar el `state` crudo de 2Clics (ej. "Bs.As. G.B.A. Norte") en la presentación pública.
- No reintroducir el bug de encoding `Â·`.
