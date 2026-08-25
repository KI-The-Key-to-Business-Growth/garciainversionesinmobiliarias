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
