# Privacidad y datos personales

> La app trata datos personales de contenido económico, alcanzados por la **Ley 25.326**.
> Verificar vigencia y eventuales reformas a la fecha de la entrega final.

## Principios de diseño

| Obligación | Cómo se cumple | Historia / regla |
|---|---|---|
| Consentimiento informado | Aviso en el primer inicio; sin aceptar no se usa la app | H12, regla 16 |
| Finalidad declarada | El aviso explica para qué se usan los datos | H12 |
| Resguardo de la información | Datos solo en el dispositivo (móvil o escritorio), sin servidor propio | D1, regla 10 |
| Transferencia a terceros declarada | El aviso informa el envío del resumen agregado al proveedor del modelo | H12, H10 |
| Minimización | Al proveedor solo viaja el resumen agregado, sin identificadores | Regla 15 |
| Pérdida del dispositivo | Exportación CSV a pedido del usuario | H11 |
| No asesoramiento profesional | Advertencia visible junto a cada recomendación | Regla 18 |

## Versión del aviso

El texto del aviso tiene una versión (`policy_version`, por ejemplo `2026-10`). Si el texto
cambia de forma sustancial, se incrementa la versión y se vuelve a pedir la aceptación.

## Qué nunca sale del dispositivo

- Notas y subcategorías escritas por el usuario.
- Fechas exactas de gastos individuales.
- Montos individuales identificables de un gasto concreto.
- Cualquier identificador del dispositivo (móvil o desktop), de la cuenta del sistema operativo o de la instalación.

## Secretos del proyecto

- La clave de la API se inyecta mediante variable de entorno (`EXPO_PUBLIC_LLM_API_KEY` en `.env` local no versionado); no se escribe en el código ni en archivos versionados.
- `.env`, `.env.*`, `android/key.properties`, `*.jks` y `*.keystore` están en `.gitignore`. El hook
  `.claude/hooks/protect_secrets.sh` impide que Claude Code los edite.
- Limitación conocida: una clave embebida en un cliente puede extraerse. Para el prototipo
  académico se usa una clave con cuota baja; una versión publicada requeriría un
  intermediario propio (fuera del alcance actual, mediano plazo de la hoja de ruta).
