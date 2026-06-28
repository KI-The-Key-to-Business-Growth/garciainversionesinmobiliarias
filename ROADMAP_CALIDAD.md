# 🛡️ Roadmap de Calidad — Next.js + Supabase + Vercel (2026)

Checklist reutilizable de **17 buenas prácticas profesionales** para proyectos
Next.js (App Router) sobre Supabase y Vercel. Pensado como **plantilla**: copiá
este archivo a un proyecto nuevo y reseteá los estados a ⏳.

**Leyenda:** ✅ resuelto · ⏳ pendiente · ⚠️ parcial / con salvedad

> Estado de la columna "Estado" = situación en **García Inversiones Inmobiliarias**
> al 2026-06-26. Al reusar la plantilla, vaciá esa columna.

---

## 🔒 Seguridad

| #   | Práctica                                                                                                                                | Estado | Evidencia / Nota                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Row Level Security (RLS)** activado en todas las tablas de Supabase                                                                   | ✅     | `supabase-schema.sql:160-163` — RLS on en las 4 tablas, sin políticas abiertas (deny-all para anon/authenticated). _Falta confirmar estado en vivo con query a `pg_class`._ |
| 2   | **Gestión de secretos**: claves en env vars, `.env` fuera de git, `.env.example` documentado                                            | ✅     | `.gitignore` ignora `.env*` (salvo `.env.example`); todas las keys vía `lib/env.ts`.                                                                                        |
| 3   | **Content Security Policy + headers de seguridad** (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | ✅     | `lib/security/csp.ts` + `middleware.ts`. CSP estricto sin `unsafe-eval` en prod.                                                                                            |
| 4   | **Prevención de inyección SQL**: queries parametrizadas / client oficial, sin concatenación de strings                                  | ✅     | Acceso 100% vía `@supabase/supabase-js` (`lib/db/*`), sin SQL crudo concatenado.                                                                                            |
| 5   | **CORS restrictivo**: orígenes permitidos explícitos, no `*`                                                                            | ✅     | Configurado en `middleware.ts`.                                                                                                                                             |
| 6   | **Comparaciones timing-safe** para tokens/hashes (evitar fugas por tiempo)                                                              | ✅     | Validación de hash del CRM y verificación de firmas.                                                                                                                        |
| 7   | **Rate limiting distribuido** (no solo en memoria por-instancia) con política de fallo consciente                                       | ✅     | `lib/security/ratelimit.ts` — Upstash Redis con fail-open documentado.                                                                                                      |
| 8   | **Protección anti-bot**: CAPTCHA + honeypot + filtro de spam                                                                            | ✅     | Turnstile (`lib/security/turnstile.ts`) + honeypot/timing/spam (`lib/security/antibot.ts`).                                                                                 |
| 9   | **Validación y sanitización de input** del usuario (longitudes, formatos, escape HTML)                                                  | ✅     | `lib/security/sanitize.ts` (escapeHtml, validadores, MAX_LENGTHS).                                                                                                          |
| 10  | **Claves privilegiadas aisladas a server-side** (service role nunca en el bundle del cliente)                                           | ✅     | `import 'server-only'` en `lib/supabase.ts` y `lib/db/*`; sin `NEXT_PUBLIC_` en keys sensibles.                                                                             |

## 🧹 Calidad de código

| #   | Práctica                                                                              | Estado | Evidencia / Nota                                                              |
| --- | ------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| 11  | **TypeScript en modo `strict`**                                                       | ✅     | `tsconfig.json` → `"strict": true`, target ES2022.                            |
| 12  | **Linter configurado** (ESLint) corriendo sobre todo el proyecto                      | ✅     | `eslint.config.mjs` + script `npm run lint`.                                  |
| 13  | **Formateador automático** (Prettier/Biome) + `.editorconfig` para estilo consistente | ⏳     | No hay formateador ni `.editorconfig`. Solo ESLint cubre estilo parcialmente. |
| 14  | **Tests unitarios + de integración** sobre la lógica crítica                          | ✅     | 68 tests (Vitest): seguridad, paridad de actions, webhook.                    |
| 15  | **Tests E2E** (flujos reales en navegador)                                            | ✅     | Playwright — `e2e/health-check.spec.ts` (build + carga + consola).            |

## 🚀 DevOps / Operaciones

| #   | Práctica                                                                           | Estado | Evidencia / Nota                                                                                                            |
| --- | ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| 16  | **Monitoreo de errores en producción** (Sentry u equivalente), sin PII             | ✅     | `@sentry/nextjs` integrado (`lib/observability.ts`, `instrumentation.ts`). ⚠️ Inactivo hasta cargar `SENTRY_DSN` en Vercel. |
| 17  | **CI/CD**: pipeline que corre lint + tests + build automáticamente en cada push/PR | ⏳     | No existe `.github/workflows`. Hoy la validación es manual / solo el build de Vercel.                                       |

---

## 📌 Pendientes de este proyecto

- **#13** — Agregar Prettier + `.editorconfig`.
- **#16** — Cargar `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` en Vercel para activar el monitoreo.
- **#17** — Crear GitHub Actions que corra `lint`, `test` y `build` en cada PR.

## 🔄 Cómo reusar esta plantilla

1. Copiá este archivo a la raíz del proyecto nuevo.
2. Vaciá la columna **Estado** (todo a ⏳) y la sección "Pendientes".
3. Andá marcando ✅ a medida que cada práctica queda implementada, con su evidencia.
