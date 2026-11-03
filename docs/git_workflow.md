# Flujo de Git

## Ramas

| Rama | Uso |
|---|---|
| `main` | Siempre compila y pasa `./init.sh`. Solo se fusiona por PR revisado por un integrante. |
| `feature/h<nn>-<slug>` | Una por feature, por ejemplo `feature/h09-deteccion-recurrencias`. |
| `docs/<tema>` | Cambios solo de documentación o arnés. |

## Commits

Prefijo convencional + historia, en español:

```
docs(spec-h9): requisitos, diseño y tareas
feat(h9): detector de recurrencias por reglas
test(h9): pruebas [H9-R1]..[H9-R5] con conjunto etiquetado
chore(arnes): actualizar trazabilidad
```

Un commit por tarea `T<n>` cuando sea razonable. Los agentes pueden **preparar** commits,
pero `git push` y la fusión los hace una persona (regla 25).

## Pull request

Checklist del PR (copiar en la descripción):

- [ ] `./init.sh` en verde.
- [ ] `progress/review_<feature>.md` con APPROVED.
- [ ] `progress/traceability.md` actualizado.
- [ ] Sin secretos ni archivos de firma.
- [ ] Capturas de pantalla si la feature tiene UI.

## Respaldo (riesgo R8)

Repositorio remoto desde el inicio y al menos un push semanal de `main`.
