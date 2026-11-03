# Spec Driven Development (SDD)

> Flujo estilo Kiro: requirements → design → tasks → code.
> El código no se escribe hasta que un integrante del equipo aprueba el spec.

## Estructura

Cada feature con `"sdd": true` tiene una carpeta en cuanto deja `pending`:

```
specs/<name>/
├── requirements.md   # QUÉ (EARS), derivado de los criterios de aceptación CA<n>
├── design.md         # CÓMO (decisiones técnicas, arquitectura y UI Mobile First + Desktop)
└── tasks.md          # PASOS (checklist con [ ] / [x])
```

`<name>` coincide con el campo `name` de `feature_list.json`. Plantillas en `specs/_template/`.

## Estados

| Estado | Significado |
|---|---|
| `pending` | Sin spec aprobado. Actúa primero el `spec_author`. |
| `spec_ready` | Spec escrito. Esperando aprobación humana. **No se toca código.** |
| `in_progress` | Spec aprobado. Trabaja el `implementer`. |
| `done` | Pruebas en verde, reviewer APPROVED, sesión cerrada. |
| `blocked` | Atascado. Razón en `progress/current.md`. |

## La puerta de aprobación humana

El flujo automático se detiene **una vez**: cuando el spec está listo. Un integrante del
equipo lee los tres archivos y:

- dice **«aprobado»** → el leader registra en `progress/current.md`
  `Aprobado por <nombre> el <fecha>` y pasa a `in_progress`; o
- pide cambios → el `spec_author` corrige y la feature sigue en `spec_ready`.

Qué mirar al aprobar: ¿cada CA tiene su R? ¿algún R inventa algo fuera de alcance? ¿el
diseño respeta la arquitectura en capas, el enfoque Mobile First + Desktop y la privacidad?
¿las tareas son chicas y verificables?

## requirements.md — EARS estricto (en español)

| Patrón | Plantilla |
|---|---|
| Ubicuo | `El sistema DEBE <acción>.` |
| Evento | `CUANDO <disparador>, el sistema DEBE <acción>.` |
| Estado | `MIENTRAS <estado>, el sistema DEBE <acción>.` |
| Opcional | `DONDE <característica opcional>, el sistema DEBE <acción>.` |
| No deseado | `SI <evento no deseado> ENTONCES el sistema DEBE <acción>.` |

Reglas duras:

- Ids estables `## R1`, `## R2`, ... (el verificador busca exactamente `## R<n>`).
- Cada requisito es verificable por al menos una prueba concreta.
- Un solo `DEBE` / `NO DEBE` por requisito. Si hay dos, se parte.
- Sin verbos blandos ("podría", "puede", "soporta").
- Al final, tabla de trazabilidad **CA → R**: todo CA de `feature_list.json` cubierto.
- Las métricas de la Etapa 3 que dependen de la feature se escriben como requisito
  (por ejemplo, exhaustividad ≥ 0,85 para H9).

## design.md — decisiones técnicas

Antes de tocar código, documentar:

- Archivos que se crean y se modifican en `src/` y `test/` (por capa).
- Firmas nuevas en JavaScript: clases, funciones, componentes/pantallas React Native.
- Comportamiento **Mobile First** y adaptación responsiva para **Desktop** (cuando la feature tenga UI).
- Cambios de esquema en `expo-sqlite` y número de migración.
- Excepciones nuevas o reutilizadas.
- Impacto en privacidad (si toca datos o la IA).
- **Al menos una alternativa descartada** y por qué.
- Riesgos y casos borde.

## tasks.md — checklist ejecutable

Pasos discretos, en orden, cada uno con su casilla y los requisitos que cubre:

```markdown
- [ ] T1 — Crear `RecurrenceDetector` en `src/domain/services/recurrenceDetector.js`. Cubre: R1, R2, R3.
- [ ] T2 — Pruebas `[H9-R1]`..`[H9-R3]` en `test/domain/services/recurrenceDetector.test.js`.
```

El implementer marca `[x]` al completar cada tarea. El reviewer rechaza si queda alguna
`[ ]` sin justificación en `progress/impl_<name>.md`.

## Trazabilidad (regla dura)

- Cada prueba nueva se mapea a un `R<n>` mediante la etiqueta `[H<id>-R<n>]`.
- Cada `R<n>` tiene al menos una prueba.
- `node tool/harness_check.mjs` falla si una feature `done` tiene un requisito sin prueba.
- El implementer documenta el mapa en `progress/impl_<name>.md` y actualiza
  `progress/traceability.md`.

## Alcance SDD en el proyecto

Todas las historias `H1`..`H12` tienen `"sdd": true` y pasan por el ciclo completo de SDD.
