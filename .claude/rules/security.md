# Seguridad — reglas operativas

## Secrets

- Todas las credenciales viven en `lib/env.ts` con `import 'server-only'` al tope: `TWOCLICS_API_KEY`,
  `CRM_HASH`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, tokens de Upstash.
- Nunca usar prefijo `NEXT_PUBLIC_` para nada de la lista anterior.
- Nunca pasar una credencial a un Client Component, ni a props serializadas al browser.
- Nunca loguear el valor de una credencial (ni completo ni parcial) en `console.*`.
- Nunca commitear `.env`, `.env.local`, ni pegar un valor real en código, tests o `docs/`.
- No crear credenciales nuevas ni rotar las existentes sin pedido explícito del usuario.
- No modificar `.env.local` — cualquier cambio de variables de entorno lo hace el usuario.

## API externa (2Clics)

- No usar `/api/property/create` ni ningún endpoint de escritura de inventario.
- La única escritura permitida desde la web es el envío de leads: `POST /api/lead/message`
  (consulta de propiedad) o el flujo legacy de `lib/crm/leads.ts` (contacto general, sin migrar todavía).
- No armar `agent`/`realEstate` automáticamente salvo que el código ya lo resuelva así
  (ver `sendLeadMessage` en `lib/2clics/client.ts`).

## Datos públicos

- Nunca exponer `meta_data` cruda, `info_contact`, notas internas (`private_note`, `partner_note`,
  `report_note`) ni objetos `agent`/`realEstate` sin pasar por los adapters whitelist de `lib/2clics/`.
- Cualquier campo nuevo que se quiera mostrar en la UI debe agregarse primero al whitelist del adapter,
  nunca renderizarse "directo" desde la respuesta de la API.

## Al escribir código

- No introducir vulnerabilidades OWASP (injection, XSS, SSRF). Este repo ya tiene sanitizadores
  dedicados: `lib/security/ssrf.ts`, `lib/security/sanitize.ts`, `lib/security/csp.ts` — reusarlos,
  no reinventar.
- Si detectás código inseguro existente, avisar antes de "arreglarlo" de forma silenciosa si el fix
  toca un bloque de UX o de arquitectura marcado como aprobado/congelado.
