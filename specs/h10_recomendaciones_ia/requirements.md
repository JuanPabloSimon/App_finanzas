# Requirements — h10_recomendaciones_ia

> Feature #10 (H10) de `feature_list.json`: recomendaciones con el modelo de lenguaje.
> «Como usuario quiero recibir recomendaciones en lenguaje natural sobre mis gastos.»
> Prioridad alta, 5 puntos, iteración 3. Rama: `feature/h10-recomendaciones-ia`.
>
> Cada requisito está en EARS estricto y se verifica con al menos una prueba con la
> etiqueta `[H10-R<n>]`. Las pruebas no usan red: el modelo se reemplaza por
> `FakeLlmClient` y `fetch` por una función falsa inyectada.
>
> Decisiones del humano (Francisco, 2026-11-15 y Juan Pablo, 2026-11-23) que este spec toma como dadas: proveedor
> **Groq API (modelo `llama-3.3-70b-versatile`)** vía REST con `fetch` nativo y sin SDK (reemplazando a Gemini ante errores 503);
> cupo de **1 consulta diaria al modelo** que solo se descuenta cuando la consulta es exitosa (si falla no descuenta el intento);
> la actualización del aviso de privacidad de H12 (nueva `policy_version`) entra en H10.

## Definiciones

- **Resumen agregado:** objeto JSON del contrato de `docs/llm_assistant.md`, con
  exactamente las claves de primer nivel `periodo`, `moneda`, `total_mes`,
  `total_mes_anterior`, `ingreso_mensual`, `categorias` y `recurrencias`. Cada elemento de
  `categorias` tiene exactamente `nombre`, `total`, `porcentaje` y `variacion_pct`. Cada
  elemento de `recurrencias` tiene exactamente `categoria`, `monto_tipico` y
  `veces_en_60_dias`.
- **Período del resumen (`periodo`):** el mes `YYYY-MM` que la pestaña «Alertas» tiene
  seleccionado al pedir las recomendaciones.
- **Día de la consulta:** la fecha calendario **local** del navegador (`YYYY-MM-DD`) de la fecha
  `today()` en el momento de la solicitud. No se usa UTC ni el período navegado.
- **Pesos enteros:** conversión de centavos a pesos con redondeo al peso más cercano y
  los medios hacia arriba: `Math.floor((cents + 50) / 100)`.
- **Consulta exitosa al modelo:** invocación de `LlmClient.complete(...)` por parte de
  `AdviceService` cuya respuesta supera la validación de R12, R13 y R14. Es lo único que consume cupo diario.
- **Cupo diario:** 1 consulta exitosa al modelo por día de la consulta y por almacenamiento
  local. «Por usuario» se interpreta como **por navegador** (un perfil de navegador sobre el
  mismo origen, que comparte `localStorage`) o, en las pruebas, por base SQLite. La app no
  tiene cuentas en servidor, así que no hay un conteo entre dispositivos.
- **Respuesta válida:** texto del modelo que cumple R12, R13 y R14.
- **Respuesta de reserva:** resultado de `FallbackAdvisor` (R18).
- **Advertencia orientativa:** el texto literal de `docs/llm_assistant.md`: «Estas
  sugerencias son orientativas y se generan automáticamente a partir de tus datos. No
  constituyen asesoramiento financiero profesional.»
- **Largo de un texto:** cantidad de *code points* (`Array.from(texto).length`) después de
  quitar los espacios de los extremos (`trim()`).
- **Nombres** (regla 15): nombres de **personas**, es decir, el nombre completo y el
  usuario de la cuenta local (`user_accounts.full_name`, `user_accounts.username`). Los
  nombres de categorías sí viajan, como define el contrato y declara el aviso (R30).

## R1
CUANDO el usuario solicita recomendaciones, el sistema DEBE entregar al `LlmClient` un
resumen agregado que tenga exactamente las claves definidas en «Resumen agregado», sin
claves adicionales en ningún nivel.

## R2
SI los gastos del período tienen notas, subcategorías, fechas o identificadores de gasto o
de categoría ENTONCES el sistema NO DEBE incluir ninguno de esos valores en el resumen
agregado.

## R3
CUANDO `HttpLlmClient` envía una consulta, el sistema DEBE enviar una única solicitud
`POST` cuyo cuerpo contenga solo las instrucciones versionadas de `src/assistant/prompt.js`,
el resumen agregado serializado y la configuración de generación, sin otros datos del
usuario, del dispositivo ni de la instalación.

## R4
CUANDO el sistema arma el resumen agregado, el sistema DEBE expresar `total_mes`,
`total_mes_anterior`, `ingreso_mensual` y cada `categorias[].total` en pesos enteros.

## R5
SI el período tiene gastos en más de 8 categorías ENTONCES el sistema DEBE incluir en
`categorias` las 8 de mayor gasto, según el orden de `compareCategoryTotals`, y agrupar el
resto en un único elemento llamado «Otros». Si una de esas 8 categorías ya se llama «Otros»,
sin distinguir mayúsculas, el resto se suma a esa categoría. Así, `categorias` nunca tiene
más de 9 elementos y no repite nombres.

## R6
SI una categoría, o el grupo «Otros», no tuvo gasto en el mes anterior al período ENTONCES
el sistema DEBE enviar `variacion_pct` como `null`. En los demás casos, el valor es
`calculateVariationTenths(actual, anterior) / 10`.

## R7
CUANDO el sistema arma `recurrencias`, el sistema DEBE incluir como máximo las 10 primeras
recurrencias visibles, es decir, las no descartadas en H9, en el orden del detector. Cada
`monto_tipico` se redondea al múltiplo de 100 pesos más cercano, con un mínimo de 100.

## R8
CUANDO el resumen agregado se arma con 20 categorías con gasto y 20 recurrencias, todas con
nombres de 40 caracteres e importes de 9 dígitos en pesos, el sistema DEBE producir un JSON
serializado de no más de 6.000 caracteres (aproximación de los 1.500 tokens del contrato).

## R9
MIENTRAS el usuario no toque el botón «Pedir recomendaciones», el sistema NO DEBE invocar
al `LlmClient`.

## R10
CUANDO el `LlmClient` devuelve una respuesta válida, el sistema DEBE mostrar en la pestaña
«Alertas» entre 1 y 3 sugerencias, cada una con su título, su detalle y su categoría.

## R11
CUANDO el sistema muestra sugerencias del modelo o de reserva, el sistema DEBE mostrar
junto a ellas la advertencia orientativa literal.

## R12
CUANDO el texto devuelto por el modelo es un único bloque de código markdown con o sin
etiqueta `json` (` ```json … ``` `), rodeado como mucho por espacios, el sistema DEBE
interpretar como respuesta el JSON que está dentro del bloque.

## R13
SI el texto devuelto por el modelo, después de aplicar R12, no se interpreta como un objeto
JSON con una clave `sugerencias` de tipo arreglo ENTONCES el sistema DEBE mostrar la
respuesta de reserva.

## R14
SI la respuesta incumple alguna de las siguientes condiciones ENTONCES el sistema DEBE
mostrar la respuesta de reserva completa, sin recortar ni corregir sugerencias:
- `sugerencias` tiene entre 1 y 3 elementos;
- cada elemento tiene un `titulo` de 1 a 60 de largo y un `detalle` de 1 a 280 de largo;
- `categoria` coincide, sin distinguir mayúsculas y sin espacios en los extremos, con un
  `nombre` de `categorias`, con una `categoria` de `recurrencias` o con «General».

## R15
SI el `LlmClient` no resuelve la consulta dentro de los 10.000 ms ENTONCES el sistema DEBE
mostrar la respuesta de reserva.

## R16
SI el `LlmClient` rechaza la consulta por un error de red, una respuesta HTTP que no es 2xx
o un cuerpo sin texto en `choices[0].message.content` ENTONCES el sistema DEBE
mostrar la respuesta de reserva.

## R17
CUANDO se cumple el plazo de 10.000 ms de R15, el sistema DEBE abortar el `AbortSignal`
entregado al `LlmClient`.

## R18
CUANDO el sistema genera la respuesta de reserva, el sistema DEBE producir entre 1 y 3
sugerencias con el mismo formato y los mismos límites de R14. Se aplican, en este orden,
las reglas de `design.md`:
1. categoría con mayor `variacion_pct` positiva;
2. primera recurrencia;
3. peso de la primera categoría sobre `ingreso_mensual`.

Si ninguna regla aplica, se produce una sola sugerencia genérica con categoría «General».

## R19
CUANDO el sistema muestra la respuesta de reserva, el sistema DEBE indicar en el panel que
se trata de sugerencias generadas por reglas.

## R20
CUANDO el usuario realiza múltiples consultas sucesivas al asistente en el mismo día o mes,
el sistema DEBE invocar al `LlmClient` en cada solicitud sin aplicar límite de cantidad de
consultas.

## R21
SI una consulta previa falló o fue exitosa ENTONCES el sistema DEBE mantener habilitada la
posibilidad de volver a consultar al `LlmClient` sin bloquear por límite alcanzado.

## R22
CUANDO el `LlmClient` devuelve una respuesta válida que supera R12, R13 y R14, el sistema
DEBE registrar en `advice_requests` una fila con `source = 'model'` y la fecha/hora de la
consulta (`createdAt`), sin registrar `source = 'model'` si la consulta falla por timeout,
error de red/HTTP o respuesta mal formada.

## R23
CUANDO el sistema resuelve con consentimiento vigente una solicitud de recomendaciones
mediante la respuesta de reserva (ya sea sin invocar al `LlmClient` o tras un fallo del
modelo), el sistema DEBE registrar en `advice_requests` una fila con `source = 'fallback'`.

## R24
CUANDO se consulta el repositorio de consultas (`AdviceRequestRepository`), el sistema DEBE
contar solo las filas cuyo día (`countByDate`) o mes (`countByYearMonth`) y `source`
coinciden con los solicitados.

## R25
CUANDO se crea una nueva instancia del repositorio de consultas sobre el mismo
almacenamiento (`localStorage` del navegador bajo `fp_advice_requests`, o la misma base
SQLite migrada a la versión 4), el sistema DEBE conservar las filas registradas antes.

## R26
CUANDO el sistema muestra el panel de recomendaciones y el usuario cambia de período, el
sistema DEBE restablecer el estado del panel a `idle` manteniendo el botón de consulta
disponible sin límite de intentos.

## R27
MIENTRAS una solicitud de recomendaciones está en curso, el sistema NO DEBE iniciar otra
consulta al modelo.

## R28
SI no hay una clave de API configurada (`VITE_LLM_API_KEY` vacía o ausente) ENTONCES el
sistema DEBE mostrar la respuesta de reserva sin invocar a ningún cliente HTTP.

## R29
SI no hay un consentimiento aceptado para la versión vigente del aviso de privacidad
ENTONCES el sistema NO DEBE invocar al `LlmClient`.

## R30
El sistema DEBE informar en la sección de transferencia del aviso de privacidad de la
versión `2026-11` que se envían el ingreso mensual y los nombres de las categorías al
proveedor del modelo de lenguaje (Groq), junto con las demás partes del resumen agregado.

## R31
MIENTRAS el usuario solo tenga aceptada una versión del aviso anterior a `2026-11`, el
sistema NO DEBE dar acceso a la aplicación hasta que acepte la versión vigente.

## R32
SI el período seleccionado no tiene gastos y no hay recurrencias visibles ENTONCES el
sistema NO DEBE invocar al `LlmClient`.

## R33
CUANDO el usuario abre la pestaña «Alertas», el sistema DEBE mostrar el panel de
recomendaciones después del panel de recurrencias de H9. No se agrega a la pestaña
«Resumen» ni se crea una sexta pestaña.

## R34
El sistema DEBE limitar las llamadas de red de la feature al archivo
`src/assistant/httpLlmClient.js`. `SpendingSummaryBuilder`, `FallbackAdvisor`, la
validación de respuestas y `AdviceService` no usan `fetch`, `XMLHttpRequest` ni `axios`.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. La consulta al modelo envía solo un resumen agregado, con totales por categoría y recurrencias, sin notas, nombres ni identificadores del usuario. | R1, R2, R3, R4, R5, R6, R7, R8, R29, R30, R31, R34 |
| CA2. Se muestran entre una y tres sugerencias en lenguaje natural, acompañadas de la advertencia sobre su carácter orientativo. | R10, R11, R33 |
| CA3. Si el servicio no responde en diez segundos o la respuesta no respeta el formato esperado, se muestra la respuesta de reserva basada en reglas. | R12, R13, R14, R15, R16, R17, R18, R19, R28 |
| CA4. Se respeta el límite diario de una consulta exitosa al modelo por usuario (si la consulta falla, no descuenta el intento). | R9, R20, R21, R22, R23, R24, R25, R26, R27, R32 |
| Regla 16 (sin consentimiento no se llama a la API) | R29, R31 |
| Regla 13 (solo `src/assistant/` usa la red) | R34 |
| Regla 18 (advertencia orientativa siempre visible) | R11 |
| Decisión del humano: actualizar el aviso de H12 en H10 | R30, R31 |
| H13 (Resumen sin scroll; 5 pestañas) | R33 |

## Fuera de alcance de esta feature

- Un intermediario (backend) que oculte la clave: queda como mediano plazo
  (`docs/privacy.md`).
- Un consentimiento específico solo para la IA, separado del aviso general.
- Un historial de recomendaciones anteriores: solo se guarda el conteo en `advice_requests`.
- Métricas automáticas de latencia, tasa de reserva o costo. K3 (utilidad) se mide a mano en
  la prueba de usabilidad (`docs/kpis.md`).
- Un conteo del cupo entre dispositivos o navegadores, o resistente a borrar los datos del
  sitio.
- Cambios en la pestaña «Resumen» (H13), en la sección «Diagnóstico y notas de gestión» o
  en `buildAdviceItems`.
- Recomendar productos financieros, inversiones o créditos: lo prohíbe el prompt.
