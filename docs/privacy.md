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
| Pérdida del dispositivo | Exportación CSV a pedido del usuario desde la pestaña «Gastos»: incluye fecha, monto, categoría, subcategoría y nota de todos los gastos; se genera y entrega en el propio navegador (descarga o hoja de compartir del sistema) sin ninguna llamada de red ni paso por el asistente; el nombre del archivo no incluye datos de la persona y el panel advierte que el archivo incluye notas y subcategorías y no está protegido | H11, D8 |
| No asesoramiento profesional | Advertencia visible junto a cada recomendación | Regla 18 |

## Versión del aviso

El texto del aviso tiene una versión (`policy_version`). Si el texto cambia de forma
sustancial, se incrementa la versión y se vuelve a pedir la aceptación.

- `2026-10`: versión inicial (H12).
- `2026-11` (vigente, H10): la sección de transferencia nombra al proveedor (Groq, modelo
  Llama) y declara que viajan el período, los totales del mes y del mes anterior, el
  **ingreso mensual** y los **nombres de las categorías** (incluidas las propias), además de
  porcentajes, variaciones y recurrencias con su monto típico redondeado. Quien solo aceptó
  la `2026-10` debe aceptar la nueva versión para seguir usando la app.

## Qué nunca sale del dispositivo

- Notas y subcategorías escritas por el usuario.
- Fechas exactas de gastos individuales.
- Montos individuales identificables de un gasto concreto. El `monto_tipico` de una
  recurrencia no lo es: es la mediana de al menos 3 gastos, sin fecha, nota ni id, y se
  redondea a $100.
- Nombres de **personas**: el nombre completo y el usuario de la cuenta local
  (`user_accounts`). Los nombres de categorías sí viajan y el aviso lo declara.
- Cualquier identificador del dispositivo (móvil o desktop), de la cuenta del sistema operativo o de la instalación.

## Secretos del proyecto

- La clave de la API se inyecta mediante variable de entorno (`VITE_LLM_API_KEY` en `.env` local no versionado); no se escribe en el código ni en archivos versionados.
  Al no haber backend, toda variable `VITE_*` queda visible en el bundle del navegador: la clave
  solo se usa en entornos locales o de demostración y con un límite de gasto configurado en el proveedor.
- `.env`, `.env.*`, `android/key.properties`, `*.jks` y `*.keystore` están en `.gitignore`. El hook
  `.claude/hooks/protect_secrets.sh` impide que Claude Code los edite.
- Limitación conocida: una clave embebida en un cliente puede extraerse. Para el prototipo
  académico se usa una clave con cuota baja; una versión publicada requeriría un
  intermediario propio (fuera del alcance actual, mediano plazo de la hoja de ruta).
