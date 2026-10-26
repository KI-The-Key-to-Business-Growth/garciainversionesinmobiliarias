# García Inversiones Inmobiliarias — punto de entrada (Codex y otros agentes)

Router mínimo: no copia reglas, apunta a las fuentes de verdad. Claude Code usa `CLAUDE.md` (que tiene prioridad sobre este archivo).

## Este proyecto
Web institucional de García Inversiones Inmobiliarias (real estate, Buenos Aires y Miami), Next.js sobre la External API de 2Clics. Repo propio (`.git`), independiente del cerebro global y de otros proyectos.

## Contexto y reglas LOCALES (leer primero)
1. `CLAUDE.md` — contrato operativo, arquitectura vigente, seguridad y prohibiciones. Es la fuente de las reglas locales.
2. `.claude/rules/*.md` — reglas temáticas (arquitectura, seguridad, workflow, 2Clics, UX).
3. `docs/ai/` — documentación del proyecto; la tabla de `CLAUDE.md` indica qué archivo consultar.
4. `CLAUDE.local.md` — notas de esta máquina (no versionado), si existe.

## Cerebro global (carpeta superior)
Si `../AGENTS.md` no existe, ignorar esta sección.
- `../AGENTS.md` y `../.ai/` — perfil, seguridad, protocolos y registros globales.
- Seguridad: `../.ai/core/SECURITY.md` es el piso. Si una regla local es más restrictiva, prevalece la local.
- Capacidades compartidas (video, audio, browser, documentos, transcripción, etc.): `../.ai/registry/CAPABILITIES.md`, solo cuando la tarea lo requiera. No se redefinen ni se copian acá.
- Conocimiento: aplicá `../.ai/protocols/KNOWLEDGE.md`. Lo que se aprenda sobre García (marca, negocio, CRM, web, campañas, datos, decisiones, observaciones, estado) se guarda dentro de García (`docs/ai/`), no en `.ai/`; nada se promueve a global sin ese protocolo.

## Límites
- No heredar nada de Foqus ni de otros proyectos.
- Todo output producido para García (videos, imágenes, PDFs, campañas, análisis) vive dentro de García.
- No duplicar herramientas ni skills globales en este repo salvo necesidad técnica real.
