# Design — <name>

> Decisiones técnicas para <historia>. Apoyado en `docs/architecture.md`,
> `docs/conventions.md` y `docs/data_model.md`. Solo se documentan los puntos donde la
> feature toca una frontera de esas reglas.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| domain | `src/domain/...` | |
| data | `src/data/...` | |
| presentation | `src/features/...` | |
| test | `test/...` | |

## Firmas nuevas

```javascript
// clases, funciones y componentes/pantallas React Native nuevos
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):** ...
- **Desktop (`≥ 768px`):** ...

## Datos (`expo-sqlite`)

- Migración: ninguna / versión <n>: ...

## Errores

- Excepciones reutilizadas: ...
- Excepciones nuevas: ...

## Privacidad

- ¿Toca datos personales o la IA? ...

## Alternativa descartada

**Alternativa A:** ... Se descarta porque ...

## Riesgos y casos borde

- ...
