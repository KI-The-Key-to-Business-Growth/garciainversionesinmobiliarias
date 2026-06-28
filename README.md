# García Inversiones Inmobiliarias

Sitio web de García Inversiones Inmobiliarias: landing institucional + formularios
de contacto y newsletter, integrado con un CRM externo (2Clics), email transaccional
(Resend) y base de datos (Supabase). Construido con **Next.js 15 (App Router)** y
**TypeScript**, desplegado en **Vercel**.

> Migrado desde un monolito Vanilla JS + Express (`legacy/server.js`), que se conserva
> como referencia hasta cerrar la última fase de validación.

---

## 🧱 Stack tecnológico

| Capa          | Tecnología                                                 |
| ------------- | ---------------------------------------------------------- |
| Framework     | Next.js 15 (App Router) + React 19                         |
| Lenguaje      | TypeScript (strict)                                        |
| Base de datos | Supabase (PostgreSQL, acceso vía service role server-side) |
| Email         | Resend                                                     |
| CRM           | 2Clics (webhook + envío de leads)                          |
| Rate limiting | Upstash Redis (con fallback en memoria)                    |
| Anti-spam     | Cloudflare Turnstile + honeypot + filtros                  |
| Monitoreo     | Sentry                                                     |
| Tests         | Vitest (unit/integración) + Playwright (E2E)               |
| Deploy        | Vercel                                                     |

---

## 🚀 Correr en local

Requisitos: **Node 20.x** y npm.

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno a partir del ejemplo
cp .env.example .env
#    …y completar los valores reales (ver tabla de variables más abajo)

# 3. Levantar el servidor de desarrollo
npm run dev
```

El sitio queda disponible en `http://localhost:3000`.

> Sin Supabase configurado, el data layer cae a un fallback JSON local
> (`data/properties.json`). Sin `TURNSTILE_SECRET_KEY`, la validación de Turnstile
> se saltea (modo dev).

---

## 🔑 Variables de entorno

Definidas en `.env` (nunca commitear). Ver `.env.example` para la plantilla completa.
**Ningún valor real va en el repositorio.**

| Variable                         | Descripción                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `PUBLIC_BASE_URL`                | URL pública del sitio (sin barra final)                                  |
| `CRM_HASH`                       | Hash de autorización del webhook 2Clics                                  |
| `CRM_AGENT_ID`                   | ID del agente para envío de leads al CRM                                 |
| `CRM_MESSAGE_URL`                | Endpoint de mensajes del CRM 2Clics                                      |
| `RESEND_API_KEY`                 | API key de Resend (email transaccional)                                  |
| `CONTACT_TO_EMAIL`               | Email donde llegan las consultas (obligatorio para los formularios)      |
| `CONTACT_FROM_EMAIL`             | Remitente (dominio verificado en Resend)                                 |
| `SUPABASE_URL`                   | URL del proyecto Supabase                                                |
| `SUPABASE_SERVICE_ROLE_KEY`      | Service role key — **solo server-side, nunca exponer**                   |
| `UPSTASH_REDIS_REST_URL`         | Endpoint REST de Upstash Redis (rate limit). Vacío = fallback en memoria |
| `UPSTASH_REDIS_REST_TOKEN`       | Token REST de Upstash Redis                                              |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key pública de Turnstile (se expone al cliente)                     |
| `TURNSTILE_SECRET_KEY`           | Secret key de Turnstile — solo server-side                               |
| `SENTRY_DSN`                     | DSN de Sentry. Vacío = monitoreo inactivo (no-op)                        |
| `PROPERTIES_ENABLED`             | Feature flag del listado público de propiedades (`true`/`false`)         |

Métricas/publicidad opcionales (`GTM_CONTAINER_ID`, `GA4_MEASUREMENT_ID`,
`GOOGLE_ADS_CONVERSION_ID`, `META_PIXEL_ID`, etc.) están documentadas en `.env.example`.

---

## 📜 Comandos disponibles

| Comando                | Qué hace                                |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Servidor de desarrollo (hot reload)     |
| `npm run build`        | Build de producción                     |
| `npm start`            | Sirve el build de producción            |
| `npm run lint`         | Linter (ESLint) sobre todo el proyecto  |
| `npm run format`       | Formatea el código con Prettier         |
| `npm run format:check` | Verifica formato sin modificar archivos |
| `npm test`             | Tests unitarios/integración (Vitest)    |
| `npm run test:watch`   | Vitest en modo watch                    |
| `npm run test:e2e`     | Tests E2E (Playwright)                  |

---

## 🗂️ Estructura del proyecto

```
app/            Rutas (App Router): páginas, layouts, route handlers (/api)
actions/        Server Actions (contacto, newsletter)
components/     UI — forms/ · layout/ · sections/
lib/            Lógica de negocio — crm/ · db/ · security/ · properties/
data/           Fallback JSON local de propiedades
tests/          Tests unitarios/integración (Vitest)
e2e/            Tests E2E (Playwright)
legacy/         Monolito Express original (referencia, no desplegado)
supabase-schema.sql   Schema + RLS de la base
```

---

## ☁️ Despliegue (Vercel)

- **Framework Preset:** Next.js (zero-config; no se usa `vercel.json`).
- **Branch de producción:** `main` → cada push dispara un deploy de producción.
- **Variables de entorno:** cargarlas en Vercel → Project Settings → Environment
  Variables. Las claves sensibles (service role, tokens) conviene marcarlas como
  _Sensitive_.
- **Dominio canónico:** `www.garciainversionesinmobiliarias.com.ar` (el apex redirige
  a `www`).
- Las variables nuevas aplican solo a deploys creados **después** de cargarlas.

---

## 🛡️ Calidad y seguridad

El estado de buenas prácticas (RLS, CSP, rate limiting, tests, etc.) está documentado
en [`ROADMAP_CALIDAD.md`](./ROADMAP_CALIDAD.md).
