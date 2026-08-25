# Arquitectura — García Inversiones Inmobiliarias

## Regla de oro

El **código actual** es la fuente de verdad técnica. Si algo en documentación histórica
contradice lo que ves en `app/`, `lib/`, `components/`, confiá en el código y avisá de la
contradicción — no la resuelvas en silencio.

## Diagrama vigente (inventario público)

```
Browser
  → Next.js Server (Server Components / Server Actions, Vercel)
    → lib/2clics/client.ts (TwoclicsClient)
      → https://api.ext.2clics.com.ar  (2Clics External API v1.0.0)
    → lib/2clics/adapters.ts + lib/2clics/metadata.ts (whitelist server-side)
  → UI (components/properties/*)
```

- Páginas: `app/propiedades/page.tsx`, `app/propiedades/[id]/page.tsx`, `app/desarrollos/[id]/page.tsx`, home (`app/page.tsx` vía `FeaturedProperties`).
- Todas importan exclusivamente de `lib/2clics/*`. Ninguna importa `lib/db/properties.ts` ni Supabase.
- La API key nunca llega al navegador (`'server-only'` en `lib/2clics/*` y `lib/env.ts`).

## Rol actual de Supabase

- **NO** es la fuente de verdad del inventario de propiedades/desarrollos.
- **SÍ** sigue vigente para: newsletter (`lib/db/newsletter.ts`), logs (`lib/db/logs.ts`).
- La tabla `properties` de `supabase-schema.sql` y `lib/db/properties.ts` existen y funcionan, pero solo
  los alimenta el webhook legacy — no la UI pública. Ver `docs/ai/LEGACY.md`.
- No crear una segunda base de datos de propiedades ni duplicar el inventario en Supabase salvo
  necesidad futura explícitamente aprobada.

## Coexistencia de legacy

El webhook `/api/2clics/webhook` (+ alias `/property`) sigue registrado y puede seguir recibiendo
llamadas reales de 2Clics. Esto es intencional por ahora — no se desactiva sin verificar antes si
2Clics todavía lo usa en producción. Ver `docs/ai/LEGACY.md` para el detalle componente por componente.

## Inventario vs. leads: no confundir

Son dos preocupaciones distintas con historias distintas:

1. **Lectura del inventario** (propiedades/desarrollos): 100% migrado a la External API nueva.
2. **Escritura de leads**: hoy conviven DOS flujos activos y NO deben tratarse como el mismo sistema:
   - Consulta específica de una propiedad (modal en la ficha) → `POST /api/lead/message` de la External API nueva.
   - Contacto general del Home → `lib/crm/leads.ts` → endpoint CRM legacy (`CRM_MESSAGE_URL`, `CRM_HASH`).
     Sigue activo, puede estar procesando leads reales, **pendiente de revisión arquitectónica** —
     no migrar ni tocar sin pedido explícito.

## Overrides AR/US

`TWOCLICS_AR_API_KEY` / `TWOCLICS_US_API_KEY` existen en `lib/2clics/config.ts` como overrides
opcionales por mercado, pero están vacíos en la configuración vigente. Hoy se usa una única
`TWOCLICS_API_KEY` con el prefijo `AR-` generado server-side, que ya devuelve inventario de
Argentina y Miami por igual. No empezar a usar los overrides sin evidencia de que 2Clics entrega
claves realmente distintas por mercado.
