# Arquitectura — García Inversiones Inmobiliarias

Última verificación contra código real: 2026-08-21.

## Principio de fuente de verdad

El código actual del repositorio es la fuente de verdad técnica inmediata. Este documento describe
lo que el código efectivamente hace, verificado leyendo imports reales — no lo que documentación
histórica dice que hace.

## Diagrama — inventario público (propiedades y desarrollos)

```
USUARIO / BROWSER
        ↓
NEXT.JS SERVER (Server Components + Server Actions, Vercel)
        ↓
lib/2clics/client.ts (TwoclicsClient)
        ↓
2CLICS EXTERNAL API — https://api.ext.2clics.com.ar
        ↓
lib/2clics/adapters.ts + lib/2clics/metadata.ts  (whitelist server-side → DTOs públicos)
        ↓
UI (components/properties/*, app/propiedades*, app/desarrollos*)
```

**Nunca:** Browser → 2Clics directo. La API key (`TWOCLICS_API_KEY`) vive solo en `lib/env.ts`
(`import 'server-only'`) y nunca se serializa hacia el cliente.

Verificado por imports reales: `app/propiedades/page.tsx`, `app/propiedades/[id]/page.tsx`,
`app/desarrollos/[id]/page.tsx` y todo `components/properties/*` importan exclusivamente de
`lib/2clics/*`. Ninguno importa `lib/db/properties.ts` ni `lib/supabase.ts`.

## Rol de Supabase

Supabase **no es la fuente de verdad del inventario público**. Su uso vigente:

- **Newsletter** (`lib/db/newsletter.ts`) — ACTUAL, en uso.
- **Logs** (`lib/db/logs.ts`) — ACTUAL, en uso.
- **Propiedades** (`lib/db/properties.ts`, tabla `properties` de `supabase-schema.sql`) — solo
  alimentada por el webhook legacy (`lib/crm/handle-webhook.ts`). No la usa la UI pública. Ver `LEGACY.md`.

No se duplica el inventario completo en Supabase. No hay plan de migrar nada de vuelta a Supabase
salvo necesidad futura explícitamente aprobada.

## Dos flujos de leads — no confundir

| Flujo | Trigger | Camino | Estado |
|---|---|---|---|
| Consulta de una propiedad puntual | Modal "Consultar esta propiedad" en la ficha | `actions/property-inquiry.ts` → `lib/2clics/client.ts` → `POST /api/lead/message` en `api.ext.2clics.com.ar` | ACTUAL, arquitectura nueva |
| Contacto general del Home | Formulario de contacto | `actions/contact.ts` → `lib/crm/leads.ts` → `CRM_MESSAGE_URL` (`api.2clics.com.ar`, host viejo) con `CRM_HASH`/`CRM_AGENT_ID` | ACTUAL Y EN USO / PENDIENTE DE REVISIÓN ARQUITECTÓNICA — no migrar sin pedido explícito, puede estar procesando leads reales |

## Webhook legacy (todavía cableado)

```
2Clics → POST /api/2clics/webhook (o alias /property)
       → lib/crm/handle-webhook.ts
       → lib/crm/twoclics.ts (mapeo CRM → formato web)
       → lib/db/properties.ts → Supabase (o data/properties.json de fallback si Supabase no está configurado)
```

Sigue registrado como ruta activa de Next.js. Puede seguir recibiendo llamadas reales de 2Clics.
No se desactiva sin verificar antes, en otra etapa, si 2Clics todavía apunta ahí en producción.

## Overrides de credenciales AR/US

`lib/2clics/config.ts` soporta `TWOCLICS_AR_API_KEY` / `TWOCLICS_US_API_KEY` como overrides
opcionales por mercado (hoy vacíos). La configuración vigente y comprobada usa una única
`TWOCLICS_API_KEY`, con el header `api_key` armado en memoria como `AR-<key>` (ver
`buildTwoclicsRequestApiKey` en `lib/2clics/config.ts`). Esa combinación ya devuelve inventario
de Argentina y Miami por igual — el prefijo `AR-` autentica la cuenta, no filtra por región.

## Clasificación de mercado (AR/US)

`lib/2clics/regions.ts` clasifica cada propiedad/desarrollo en `AR` o `US` inspeccionando
`state`/`city`/`neighborhood` devueltos por 2Clics (busca "miami"/"florida" para US; "buenos
aires"/"tigre"/"caba"/etc. para AR). No depende de qué API key se usó para la llamada.
