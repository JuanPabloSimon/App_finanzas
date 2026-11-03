# Herramientas: Claude Code y Antigravity sobre el mismo repositorio

## Qué lee cada herramienta

| Archivo | Claude Code | Antigravity |
|---|---|---|
| `AGENTS.md` | Sí (importado desde `CLAUDE.md`) | Sí, automáticamente en la raíz |
| `CLAUDE.md` | Sí, automáticamente | No |
| `rules.md` | Sí (importado desde `CLAUDE.md`) | A través de `.agents/rules/00-reglas-duras.md` |
| `.claude/agents/*.md` | Subagentes | Referencia canónica de roles (vía `.antigravity/agents/`) |
| `.claude/commands/*.md` | Comandos `/` | No |
| `.claude/settings.json` | Permisos y hooks | No |
| `.agents/rules/*.md` | No | Reglas (`always_on`, `glob`, `model_decision`) |
| `.agents/workflows/*.md` | No | Comandos `/` |
| `.antigravity/` | No | Guía y prompts de rol (los pega el humano o los invoca un workflow) |

`AGENTS.md`, `rules.md`, `docs/`, `specs/` y `progress/` son **compartidos**: son la
memoria común del proyecto, independiente de la herramienta.

## Claude Code

1. Instalar Claude Code y abrir una terminal en la raíz del repo: `claude`.
2. La primera vez, aceptar la confianza en el proyecto para que se apliquen
   `.claude/settings.json` y sus hooks.
3. Dar permisos de ejecución a los hooks: `chmod +x .claude/hooks/*.sh` (en Windows, los
   hooks corren con Git Bash).
4. Pedir: «implementá la siguiente feature pendiente» o `/siguiente-feature`.

Hooks incluidos:

| Hook | Momento | Efecto |
|---|---|---|
| `protect_secrets.sh` | Antes de editar o escribir | Bloquea `.env`, `key.properties`, `*.jks`, `*.keystore` |
| `post_edit.sh` | Después de editar un `.js` o `.jsx` | Ejecuta `eslint` sobre el archivo; si hay errores, se los devuelve al agente |
| `on_stop.sh` | Al terminar cada respuesta | `./init.sh --rapido` y aviso si algo quedó en rojo |

## Antigravity

Ver `.antigravity/README.md`. En resumen:

1. Abrir la carpeta del repo como workspace.
2. Verificar en *Customizations* que aparecen las reglas de `.agents/rules/` y los
   workflows de `.agents/workflows/`.
3. Políticas recomendadas: revisión de artefactos **«Request review»** y ejecución de
   terminal **con aprobación** salvo `./init.sh`, `./init.ps1`, `npm test` y `npm run lint`.
4. Una conversación por rol: `/redactar-spec` en una, `/implementar-feature` en otra y
   `/revisar-feature` en una tercera (idealmente con un modelo distinto al que implementó).

## Traspaso entre herramientas

Antes de cambiar de herramienta en medio de una feature:

1. Cerrar la sesión con `/cerrar-sesion` (deja `progress/current.md` al día).
2. Anotar en `progress/current.md`: `Herramienta: antigravity` (o `claude-code`).
3. La otra herramienta arranca leyendo `progress/current.md` y continúa desde la tarea
   `T<n>` pendiente en `specs/<name>/tasks.md`.
