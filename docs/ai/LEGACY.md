# Legacy — inventario de componentes históricos

Verificado contra imports reales el 2026-08-21. Nada de esto se borra, mueve, desactiva ni
refactoriza sin pedido explícito del usuario.

| Componente | Función histórica | Estado actual | ¿Lo usa la nueva UI pública? | ¿Se puede borrar? | Acción futura |
|---|---|---|---|---|---|
| `app/api/2clics/webhook/route.ts` | Recibir push de 2Clics con cambios de propiedades | Ruta activa de Next.js, registrada | NO | NO confirmado | Verificar en otra etapa si 2Clics todavía apunta ahí en producción antes de tocarla |
| `app/api/2clics/property/route.ts` | Alias de compatibilidad del webhook (`/property`, legacy `server.js`) | Activa, delega a `handle2ClicsWebhook` | NO | NO confirmado | Igual que el webhook |
| `lib/crm/handle-webhook.ts` | Autoriza (`CRM_HASH`) y procesa el payload del webhook | Funcional, usado por las 2 rutas de arriba | NO (solo alimenta Supabase legacy) | NO | Auditar antes de retirar |
| `lib/crm/twoclics.ts` | Mapeo de payload crudo del CRM → formato `Property` web | Funcional, usado solo por `handle-webhook.ts` | NO | NO | Va junto con el webhook |
| `lib/db/properties.ts` | Persistencia/mirror de propiedades en Supabase + fallback `data/properties.json` | Legacy, todavía conectado al webhook | NO | NO confirmado | Auditar antes de retirar |
| `data/properties.json` | Fallback de propiedades demo si Supabase no está configurado | Presente (77 líneas, datos ficticios) | NO (solo fallback de `lib/db/properties.ts`) | Sí, en principio, pero no urgente | Retirar junto con `lib/db/properties.ts` si se decide desconectar el mirror |
| Tabla `properties` (`supabase-schema.sql`) | Base de datos de propiedades del CRM | Existe, RLS activo, alimentada solo por el webhook | NO | NO confirmado | Auditar antes de retirar |
| `legacy/server.js`, `legacy/informe_garcia.js`, `legacy/vercel.json.bak` | Monolito original Vanilla JS + Express, pre-Next.js | Código de referencia, ya aislado en `legacy/`, no lo ejecuta Next | NO | Ya está aislado, no requiere acción | Mantener como referencia histórica hasta cerrar validación (ver `README.md`) |

## Caso especial: formulario de contacto general — NO es legacy muerto

| Componente | Función | Estado actual | ¿Lo usa la nueva UI? | ¿Se puede borrar? | Acción futura |
|---|---|---|---|---|---|
| `actions/contact.ts` → `lib/crm/leads.ts` | Envío de leads del formulario de contacto general del Home | **ACTUAL / FLUJO CRM ANTERIOR / PENDIENTE DE REVISIÓN ARQUITECTÓNICA** | Sí — es el flujo activo hoy para el contacto general | NO | Definir en otra etapa si migra a `POST /api/lead/message` de la External API nueva |

Este flujo sigue vivo y puede estar procesando leads reales hacia
`CRM_MESSAGE_URL = https://api.2clics.com.ar/api/external/message` con `CRM_HASH`/`CRM_AGENT_ID`.
Es distinto tanto del inventario público (100% migrado) como de la consulta específica de
propiedad (100% migrada a `POST /api/lead/message` de la External API nueva). No se lo trata como
bug ni se lo toca sin pedido explícito — es una decisión arquitectónica pendiente, no un error.

## Documentación histórica

- `ROADMAP_CALIDAD.md` (raíz): describe el estado de calidad/seguridad general del proyecto.
  Tiene una nota de arquitectura agregada (2026-08) aclarando que sus referencias a RLS sobre la
  tabla `properties` de Supabase corresponden al flujo legacy, no al inventario público vigente.
- PDF "Integración CRM 2ClicsApp - Desarrollos Web V0.7": no se encontró dentro del repositorio en
  esta auditoría. Si existe fuera del repo, debe tratarse como documentación histórica del webhook,
  no de la arquitectura de inventario vigente.
