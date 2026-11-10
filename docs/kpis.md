# Métricas clave (Etapa 3) y cómo se miden en el repositorio

> Definidas en la Etapa 3 del Documento de Proyecto ([`docs/Proyecto_Tec_Laborales_Grupo_3.pdf`](./Proyecto_Tec_Laborales_Grupo_3.pdf)).

| KPI | Fórmula | Meta | Alerta | Artefacto del repo |
|---|---|---|---|---|
| K1 Tiempo medio de carga | Σ tiempos / n cargas | ≤ 15 s | > 20 s | `progress/usabilidad.md` (planilla de la prueba) |
| K2 Identificación de categorías principales | aciertos / usuarios | ≥ 80 % | < 60 % | `progress/usabilidad.md` |
| K3 Utilidad de las recomendaciones | promedio Likert 1-5 | ≥ 4 | < 3,5 | `progress/usabilidad.md` |
| K4 Exhaustividad / precisión de recurrencias | VP/(VP+FN) y VP/(VP+FP) | ≥ 85 % | < 75 % | Prueba `[H9-R4]` y `[H9-R5]` con `test/fixtures/recurrencias_etiquetadas.json` |
| K5 SPI | valor ganado / valor planificado (horas) | ≥ 0,90 | < 0,85 | Reunión semanal; insumo `progress/horas.csv` |
| K6 Cobertura de criterios de aceptación | criterios con prueba / criterios (historias alta) | 100 % | < 90 % | `node tool/harness_check.mjs` y `progress/traceability.md` |
| K7 Usuarios activos mensuales | únicos con sesión en el mes | 3.000 a dic. 2027 | < 1.500 a jun. 2027 | Consola de distribución (posterior al cursado) |
| K8 Retención a 30 días | activos a 30 días / instalaciones | ≥ 10 % | < 5 % | Consola de distribución |
| K9 Conversión a Premium | suscriptores / activos mensuales | ≥ 2 % | < 1 % | Consola de distribución |

## Prueba de usabilidad (K1 a K3)

11 y 12/11/2026 (replanificada en Etapa 3; línea base del 03/11 al 09/11/2026), cinco usuarios del segmento. Plantilla para `progress/usabilidad.md`:

```markdown
| Usuario | Carga 1 (s) | Carga 2 | Carga 3 | Carga 4 | Carga 5 | Promedio | Top 3 correcto (s/n, tiempo) | Utilidad (1-5) | Observaciones |
|---|---|---|---|---|---|---|---|---|---|
| U1 | | | | | | | | | |
```

Medición de carga: desde que se abre la pantalla de nuevo gasto hasta que se confirma.

## Registro de horas (insumo de K5 y del CPI)

Cada integrante agrega una fila por sesión en `progress/horas.csv`:

```
fecha,integrante,actividad,feature,herramienta,horas,nota
2026-10-29,Francisco,A11,H9,claude-code,2.5,spec + aprobación
```

`actividad` usa los códigos A1..A19 del cronograma; `herramienta` es `claude-code`,
`antigravity` o `manual`.
