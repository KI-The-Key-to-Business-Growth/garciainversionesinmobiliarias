# 2Clics External API — reglas operativas

Detalle de campos/auditoría en `docs/ai/2CLICS_EXTERNAL_API.md`. Esto es la versión "reglas rápidas".

## Host

- Vigente: `https://api.ext.2clics.com.ar` (`TWOCLICS_API_BASE_URL` en `lib/env.ts`).
- **NO** usar `https://api.2clics.com.ar` para lectura de inventario — es un host distinto.
  (Ese host viejo sí sigue en uso hoy para el flujo legacy de `lib/crm/leads.ts` — ver `docs/ai/LEGACY.md`.)

## Autenticación (sin exponer secretos)

- La credencial vive en `TWOCLICS_API_KEY` (server-only, `.env.local`), guardada **sin** prefijo regional.
- `lib/2clics/config.ts` arma en memoria el header `api_key` con el prefijo `AR-` (`buildTwoclicsRequestApiKey`).
- Nunca imprimir, loguear, commitear ni pegar la key real en ningún archivo de este repo (código o docs).

## Endpoints en uso (`lib/2clics/client.ts`)

`GET /api/health`, `GET /api/property-type`, `GET /api/amenity`, `POST /api/property`,
`GET /api/property/{id}`, `POST /api/development`, `GET /api/development/{id}`,
`POST /api/location/states|cities|neighborhoods`, `GET /api/location/search/{q}`,
`GET /api/network/{id}`, `POST /api/lead/message`.

## Prohibido

- `POST /api/property/create` — no es parte del flujo público. No usar.
- Cualquier escritura de inventario desde la web.
- Enviar la API key al cliente o incluirla en respuestas JSON públicas.

## Caching

- `lib/2clics/cache.ts`: `next.revalidate` con `TWOCLICS_REVALIDATE_SECONDS` (default 300s, piso 30s).
- No convertir cada visita en una llamada obligatoria a 2Clics.
- Ante fallo del proveedor, el catálogo debe devolver estado `unconfigured`/`error` explícito
  (ver `ListingsStatus` en `lib/2clics/listings.ts`) — nunca presentar un outage como "0 propiedades".

## Privacidad — whitelist obligatoria

- Todo dato público pasa por `lib/2clics/adapters.ts` (DTO `PublicProperty`/`PublicDevelopment`) y
  `lib/2clics/metadata.ts` (`parsePublicMetadata`, allowlist `META_KEY_ALIASES` + blocklist
  `INTERNAL_KEY_FRAGMENTS` para `meta_data`).
- Nunca renderizar `meta_data` cruda ni objetos `agent`/`realEstate`/`info_contact` sin pasar por el adapter.
- Si agregás un campo nuevo de 2Clics a la UI, agregalo primero al whitelist del adapter correspondiente.

## Normalizaciones de ubicación pública

- `formatPublicLocation` (`lib/2clics/format.ts`) para AR: `barrio · ciudad · Argentina`.
  Para US: `barrio · ciudad · state`.
- No reintroducir el bug de encoding `Â·` — el separador es `compactText` con `·` real (U+00B7).
- No mostrar `state` crudo de 2Clics (ej. "Bs.As. G.B.A. Norte") en cards; la presentación pública ya
  lo normaliza a "Argentina" / "Estados Unidos" según el mercado.
