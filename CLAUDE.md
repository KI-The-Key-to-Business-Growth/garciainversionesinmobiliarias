# CLAUDE.md — García Inversiones Inmobiliarias

Índice y contrato operativo para trabajar en este repo. Detalle completo en `.claude/rules/` y `docs/ai/`.

## Qué es esto

Web institucional de García Inversiones Inmobiliarias (consultora boutique de real estate,
Argentina/Buenos Aires + Estados Unidos/Miami). Next.js 15 (App Router) + TypeScript, desplegado en Vercel.

## Arquitectura vigente (fuente de verdad)

```
Browser → Next.js Server → 2Clics External API (https://api.ext.2clics.com.ar) → adapters/DTOs públicos → UI
```

- **Inventario de propiedades y desarrollos**: 2Clics External API, server-side only. Nunca Browser → 2Clics directo.
- **Consulta de una propiedad puntual** (modal en la ficha): Server Action → `POST /api/lead/message` de la misma External API.
- **Supabase**: NO es la fuente del inventario público. Sigue vigente solo para newsletter (`lib/db/newsletter.ts`) y logs.
- **Legacy todavía cableado pero fuera del path de la nueva UI**: webhook `/api/2clics/webhook` (+ alias `/property`) → Supabase como mirror de propiedades. Ver [`docs/ai/LEGACY.md`](docs/ai/LEGACY.md).
- **Formulario de contacto general** (Home): usa un flujo de leads CRM distinto y anterior (`lib/crm/leads.ts`, host `api.2clics.com.ar`). Sigue activo, pendiente de revisión arquitectónica — no tocar sin pedido explícito. Detalle en `docs/ai/LEGACY.md`.

Detalle completo: [`.claude/rules/architecture.md`](.claude/rules/architecture.md), [`docs/ai/ARCHITECTURE.md`](docs/ai/ARCHITECTURE.md).

## Comandos principales

```bash
npm run dev         # servidor de desarrollo
npm run build        # build de producción
npm run typecheck    # tsc --noEmit
npm run lint          # ESLint
npm test              # Vitest (unit/integración)
npm run test:e2e      # Playwright
```

## Reglas esenciales de seguridad

- `TWOCLICS_API_KEY` y demás credenciales: solo server-side (`lib/env.ts`, `import 'server-only'`). Nunca `NEXT_PUBLIC_`, nunca en Client Components, nunca loguearlas ni commitearlas.
- No usar `/api/property/create` (endpoint de escritura de 2Clics, fuera del flujo público).
- No exponer metadata cruda (`meta_data`, `info_contact`, notas internas) — pasar siempre por los adapters de `lib/2clics/`.
- Detalle: [`.claude/rules/security.md`](.claude/rules/security.md).

## Prohibiciones de flujo de trabajo

- No hacer push sin autorización explícita.
- No `git reset`/`checkout` destructivo sin confirmar antes.
- No borrar, desactivar ni refactorizar código legacy sin pedido explícito (ver `docs/ai/LEGACY.md`).
- No modificar bloques de UX ya aprobados (`docs/ai/PROPERTY_UX_DECISIONS.md`) sin pedido explícito.
- Antes de dar por terminada una tarea: `typecheck`, `lint`, `test`.
- Detalle: [`.claude/rules/workflow.md`](.claude/rules/workflow.md).

## Qué documentación consultar

| Necesito saber... | Archivo |
|---|---|
| Arquitectura general y rol de Supabase | `docs/ai/ARCHITECTURE.md` |
| Estado actual del proyecto (qué está implementado/aprobado/pendiente) | `docs/ai/PROJECT_STATE.md` |
| Endpoints, campos, auth, caching de 2Clics | `docs/ai/2CLICS_EXTERNAL_API.md` |
| Decisiones de UX ya aprobadas (catálogo, fichas, mobile) | `docs/ai/PROPERTY_UX_DECISIONS.md` |
| Qué es legacy y por qué sigue ahí | `docs/ai/LEGACY.md` |
| Historial de decisiones técnicas/UX | `docs/ai/CHANGELOG_AI.md` |
| Reglas temáticas operativas | `.claude/rules/*.md` |
