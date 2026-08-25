# Workflow — reglas operativas

## Git

- Antes de tocar el árbol de trabajo: `git status` y revisar tracked/untracked/ignored.
- No `git reset --hard`, `git checkout --` destructivo, ni `git clean -f` sin confirmar antes con el usuario.
- No borrar ni sobrescribir cambios de otro agente/sesión sin investigar primero qué son.
- No hacer `git push` sin autorización explícita, aunque el usuario haya aprobado un `git commit`.
- No hacer commit salvo pedido explícito (ver reglas generales de la sesión).

## Separar responsabilidades

- Todo lo que sea código: lo hace el desarrollador en VS Code / Claude Code.
- Todo lo que requiera entrar a Vercel, GitHub web, Cloudflare, Google Cloud, Supabase dashboard, DNS,
  o cualquier credencial/dashboard externo: informarlo explícitamente como acción que debe hacer el
  usuario ("LO HACÉS VOS DESDE INTERNET"), nunca asumir que se puede hacer desde acá.

## Antes de dar una tarea por terminada

- `npm run typecheck`
- `npm run lint`
- `npm test`
- Si el cambio es de UI/UX, probarlo en el navegador (no alcanza con que compile).

## Bloques congelados

- No modificar código de UX ya marcado como aprobado en `docs/ai/PROPERTY_UX_DECISIONS.md` sin pedido
  explícito, aunque parezca mejorable.
- Si una tarea pedida parece requerir tocar un bloque congelado, avisar antes de hacerlo.

## Contradicciones

- Si encontrás que la documentación (handoffs anteriores, `docs/`, comentarios en código) contradice
  lo que ves en el código real: informar la contradicción, indicar qué archivo está desactualizado,
  y no resolver la contradicción en silencio ni asumir cuál versión es la correcta sin decirlo.

## Legacy

- No borrar, mover, desactivar ni refactorizar código marcado como legacy en `docs/ai/LEGACY.md` sin
  pedido explícito. Puede seguir recibiendo tráfico real (el webhook de 2Clics, el formulario de
  contacto general).
