# García Inversiones — Brand Source of Truth

Verificado contra el repo el 2026-10-26. Guía operativa de marca para agentes (Claude, Codex y otros). No es un manual creativo.

## Authority

- **El código vigente manda** sobre los valores implementados (`app/globals.css`, `app/layout.tsx`).
- **Los assets versionados mandan** sobre los archivos visuales (`public/`).
- Este archivo resume y apunta; no redefine nada. Si contradice al código, gana el código y se corrige este archivo.
- Los materiales externos o históricos **no son autoridad** salvo validación explícita (ver "Historical / Unverified").

## Current Identity

### Colors

Definidos en `:root` de `app/globals.css`.

| Token | Valor | Uso verificado | Evidencia |
|---|---|---|---|
| `--navy` | `#0c2948` | Color principal: fondos oscuros (ej. `.market-card`), texto del botón primario | `globals.css` `:root`; `.btn-primary`; `.market-card` |
| `--gold` | `#cda04f` | Acento: botón primario (fondo), `.eyebrow`, números y íconos destacados | `.btn-primary`; `.eyebrow`; `.why-stat-number`; `.service-icon` |
| `--ivory` | `#f2ede4` | Fondo de página | `body { background: var(--ivory) }` |
| `--muted` | `#7793ab` | Definido; un solo uso directo en el CSS actual | `globals.css` `:root` |

Otros tokens de apoyo, también en `:root`: `--deep #0a223c` (sin usos directos hoy), `--steel #325675`, `--text #18304a`, `--text-soft #5f7285`, `--white #ffffff`. Para usar un color, referenciar el token; no copiar el hex en componentes nuevos.

### Typography

Cargadas con `next/font/google` (self-hosted) en `app/layout.tsx`; la CSP solo permite `font-src 'self'` (`lib/security/csp.ts`). No se cargan desde `<link>` de Google Fonts.

| Fuente | Rol | Detalle verificado |
|---|---|---|
| **Jost** | Texto e interfaz | Pesos 300–600; `body`, botones, `.eyebrow` (11px, `letter-spacing: 4px`, mayúsculas, dorado) |
| **Cormorant Garamond** | Títulos y editorial | Pesos 300–600 + itálica; `.section-title`, `.hero-title`, títulos h1/h2/h3 de varias secciones, cifras destacadas |

Variables CSS: `--font-jost`, `--font-cormorant`.

### Logos

Ubicación canónica: `public/assets/logos/`. No duplicar archivos. Usos actuales en código:

- Header: `Garcia-simple.svg`.
- Footer y JSON-LD de organización: `Garcia.svg`.
- Ícono del sitio y de Apple: `isotipo.png` (`app/layout.tsx`).

Foto de Fabiana García: `public/assets/FabianaGarcia.webp` (usada en `components/sections/About.tsx`).

### Visual Principles

Solo lo que ya está implementado o decidido:

- Paleta navy / dorado / marfil, con el dorado como único acento.
- Botones con `border-radius: 24px` (`.btn`); botón primario dorado con texto navy.
- Eyebrows en Jost, mayúsculas, espaciado amplio y dorado.
- Títulos en Cormorant Garamond sobre texto en Jost.
- Cards con scrim navy progresivo sobre la foto (ver `PROPERTY_UX_DECISIONS.md`).
- Renders y planos oficiales llevan el rótulo "Imagen ilustrativa" / "Plano ilustrativo" (ver `PROJECT_STATE.md`, HISTORY).

Las decisiones de UX por pantalla viven en `PROPERTY_UX_DECISIONS.md`, no acá.

## Historical / Unverified

Ninguno de estos es autoridad actual y ninguno está en el código:

- **BD Sans / BD Script** (`Documents\GARCIA IIM\Fonts`, archivos fechados 2019, carpeta modificada por última vez el 2026-08-10): sin referencias en el repo. **HISTORICAL / AUTHORITY NOT VERIFIED.** No usar como tipografía vigente.
- **`Documents\GARCIA IIM`** (logos PNG/SVG de marzo de 2026 y otros materiales): material de origen. Ninguno de sus PNG/SVG es idéntico byte a byte a los logos versionados, así que su relación con la identidad actual no está verificada. Contiene además datos de clientes: no se usa como fuente de marca.
- **Memoria de Claude `brand-guide-garcia`** y `legacy/informe_garcia.js`: describen decisiones de una etapa anterior. Los valores de color y tipografía coinciden con el código, pero otros detalles quedaron desactualizados. No son fuente.

## Maintenance

Si cambia la paleta, la tipografía, un logo o el sistema visual: actualizar primero el código y los assets correspondientes, y después este documento. No agregar valores acá que no estén implementados.
